import { PANEL_ID, TOGGLE_ID } from './constants.js';
import { setRefreshUICallback, setOnSaveCallback, getEntry, upsert, removeEntry } from './db.js';
import { extractItemId } from './utils.js';
import { getPlaylistsSorted } from './playlist.js';
import { injectStyle } from './style.js';
import { scanListPage, scanPostPage } from './scanner.js';
import { ensurePanel, renderPanel, updateToggleCount } from './panel.js';
import { showToast } from './toast.js';
import { autoSync, initSync, setSyncRefreshUI } from './sync.js';

function refreshUI() {
  scanListPage();
  scanPostPage();
  updateToggleCount();
  // Only render panel if it's visible
  const panel = document.getElementById(PANEL_ID);
  if (panel && panel.classList.contains('show')) {
    renderPanel();
  }
}

setRefreshUICallback(refreshUI);
setSyncRefreshUI(refreshUI);
setOnSaveCallback(autoSync);

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if modifier keys are held or user is typing in an input/textarea
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

    // Only on post pages
    const itemId = extractItemId(location.href);
    if (!itemId) return;

    const titleEl = document.querySelector('h1.entry-title, .entry-title, h1');
    const title = titleEl?.textContent?.trim() || '';

    const entry = getEntry(itemId) || {};
    const basePatch = {
      title,
      url: location.href,
      thumb: entry.thumb || '',
      note: entry.note || '',
      rjCode: entry.rjCode || '',
    };

    const sorted = getPlaylistsSorted();

    // Keys 1-9 toggle the first 9 playlists
    const idx = parseInt(e.key, 10);
    if (idx >= 1 && idx <= 9 && idx <= sorted.length) {
      e.preventDefault();
      const pl = sorted[idx - 1];
      const current = [...(entry.playlists || [])];
      const pos = current.indexOf(pl.id);
      if (pos >= 0) {
        current.splice(pos, 1);
        showToast(`已從「${pl.name}」移除`, 'info');
      } else {
        current.push(pl.id);
        showToast(`已加入「${pl.name}」`, 'success');
      }
      upsert(itemId, { ...basePatch, playlists: current });
    } else if (e.key === '0' || e.key === 'Delete') {
      if (entry.playlists && entry.playlists.length > 0) {
        e.preventDefault();
        const snapshot = { ...entry };
        removeEntry(itemId);
        showToast('已從所有播放清單移除', 'info', 5000, {
          label: '復原',
          onClick: () => upsert(itemId, snapshot),
        });
      }
    }
  });
}

function init() {
  injectStyle();
  ensurePanel(refreshUI);
  refreshUI();
  setupKeyboardShortcuts();
  initSync();

  let mutationTimer = null;
  const observer = new MutationObserver((mutations) => {
    if (mutationTimer) return;
    let shouldRefresh = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        // Skip our own injected elements
        if (node.id === PANEL_ID || node.id === TOGGLE_ID) continue;
        if (node.closest && node.closest(`#${PANEL_ID}`)) continue;
        if (node.classList && (
          node.classList.contains('kuro-actions') ||
          node.classList.contains('kuro-badge') ||
          node.classList.contains('kuro-badge-group') ||
          node.classList.contains('kuro-inline-note') ||
          node.classList.contains('kuro-skip-all-wrap') ||
          node.classList.contains('kuro-similar-hint') ||
          node.classList.contains('kuro-kbd-bar') ||
          node.classList.contains('kuro-toast')
        )) continue;
        // WordPress / japaneseasmr.com selectors
        const wpMatch = 'article, .post, .type-post, h1.entry-title, .entry-title, a[href*="japaneseasmr.com/"]';
        if (
          node.matches?.(wpMatch) ||
          node.querySelector?.(wpMatch)
        ) {
          shouldRefresh = true;
          break;
        }
      }
      if (shouldRefresh) break;
    }
    if (shouldRefresh) {
      mutationTimer = setTimeout(() => {
        mutationTimer = null;
        refreshUI();
      }, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

init();
