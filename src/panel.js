import { PANEL_ID, TOGGLE_ID } from './constants.js';
import { getDB, setDB, saveDB, getEntry, normalizeEntry, upsert, removeEntry, loadUIState, saveUIState, deleteGMValue, beginBatch, endBatch } from './db.js';
import { formatTime, isoDateOnly } from './utils.js';
import { getPlaylistsSorted, getPlaylist, createPlaylist, renamePlaylist, recolorPlaylist, deletePlaylist, setPlaylistIcon, reorderPlaylists } from './playlist.js';
import { createButton, makePlaceholderThumb } from './ui-helpers.js';
import { showToast } from './toast.js';
import { showSyncSettings, syncFull, getSyncConfig } from './sync.js';

const panelState = {
  expanded: {},
  selected: new Set(),
  dragId: null,
};

function isExpanded(itemId) { return !!panelState.expanded[itemId]; }
function setExpanded(itemId, value) {
  panelState.expanded[itemId] = !!value;
  persistUIState();
  renderPanel();
}

function persistUIState() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  saveUIState({
    sortMode: panel.querySelector('.kuro-sort')?.value || 'manual',
    sortDir: panel.querySelector('.kuro-sort-dir')?.value || 'desc',
    filter: panel.querySelector('.kuro-pill.active')?.dataset.filter || '',
    wideMode: panel.classList.contains('max'),
    expanded: Object.keys(panelState.expanded).filter(k => panelState.expanded[k]),
  });
}

function restoreUIState(panel) {
  const state = loadUIState();
  if (!state || typeof state !== 'object') return;
  if (state.sortMode) { const el = panel.querySelector('.kuro-sort'); if (el) el.value = state.sortMode; }
  if (state.sortDir) { const el = panel.querySelector('.kuro-sort-dir'); if (el) el.value = state.sortDir; }
  if (state.filter !== undefined) {
    const pills = panel.querySelectorAll('.kuro-pill');
    pills.forEach(p => p.classList.toggle('active', p.dataset.filter === (state.filter || '')));
  }
  if (state.wideMode) panel.classList.add('max');
  if (Array.isArray(state.expanded)) state.expanded.forEach(id => { panelState.expanded[id] = true; });
}

/* ── Sorting & Ordering ──────────────────────────────── */

function getManualOrderedIds() {
  const db = getDB();
  return Object.values(db)
    .filter(item => item.playlists && item.playlists.length > 0)
    .sort((a, b) => (a.manualOrder ?? 999999) - (b.manualOrder ?? 999999))
    .map(x => x.itemId);
}

function renumberManualOrder(ids) {
  const db = getDB();
  ids.forEach((id, idx) => { if (db[id]) db[id].manualOrder = idx; });
  saveDB();
}

function reorderWithinView(viewIds, mutator) {
  const globalIds = getManualOrderedIds();
  const newViewIds = mutator(viewIds);
  if (!newViewIds) return;
  const viewSet = new Set(viewIds);
  const result = [];
  let vi = 0;
  for (const gid of globalIds) {
    if (viewSet.has(gid)) result.push(newViewIds[vi++]);
    else result.push(gid);
  }
  renumberManualOrder(result);
  renderPanel();
}

function moveManualOrder(itemId, direction, viewIds) {
  reorderWithinView(viewIds, (ids) => {
    const idx = ids.indexOf(itemId);
    if (idx < 0) return null;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= ids.length) return null;
    const copy = [...ids];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    return copy;
  });
}

function setManualOrderPosition(itemId, position, viewIds) {
  reorderWithinView(viewIds, (ids) => {
    const idx = ids.indexOf(itemId);
    if (idx < 0) return null;
    let pos = Number(position);
    if (!Number.isFinite(pos)) return null;
    pos = Math.max(1, Math.min(ids.length, Math.floor(pos)));
    const copy = [...ids];
    const [item] = copy.splice(idx, 1);
    copy.splice(pos - 1, 0, item);
    return copy;
  });
}

function handleDragDrop(fromId, toId, viewIds) {
  if (!fromId || !toId || fromId === toId) return;
  reorderWithinView(viewIds, (ids) => {
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return null;
    const copy = [...ids];
    const [item] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, item);
    return copy;
  });
}

function sortItems(items, mode, direction = 'desc') {
  const arr = [...items];
  const factor = direction === 'asc' ? 1 : -1;
  const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || '')) * factor;
  const byDate = (field) => (a, b) => String(a[field] || '').localeCompare(String(b[field] || '')) * factor;
  const byManual = (a, b) => ((a.manualOrder ?? 999999) - (b.manualOrder ?? 999999));
  switch (mode) {
    case 'created': arr.sort(byDate('createdAt')); break;
    case 'title': arr.sort(byTitle); break;
    case 'manual': arr.sort(byManual); break;
    case 'updated': default: arr.sort(byDate('updatedAt')); break;
  }
  return arr;
}

/* ── Import Preview ──────────────────────────────────── */

function showImportPreview(file, refreshUI) {
  file.text().then(text => {
    let imported;
    try { imported = JSON.parse(text); } catch { showToast('匯入失敗：JSON 格式錯誤', 'error'); return; }
    if (!imported || typeof imported !== 'object') { showToast('匯入失敗：資料格式無效', 'error'); return; }

    const db = getDB();
    const importIds = Object.keys(imported);
    const newCount = importIds.filter(id => !db[id]).length;
    const updateCount = importIds.filter(id => db[id]).length;

    const overlay = document.createElement('div');
    overlay.className = 'kuro-import-preview';
    overlay.innerHTML = `
      <div class="kuro-import-preview-content">
        <h3>匯入預覽</h3>
        <div class="kuro-import-stat"><span>檔案項目數</span><strong>${importIds.length} 筆</strong></div>
        <div class="kuro-import-stat"><span>新增項目</span><strong>${newCount} 筆</strong></div>
        <div class="kuro-import-stat"><span>將更新</span><strong>${updateCount} 筆</strong></div>
        <div class="kuro-import-stat"><span>目前項目數</span><strong>${Object.keys(db).length} 筆</strong></div>
        <div class="kuro-import-actions"></div>
      </div>
    `;
    const actions = overlay.querySelector('.kuro-import-actions');
    actions.appendChild(createButton('取消', () => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 200); }));
    actions.appendChild(createButton(`確認匯入 ${importIds.length} 筆`, () => {
      const normalized = {};
      for (const id in imported) {
        normalized[id] = normalizeEntry(id, imported[id]);
      }
      setDB({ ...db, ...normalized });
      saveDB();
      refreshUI();
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
      showToast(`已匯入 ${importIds.length} 筆（新增 ${newCount}，更新 ${updateCount}）`, 'success');
    }));
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('show')); });
  });
}

/* ── Emoji Picker ────────────────────────────────────── */

const EMOJI_GROUPS = [
  { label: '常用', emojis: '👂 ⭐ ❤️ 🔥 💎 ✅ 📌 🎵 🎧 🎤 🎶 🎹 🎸 🎺 🎻 🥁' },
  { label: '心情', emojis: '😍 🥰 😊 🤤 😴 🫠 💕 💗 💖 💘 💝 💜 💙 💚 🧡' },
  { label: '標記', emojis: '🏷️ 📂 📁 📋 📝 📎 🔖 🗂️ 📑 🗃️ 🔗 📍 🚩 🏴 🎯' },
  { label: '評價', emojis: '👍 👎 💯 🏆 🥇 🥈 🥉 👑 🌟 ✨ 💡 🔔 ⚡ 🎀 🎁' },
  { label: '狀態', emojis: '⬇️ 📥 🔄 ⏳ ⏸️ ▶️ ⏭️ 🔁 🔂 🔀 ⏹️ 🚫 ❌ ⭕ ❓' },
  { label: '自然', emojis: '🌸 🌺 🌹 🍀 🌙 ☀️ 🌈 🦋 🐱 🐰 🐻 🦊 🐼 🐶 🐾' },
  { label: '食物', emojis: '🍓 🍑 🍒 🍭 🧁 🍰 🍩 🍪 ☕ 🍵 🧋 🥤 🍷 🍸 🧃' },
  { label: '符號', emojis: '🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚪ ⚫ 🔶 🔷 🔸 🔹 ♠️ ♥️' },
];

function showEmojiPicker(anchorEl, currentEmoji, onSelect) {
  document.querySelectorAll('.kuro-emoji-picker').forEach(el => el.remove());

  const picker = document.createElement('div');
  picker.className = 'kuro-emoji-picker';

  // Header with tabs
  const tabs = document.createElement('div');
  tabs.className = 'kuro-ep-tabs';
  EMOJI_GROUPS.forEach((group, i) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'kuro-ep-tab' + (i === 0 ? ' active' : '');
    tab.textContent = group.label;
    tab.dataset.idx = String(i);
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.kuro-ep-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGrid(i);
    });
    tabs.appendChild(tab);
  });
  picker.appendChild(tabs);

  const grid = document.createElement('div');
  grid.className = 'kuro-ep-grid';
  picker.appendChild(grid);

  function renderGrid(groupIdx) {
    grid.innerHTML = '';
    const emojis = EMOJI_GROUPS[groupIdx].emojis.split(' ').filter(Boolean);
    emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'kuro-ep-emoji' + (emoji === currentEmoji ? ' active' : '');
      btn.textContent = emoji;
      btn.addEventListener('click', () => {
        onSelect(emoji);
        picker.remove();
      });
      grid.appendChild(btn);
    });
  }
  renderGrid(0);

  // Position relative to anchor
  const rect = anchorEl.getBoundingClientRect();
  picker.style.top = `${rect.bottom + 6}px`;
  picker.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 310))}px`;

  document.body.appendChild(picker);

  // Close on outside click
  const closeHandler = (e) => {
    if (!picker.contains(e.target) && e.target !== anchorEl) {
      picker.remove();
      document.removeEventListener('mousedown', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', closeHandler), 0);
}

/* ── Playlist Manager Modal ──────────────────────────── */

function showPlaylistManager(refreshUI) {
  document.querySelector('.kuro-pl-manager')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'kuro-pl-manager';

  let newIcon = '\u{1F3F7}';

  function getItemCount(plId) {
    const db = getDB();
    return Object.values(db).filter(item => item.playlists?.includes(plId)).length;
  }

  function render() {
    const sorted = getPlaylistsSorted();
    overlay.innerHTML = `<div class="kuro-pl-manager-content">
      <div class="kuro-plm-header">
        <h3>管理播放清單</h3>
        <button type="button" class="kuro-close-btn kuro-plm-close" title="關閉">\u2715</button>
      </div>
      <div class="kuro-pl-list"></div>
      <div class="kuro-plm-divider"></div>
      <div class="kuro-plm-add-section">
        <div class="kuro-plm-add-title">建立新的播放清單</div>
        <div class="kuro-plm-add-form">
          <div class="kuro-plm-add-name-row">
            <button type="button" class="kuro-plm-add-icon" title="選擇圖示">${newIcon}</button>
            <input type="text" placeholder="輸入名稱…" class="kuro-pl-new-name">
          </div>
          <div class="kuro-plm-add-options">
            <label class="kuro-plm-color-label" title="選擇顏色">
              <span class="kuro-plm-color-preview" style="background:#9ca3af"></span>
              <input type="color" value="#9ca3af" class="kuro-pl-new-color">
            </label>
            <button type="button" class="kuro-btn kuro-plm-add-btn">建立</button>
          </div>
        </div>
      </div>
    </div>`;

    // Close button
    overlay.querySelector('.kuro-plm-close').addEventListener('click', () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
    });

    // Icon picker for new playlist
    const addIconBtn = overlay.querySelector('.kuro-plm-add-icon');
    addIconBtn.addEventListener('click', () => {
      showEmojiPicker(addIconBtn, newIcon, (emoji) => {
        newIcon = emoji;
        addIconBtn.textContent = emoji;
      });
    });

    // Color preview sync
    const colorPreview = overlay.querySelector('.kuro-plm-color-preview');
    const colorInput = overlay.querySelector('.kuro-pl-new-color');
    colorInput.addEventListener('input', () => { colorPreview.style.background = colorInput.value; });

    // Add button
    overlay.querySelector('.kuro-plm-add-btn').addEventListener('click', () => {
      const nameInput = overlay.querySelector('.kuro-pl-new-name');
      const name = nameInput.value.trim();
      if (!name) { showToast('請輸入名稱', 'error'); return; }
      createPlaylist(name, colorInput.value, newIcon);
      newIcon = '\u{1F3F7}';
      render();
      refreshUI();
      showToast(`已建立播放清單「${name}」`, 'success');
    });
    overlay.querySelector('.kuro-pl-new-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('.kuro-plm-add-btn').click(); }
    });

    // Playlist rows with drag-and-drop reordering
    const list = overlay.querySelector('.kuro-pl-list');
    let dragSrcRow = null;

    sorted.forEach(pl => {
      const count = getItemCount(pl.id);
      const row = document.createElement('div');
      row.className = 'kuro-plm-item';
      row.draggable = true;
      row.dataset.plId = pl.id;

      // Drag handle
      const handle = document.createElement('span');
      handle.className = 'kuro-plm-drag-handle';
      handle.textContent = '\u2630';
      handle.title = '拖曳排序';

      // Drag events
      row.addEventListener('dragstart', (e) => {
        dragSrcRow = row;
        row.classList.add('kuro-plm-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', pl.id);
      });
      row.addEventListener('dragend', () => {
        dragSrcRow = null;
        row.classList.remove('kuro-plm-dragging');
        list.querySelectorAll('.kuro-plm-item').forEach(r => r.classList.remove('kuro-plm-drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcRow && dragSrcRow !== row) {
          row.classList.add('kuro-plm-drag-over');
        }
      });
      row.addEventListener('dragleave', () => {
        row.classList.remove('kuro-plm-drag-over');
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('kuro-plm-drag-over');
        if (!dragSrcRow || dragSrcRow === row) return;

        // Reorder in DOM
        const allRows = [...list.querySelectorAll('.kuro-plm-item')];
        const fromIdx = allRows.indexOf(dragSrcRow);
        const toIdx = allRows.indexOf(row);
        if (fromIdx < toIdx) {
          row.insertAdjacentElement('afterend', dragSrcRow);
        } else {
          row.insertAdjacentElement('beforebegin', dragSrcRow);
        }

        // Save new order
        const newOrder = [...list.querySelectorAll('.kuro-plm-item')].map(r => r.dataset.plId);
        reorderPlaylists(newOrder);
        refreshUI();
      });

      // Color bar
      const colorBar = document.createElement('div');
      colorBar.className = 'kuro-plm-color-bar';
      colorBar.style.background = pl.color;

      // Main info
      const info = document.createElement('div');
      info.className = 'kuro-plm-info';

      const nameRow = document.createElement('div');
      nameRow.className = 'kuro-plm-name-row';

      const icon = document.createElement('span');
      icon.className = 'kuro-plm-icon';
      icon.textContent = pl.icon;
      icon.title = '點擊更換圖示';
      icon.addEventListener('click', () => {
        showEmojiPicker(icon, pl.icon, (emoji) => {
          setPlaylistIcon(pl.id, emoji);
          render();
          refreshUI();
        });
      });

      const name = document.createElement('span');
      name.className = 'kuro-plm-name';
      name.textContent = pl.name;

      const countBadge = document.createElement('span');
      countBadge.className = 'kuro-plm-count';
      countBadge.textContent = `${count} 筆`;

      nameRow.appendChild(icon);
      nameRow.appendChild(name);
      nameRow.appendChild(countBadge);

      info.appendChild(nameRow);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'kuro-plm-actions';

      // Color picker
      const colorLabel = document.createElement('label');
      colorLabel.className = 'kuro-plm-action-btn';
      colorLabel.title = '更換顏色';
      colorLabel.textContent = '\u{1F3A8}';
      const rowColorInput = document.createElement('input');
      rowColorInput.type = 'color';
      rowColorInput.value = pl.color;
      rowColorInput.style.cssText = 'position:absolute;width:0;height:0;opacity:0;pointer-events:none';
      rowColorInput.addEventListener('input', () => {
        recolorPlaylist(pl.id, rowColorInput.value);
        colorBar.style.background = rowColorInput.value;
        refreshUI();
      });
      colorLabel.appendChild(rowColorInput);
      colorLabel.addEventListener('click', () => rowColorInput.click());

      // Rename
      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'kuro-plm-action-btn';
      renameBtn.title = '重新命名';
      renameBtn.textContent = '\u270F\uFE0F';
      renameBtn.addEventListener('click', () => {
        const newName = prompt('新名稱：', pl.name);
        if (newName && newName.trim()) {
          renamePlaylist(pl.id, newName.trim());
          render();
          refreshUI();
        }
      });

      // Delete
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'kuro-plm-action-btn kuro-plm-action-danger';
      delBtn.title = '刪除';
      delBtn.textContent = '\u{1F5D1}\uFE0F';
      delBtn.addEventListener('click', () => {
        if (!confirm(`確定要刪除播放清單「${pl.name}」嗎？\n項目不會被刪除，但會失去此標籤。`)) return;
        const db = getDB();
        beginBatch();
        for (const id in db) {
          const entry = db[id];
          if (entry.playlists && entry.playlists.includes(pl.id)) {
            upsert(id, { ...entry, playlists: entry.playlists.filter(p => p !== pl.id) });
          }
        }
        deletePlaylist(pl.id);
        endBatch();
        render();
        refreshUI();
        showToast(`已刪除播放清單「${pl.name}」`, 'info');
      });

      actions.appendChild(colorLabel);
      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);

      row.appendChild(handle);
      row.appendChild(colorBar);
      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    });

    if (sorted.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'kuro-plm-empty';
      empty.textContent = '還沒有任何播放清單，建立一個吧！';
      list.appendChild(empty);
    }
  }

  render();
  document.body.appendChild(overlay);
  // Close on backdrop click or Escape key
  const closeOverlay = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 200);
    document.removeEventListener('keydown', escHandler);
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  const escHandler = (e) => { if (e.key === 'Escape') closeOverlay(); };
  document.addEventListener('keydown', escHandler);
  requestAnimationFrame(() => { requestAnimationFrame(() => overlay.classList.add('show')); });
}

/* ── Toggle & Panel Creation ─────────────────────────── */

export function updateToggleCount() {
  const toggle = document.getElementById(TOGGLE_ID);
  if (!toggle) return;
  const db = getDB();
  const count = Object.values(db).filter(item => item.playlists && item.playlists.length > 0).length;
  let countEl = toggle.querySelector('.kuro-toggle-count');
  if (count > 0) {
    if (!countEl) { countEl = document.createElement('span'); countEl.className = 'kuro-toggle-count'; toggle.appendChild(countEl); }
    countEl.textContent = count;
  } else if (countEl) {
    countEl.remove();
  }
}

export function ensurePanel(refreshUI) {
  if (!document.getElementById(TOGGLE_ID)) {
    const toggle = document.createElement('button');
    toggle.id = TOGGLE_ID;
    toggle.type = 'button';
    toggle.innerHTML = '\u{1F3B5} 我的清單';
    toggle.addEventListener('click', () => {
      const panel = document.getElementById(PANEL_ID);
      if (panel) {
        const wasHidden = !panel.classList.contains('show');
        panel.classList.toggle('show');
        if (wasHidden) renderPanel();
        persistUIState();
      }
    });
    document.body.appendChild(toggle);
  }

  if (!document.getElementById(PANEL_ID)) {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <header>
        <div>我的清單</div>
        <div class="kuro-row-actions" style="gap:8px">
          <button type="button" class="kuro-btn kuro-toggle-max">\u2922 寬版</button>
          <button type="button" class="kuro-close-btn" title="關閉">\u2715</button>
        </div>
      </header>
      <div class="body">
        <div class="kuro-toolbar">
          <input type="text" placeholder="搜尋標題/備註/RJ…" class="kuro-search">
        </div>
        <div class="kuro-filter-pills"></div>
        <div class="kuro-toolbar-secondary">
          <select class="kuro-sort">
            <option value="manual" selected>自訂排序</option>
            <option value="updated">最近更新</option>
            <option value="created">加入時間</option>
            <option value="title">標題</option>
          </select>
          <select class="kuro-sort-dir">
            <option value="desc">\u2193 倒序</option>
            <option value="asc">\u2191 正序</option>
          </select>
        </div>
        <div class="kuro-summary-bar"></div>
        <details class="kuro-advanced-filters">
          <summary>進階篩選</summary>
          <div class="kuro-filter-grid">
            <label>從 <input type="date" class="kuro-date-from"></label>
            <label>到 <input type="date" class="kuro-date-to"></label>
            <label><input type="checkbox" class="kuro-filter-no-thumb"> 僅缺少縮圖</label>
            <label><input type="checkbox" class="kuro-filter-has-note"> 僅有備註</label>
          </div>
        </details>
        <div class="kuro-batch-bar" style="display:none">
          <div class="kuro-mini kuro-batch-info">已選 0 筆</div>
          <button type="button" class="kuro-btn kuro-batch-add-to">+ 加入…</button>
          <button type="button" class="kuro-btn kuro-batch-remove-from">- 移除…</button>
          <button type="button" class="kuro-btn kuro-batch-delete">\u274C 刪除</button>
          <button type="button" class="kuro-btn kuro-batch-clear">取消選取</button>
        </div>
        <div class="kuro-actions-grid">
          <button type="button" class="kuro-btn kuro-manage-playlists">\u{1F3F7} 管理播放清單</button>
          <button type="button" class="kuro-btn kuro-sync-now">\u2601 立即同步</button>
          <button type="button" class="kuro-btn kuro-sync-settings">\u2699 同步設定</button>
          <span class="kuro-sync-status"></span>
        </div>
        <div class="kuro-actions-grid">
          <button type="button" class="kuro-btn kuro-export">匯出 JSON</button>
          <button type="button" class="kuro-btn kuro-import">匯入 JSON</button>
          <button type="button" class="kuro-btn kuro-clear-all">清空全部</button>
        </div>
        <div class="kuro-list"></div>
        <div class="kuro-row-actions kuro-pager">
          <button type="button" class="kuro-btn kuro-prev-page">上一頁</button>
          <div class="kuro-mini kuro-page-info">第 1 / 1 頁</div>
          <button type="button" class="kuro-btn kuro-next-page">下一頁</button>
        </div>
        <input type="file" class="kuro-import-file" style="display:none" accept="application/json">
      </div>
    `;
    document.body.appendChild(panel);

    rebuildFilterPills(panel);
    restoreUIState(panel);
    panel.dataset.page = '1';

    // Event listeners
    panel.querySelector('.kuro-toggle-max').addEventListener('click', () => { panel.classList.toggle('max'); persistUIState(); });
    panel.querySelector('.kuro-close-btn').addEventListener('click', () => panel.classList.remove('show'));
    let searchTimer = null;
    panel.querySelector('.kuro-search').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { panel.dataset.page = '1'; renderPanel(); }, 150);
    });
    panel.querySelector('.kuro-sort').addEventListener('change', () => { panel.dataset.page = '1'; persistUIState(); renderPanel(); });
    panel.querySelector('.kuro-sort-dir').addEventListener('change', () => { panel.dataset.page = '1'; persistUIState(); renderPanel(); });
    panel.querySelector('.kuro-date-from').addEventListener('change', () => { panel.dataset.page = '1'; renderPanel(); });
    panel.querySelector('.kuro-date-to').addEventListener('change', () => { panel.dataset.page = '1'; renderPanel(); });
    panel.querySelector('.kuro-filter-no-thumb').addEventListener('change', () => { panel.dataset.page = '1'; renderPanel(); });
    panel.querySelector('.kuro-filter-has-note').addEventListener('change', () => { panel.dataset.page = '1'; renderPanel(); });
    panel.querySelector('.kuro-prev-page').addEventListener('click', () => {
      const c = Number(panel.dataset.page || '1');
      panel.dataset.page = String(Math.max(1, c - 1));
      renderPanel();
    });
    panel.querySelector('.kuro-next-page').addEventListener('click', () => {
      const c = Number(panel.dataset.page || '1');
      panel.dataset.page = String(c + 1);
      renderPanel();
    });
    panel.querySelector('.kuro-manage-playlists').addEventListener('click', () => showPlaylistManager(refreshUI));
    panel.querySelector('.kuro-sync-now').addEventListener('click', async () => {
      const cfg = getSyncConfig();
      if (!cfg.token || !cfg.gistId) { showSyncSettings(); return; }
      const btn = panel.querySelector('.kuro-sync-now');
      btn.disabled = true; btn.textContent = '同步中…';
      try { await syncFull(false); } finally { btn.disabled = false; btn.textContent = '\u2601 立即同步'; }
    });
    panel.querySelector('.kuro-sync-settings').addEventListener('click', () => showSyncSettings());
    panel.querySelector('.kuro-export').addEventListener('click', () => {
      const db = getDB();
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `asmr-tracker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      showToast('已匯出 JSON', 'success');
    });
    panel.querySelector('.kuro-import').addEventListener('click', () => panel.querySelector('.kuro-import-file').click());
    panel.querySelector('.kuro-import-file').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      showImportPreview(file, refreshUI);
      e.target.value = '';
    });
    panel.querySelector('.kuro-clear-all').addEventListener('click', () => {
      if (!confirm('確定要清空所有追蹤項目嗎？')) return;
      const dbSnapshot = { ...getDB() };
      setDB({});
      saveDB();
      refreshUI();
      showToast('已清空全部資料', 'info', 5000, {
        label: '復原',
        onClick: () => { setDB(dbSnapshot); saveDB(); refreshUI(); },
      });
    });

    // Batch actions
    function showPlaylistDropdown(action) {
      // Remove any existing dropdown
      document.querySelectorAll('.kuro-batch-dropdown').forEach(el => el.remove());
      const ids = [...panelState.selected];
      if (!ids.length) return;
      const sorted = getPlaylistsSorted();
      const menu = document.createElement('div');
      menu.className = 'kuro-batch-dropdown';
      menu.style.cssText = 'position:fixed;z-index:100003;background:var(--k-glass-heavy);border:1px solid var(--k-border);border-radius:10px;padding:8px;backdrop-filter:blur(18px);box-shadow:0 8px 32px rgba(0,0,0,.5)';
      const removeMenu = () => { menu.remove(); document.removeEventListener('mousedown', outsideHandler); };
      sorted.forEach(pl => {
        const btn = createButton(`${pl.icon} ${pl.name}`, () => {
          beginBatch();
          ids.forEach(id => {
            const entry = getEntry(id);
            if (!entry) return;
            let pls = [...(entry.playlists || [])];
            if (action === 'add' && !pls.includes(pl.id)) pls.push(pl.id);
            if (action === 'remove') pls = pls.filter(p => p !== pl.id);
            upsert(id, { ...entry, playlists: pls });
          });
          panelState.selected.clear();
          endBatch();
          removeMenu();
          const msg = action === 'add'
            ? `已將 ${ids.length} 個項目加入「${pl.name}」`
            : `已將 ${ids.length} 個項目從「${pl.name}」移除`;
          showToast(msg, 'success');
        });
        menu.appendChild(btn);
      });
      const cancelBtn = createButton('取消', () => removeMenu());
      menu.appendChild(cancelBtn);
      const bar = panel.querySelector('.kuro-batch-bar');
      const rect = bar.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${rect.left}px`;
      document.body.appendChild(menu);
      // Close on outside click
      const outsideHandler = (e) => { if (!menu.contains(e.target)) removeMenu(); };
      setTimeout(() => document.addEventListener('mousedown', outsideHandler), 0);
    }

    panel.querySelector('.kuro-batch-add-to').addEventListener('click', () => showPlaylistDropdown('add'));
    panel.querySelector('.kuro-batch-remove-from').addEventListener('click', () => showPlaylistDropdown('remove'));
    panel.querySelector('.kuro-batch-delete').addEventListener('click', () => {
      const ids = [...panelState.selected];
      if (!ids.length) return;
      if (!confirm(`確定要刪除已選取的 ${ids.length} 個項目嗎？`)) return;
      const snapshots = {};
      ids.forEach(id => { snapshots[id] = { ...getEntry(id) }; });
      beginBatch();
      ids.forEach(id => removeEntry(id));
      panelState.selected.clear();
      endBatch();
      showToast(`已刪除 ${ids.length} 個項目`, 'info', 5000, {
        label: '復原',
        onClick: () => { beginBatch(); Object.entries(snapshots).forEach(([id, data]) => upsert(id, data)); endBatch(); },
      });
    });
    panel.querySelector('.kuro-batch-clear').addEventListener('click', () => { panelState.selected.clear(); renderPanel(); });
  }

  updateToggleCount();
}

function rebuildFilterPills(panel) {
  const pillsContainer = panel.querySelector('.kuro-filter-pills');
  if (!pillsContainer) return;

  // Preserve current active filter before rebuilding
  const currentFilter = panel.querySelector('.kuro-pill.active')?.dataset.filter || '';
  pillsContainer.innerHTML = '';

  const filters = [
    { value: '', label: '全部', icon: '' },
    ...getPlaylistsSorted().map(pl => ({ value: pl.id, label: pl.name, icon: pl.icon })),
  ];

  // If the current filter no longer exists (e.g. playlist deleted), fall back to ''
  const activeFilter = filters.some(f => f.value === currentFilter) ? currentFilter : '';

  filters.forEach(f => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'kuro-pill' + (f.value === activeFilter ? ' active' : '');
    pill.dataset.filter = f.value;
    const labelSpan = document.createElement('span');
    labelSpan.textContent = f.icon ? `${f.icon} ${f.label}` : f.label;
    const countSpan = document.createElement('span');
    countSpan.className = 'kuro-pill-count';
    countSpan.textContent = '0';
    pill.appendChild(labelSpan);
    pill.appendChild(countSpan);
    pill.addEventListener('click', () => {
      pillsContainer.querySelectorAll('.kuro-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      panel.dataset.page = '1';
      persistUIState();
      renderPanel();
    });
    pillsContainer.appendChild(pill);
  });
}

/* ── Render Panel ────────────────────────────────────── */

export function renderPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;

  updateToggleCount();
  rebuildFilterPills(panel);

  const db = getDB();
  const search = panel.querySelector('.kuro-search')?.value?.trim().toLowerCase() || '';
  const filter = panel.querySelector('.kuro-pill.active')?.dataset.filter || '';
  const sortMode = panel.querySelector('.kuro-sort')?.value || 'manual';
  const sortDir = panel.querySelector('.kuro-sort-dir')?.value || 'desc';
  const dateFrom = panel.querySelector('.kuro-date-from')?.value || '';
  const dateTo = panel.querySelector('.kuro-date-to')?.value || '';
  const noThumb = panel.querySelector('.kuro-filter-no-thumb')?.checked || false;
  const hasNote = panel.querySelector('.kuro-filter-has-note')?.checked || false;
  const list = panel.querySelector('.kuro-list');
  if (!list) return;

  const allItems = Object.values(db).filter(item => item.playlists && item.playlists.length > 0);

  // Update pill counts
  const pills = panel.querySelectorAll('.kuro-pill');
  pills.forEach(pill => {
    const f = pill.dataset.filter;
    const count = f === '' ? allItems.length : allItems.filter(x => x.playlists?.includes(f)).length;
    const countEl = pill.querySelector('.kuro-pill-count');
    if (countEl) countEl.textContent = count;
  });

  let items = allItems
    .filter(item => !filter || item.playlists?.includes(filter))
    .filter(item => !search || `${item.title || ''} ${item.note || ''} ${item.rjCode || ''}`.toLowerCase().includes(search))
    .filter(item => !dateFrom || isoDateOnly(item.createdAt) >= dateFrom)
    .filter(item => !dateTo || isoDateOnly(item.createdAt) <= dateTo)
    .filter(item => !noThumb || !item.thumb)
    .filter(item => !hasNote || (item.note && String(item.note).trim()));

  if (sortMode === 'manual') {
    const needsInit = items.length > 0 && items.every(item => item.manualOrder === undefined || item.manualOrder === null);
    if (needsInit) {
      const seeded = [...items].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      seeded.forEach((item, idx) => { if (db[item.itemId]) db[item.itemId].manualOrder = idx; });
      saveDB();
      items = allItems
        .filter(item => !filter || item.playlists?.includes(filter))
        .filter(item => !search || `${item.title || ''} ${item.note || ''} ${item.rjCode || ''}`.toLowerCase().includes(search))
        .filter(item => !dateFrom || isoDateOnly(item.createdAt) >= dateFrom)
        .filter(item => !dateTo || isoDateOnly(item.createdAt) <= dateTo)
        .filter(item => !noThumb || !item.thumb)
        .filter(item => !hasNote || (item.note && String(item.note).trim()));
    }
  }

  items = sortItems(items, sortMode, sortDir);

  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  let currentPage = Number(panel.dataset.page || '1');
  if (!Number.isFinite(currentPage) || currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  panel.dataset.page = String(currentPage);
  const start = (currentPage - 1) * perPage;
  const pagedItems = items.slice(start, start + perPage);

  // Page info
  const pageInfo = panel.querySelector('.kuro-page-info');
  if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${totalPages} 頁`;
  const pager = panel.querySelector('.kuro-pager');
  if (pager) pager.style.display = totalPages > 1 ? 'flex' : 'none';
  const dirSelect = panel.querySelector('.kuro-sort-dir');
  if (dirSelect) dirSelect.disabled = sortMode === 'manual';
  const prevBtn = panel.querySelector('.kuro-prev-page');
  const nextBtn = panel.querySelector('.kuro-next-page');
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

  // Summary bar
  const summaryBar = panel.querySelector('.kuro-summary-bar');
  if (summaryBar) {
    const plCounts = {};
    const sortedPl = getPlaylistsSorted();
    sortedPl.forEach(pl => { plCounts[pl.id] = 0; });
    items.forEach(item => { (item.playlists || []).forEach(pid => { if (plCounts[pid] !== undefined) plCounts[pid]++; }); });

    let text = `共 ${items.length} 筆`;
    sortedPl.forEach(pl => { text += ` \u00B7 ${pl.name}：${plCounts[pl.id]}`; });
    if (search || filter || dateFrom || dateTo || noThumb || hasNote) {
      text = `篩選結果 ${items.length}/${allItems.length} 筆 \u00B7 ` + sortedPl.map(pl => `${pl.name}：${plCounts[pl.id]}`).join(' \u00B7 ');
    }
    if (sortMode === 'manual') text += ' \u00B7 可拖曳排序';

    summaryBar.innerHTML = '';
    const textEl = document.createElement('div');
    textEl.textContent = text;
    summaryBar.appendChild(textEl);

    if (items.length > 0) {
      const total = Object.values(plCounts).reduce((s, c) => s + c, 0) || 1;
      const statBar = document.createElement('div');
      statBar.className = 'kuro-stat-bar';
      sortedPl.forEach(pl => {
        if (plCounts[pl.id] <= 0) return;
        const div = document.createElement('div');
        div.className = 'kuro-stat-segment';
        div.style.width = `${(plCounts[pl.id] / total) * 100}%`;
        div.style.background = pl.color;
        statBar.appendChild(div);
      });
      summaryBar.appendChild(statBar);
    }
  }

  // Batch bar
  const batchBar = panel.querySelector('.kuro-batch-bar');
  if (batchBar) {
    if (panelState.selected.size > 0) {
      batchBar.style.display = 'flex';
      batchBar.querySelector('.kuro-batch-info').textContent = `已選 ${panelState.selected.size} 筆`;
    } else {
      batchBar.style.display = 'none';
    }
  }

  // Build cards
  const fragment = document.createDocumentFragment();

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'kuro-empty-state';
    const hasFilters = search || filter || dateFrom || dateTo || noThumb || hasNote;
    if (hasFilters) {
      empty.innerHTML = '<div class="kuro-empty-icon">\u{1F50D}</div><div class="kuro-empty-text">沒有符合條件的項目<br>試試調整篩選條件</div>';
    } else {
      empty.innerHTML = '<div class="kuro-empty-icon">\u{1F3B5}</div><div class="kuro-empty-text">清單是空的<br>在網站上點擊播放清單按鈕來新增項目</div>';
    }
    fragment.appendChild(empty);
    list.replaceChildren(fragment);
    return;
  }

  const viewIds = sortMode === 'manual' ? items.map(x => x.itemId) : null;

  pagedItems.forEach((item, pageIndex) => {
    const expanded = isExpanded(item.itemId);
    const box = document.createElement('div');
    box.className = 'kuro-item' + (expanded ? ' expanded' : '') + (sortMode === 'manual' ? ' kuro-item-manual' : '');
    box.dataset.itemId = item.itemId;

    // Order column
    if (sortMode === 'manual') {
      const globalIndex = start + pageIndex;
      const orderCol = document.createElement('div');
      orderCol.className = 'kuro-order-col';
      const upBtn = createButton('\u2191', () => moveManualOrder(item.itemId, 'up', viewIds), false, false, '上移');
      const downBtn = createButton('\u2193', () => moveManualOrder(item.itemId, 'down', viewIds), false, false, '下移');
      if (globalIndex === 0) upBtn.disabled = true;
      if (globalIndex === items.length - 1) downBtn.disabled = true;
      const posInput = document.createElement('input');
      posInput.type = 'text';
      posInput.inputMode = 'numeric';
      posInput.pattern = '[0-9]*';
      posInput.value = String(globalIndex + 1);
      posInput.className = 'kuro-order-input';
      posInput.title = '輸入順位';
      const commitPosition = () => setManualOrderPosition(item.itemId, posInput.value, viewIds);
      posInput.addEventListener('change', commitPosition);
      posInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); posInput.blur(); } });
      orderCol.appendChild(upBtn);
      orderCol.appendChild(posInput);
      orderCol.appendChild(downBtn);
      box.appendChild(orderCol);

      // Drag and drop
      box.draggable = true;
      box.addEventListener('dragstart', (e) => { panelState.dragId = item.itemId; box.classList.add('kuro-dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', item.itemId); });
      box.addEventListener('dragend', () => { panelState.dragId = null; box.classList.remove('kuro-dragging'); list.querySelectorAll('.kuro-drag-over').forEach(el => el.classList.remove('kuro-drag-over')); });
      box.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (panelState.dragId && panelState.dragId !== item.itemId) box.classList.add('kuro-drag-over'); });
      box.addEventListener('dragleave', () => box.classList.remove('kuro-drag-over'));
      box.addEventListener('drop', (e) => { e.preventDefault(); box.classList.remove('kuro-drag-over'); const fromId = e.dataTransfer.getData('text/plain'); if (fromId && fromId !== item.itemId) handleDragDrop(fromId, item.itemId, viewIds); });
    }

    // Thumbnail
    let thumbWrap;
    if (item.thumb) {
      thumbWrap = document.createElement('div');
      thumbWrap.className = 'kuro-thumb';
      if (panelState.selected.has(item.itemId)) thumbWrap.classList.add('selected');
      const img = document.createElement('img');
      img.src = item.thumb;
      img.alt = item.title || 'thumb';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { const ph = makePlaceholderThumb(); if (panelState.selected.has(item.itemId)) ph.classList.add('selected'); ph.addEventListener('click', thumbWrap._selectHandler); thumbWrap.replaceWith(ph); };
      thumbWrap.appendChild(img);
    } else {
      thumbWrap = makePlaceholderThumb();
      if (panelState.selected.has(item.itemId)) thumbWrap.classList.add('selected');
    }
    const updateBatchBar = () => {
      const bar = panel.querySelector('.kuro-batch-bar');
      if (bar) {
        if (panelState.selected.size > 0) { bar.style.display = 'flex'; bar.querySelector('.kuro-batch-info').textContent = `已選 ${panelState.selected.size} 筆`; }
        else { bar.style.display = 'none'; }
      }
    };
    thumbWrap._selectHandler = (e) => {
      e.stopPropagation();
      if (panelState.selected.has(item.itemId)) { panelState.selected.delete(item.itemId); thumbWrap.classList.remove('selected'); }
      else { panelState.selected.add(item.itemId); thumbWrap.classList.add('selected'); }
      updateBatchBar();
    };
    thumbWrap.addEventListener('click', thumbWrap._selectHandler);
    box.appendChild(thumbWrap);

    // Content
    const content = document.createElement('div');
    content.style.minWidth = '0';

    const summary = document.createElement('div');
    summary.className = 'kuro-item-summary';
    const left = document.createElement('div');
    left.style.minWidth = '0';

    const titleLine = document.createElement('div');
    titleLine.className = 'kuro-title-line';
    const titleLink = document.createElement('a');
    titleLink.href = item.url;
    titleLink.target = '_self';
    titleLink.title = item.title || '';
    const titleStrong = document.createElement('strong');
    titleStrong.textContent = item.title || '';
    titleLink.appendChild(titleStrong);
    titleLine.appendChild(titleLink);
    left.appendChild(titleLine);

    // Playlist badges
    const meta = document.createElement('div');
    meta.className = 'kuro-status-line';
    (item.playlists || []).forEach(plId => {
      const pl = getPlaylist(plId);
      if (!pl) return;
      const badge = document.createElement('span');
      badge.className = 'kuro-badge';
      badge.textContent = `${pl.icon} ${pl.name}`;
      badge.style.background = pl.color;
      meta.appendChild(badge);
    });
    if (item.rjCode) {
      const rj = document.createElement('span');
      rj.className = 'kuro-mini';
      rj.textContent = item.rjCode;
      meta.appendChild(rj);
    }
    const updated = document.createElement('span');
    updated.className = 'kuro-mini';
    updated.textContent = `更新 ${formatTime(item.updatedAt)}`;
    meta.appendChild(updated);
    left.appendChild(meta);

    // Note preview
    if (!expanded && item.note && String(item.note).trim()) {
      const notePreview = document.createElement('div');
      notePreview.className = 'kuro-note-preview';
      notePreview.textContent = '\u{1F4DD} ' + String(item.note).trim().replace(/\n/g, ' ');
      left.appendChild(notePreview);
    }

    const right = document.createElement('button');
    right.type = 'button';
    right.className = 'kuro-btn kuro-collapse-hint';
    right.textContent = expanded ? '收起 \u25B2' : '展開 \u25BC';
    right.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setExpanded(item.itemId, !expanded); });

    summary.appendChild(left);
    summary.appendChild(right);
    content.appendChild(summary);

    // Expanded body
    const body = document.createElement('div');
    body.className = 'kuro-item-body';

    const metaDetail = document.createElement('div');
    metaDetail.className = 'kuro-meta kuro-mini';
    const metaFields = [
      `RJ：${item.rjCode || 'N/A'}`,
      `加入：${formatTime(item.createdAt)}`,
      `更新：${formatTime(item.updatedAt)}`,
    ];
    metaFields.forEach(text => {
      const div = document.createElement('div');
      div.textContent = text;
      metaDetail.appendChild(div);
    });
    body.appendChild(metaDetail);

    const linkWrap = document.createElement('div');
    const link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.textContent = '開啟頁面';
    linkWrap.appendChild(link);
    body.appendChild(linkWrap);

    const note = document.createElement('textarea');
    note.className = 'kuro-note-edit';
    note.placeholder = '備註…';
    note.value = item.note || '';
    note.addEventListener('change', () => {
      panelState.expanded[item.itemId] = true;
      upsert(item.itemId, { ...item, note: note.value });
      showToast('備註已儲存', 'success');
    });
    body.appendChild(note);

    // Playlist toggle buttons
    const row = document.createElement('div');
    row.className = 'kuro-row-actions';
    getPlaylistsSorted().forEach(pl => {
      const isIn = item.playlists?.includes(pl.id) || false;
      const btn = createButton(`${pl.icon} ${pl.name}`, () => {
        panelState.expanded[item.itemId] = true;
        const entry = getEntry(item.itemId) || item;
        const current = [...(entry.playlists || [])];
        const idx = current.indexOf(pl.id);
        if (idx >= 0) current.splice(idx, 1);
        else current.push(pl.id);
        upsert(item.itemId, { ...entry, playlists: current });
      }, isIn);
      if (isIn) btn.style.borderColor = pl.color;
      row.appendChild(btn);
    });
    row.appendChild(createButton('\u274C 移除', () => {
      const snapshot = { ...item };
      removeEntry(item.itemId);
      showToast('已從所有播放清單移除', 'info', 5000, {
        label: '復原',
        onClick: () => upsert(snapshot.itemId, snapshot),
      });
    }));
    body.appendChild(row);

    content.appendChild(body);
    box.appendChild(content);
    fragment.appendChild(box);
  });

  list.replaceChildren(fragment);
}
