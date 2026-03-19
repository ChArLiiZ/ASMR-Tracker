import { PANEL_ID } from './constants.js';
import { getDB, getEntry, upsert, removeEntry, beginBatch, endBatch } from './db.js';
import { extractItemId, extractRjCode, titleSimilarity } from './utils.js';
import { getPlaylistsSorted, getPlaylist } from './playlist.js';
import { createButton, applyVisualToHost } from './ui-helpers.js';
import { showToast } from './toast.js';

/* ── Helpers ─────────────────────────────────────────── */

function guessThumb(el) {
  if (!el) return '';
  const img = el.querySelector('img');
  if (!img) return '';
  const src = img.dataset.src || img.dataset.lazySrc || img.src || '';
  if (!src || src.startsWith('data:')) return '';
  return src;
}

function toggleInlineNote(host, item) {
  let noteEl = host.querySelector(':scope > .kuro-inline-note');
  if (noteEl) { noteEl.remove(); return; }
  noteEl = document.createElement('div');
  noteEl.className = 'kuro-inline-note';
  const textarea = document.createElement('textarea');
  textarea.value = getEntry(item.itemId)?.note || '';
  textarea.placeholder = '備註…';
  const saveBtn = createButton('儲存', () => {
    const current = getEntry(item.itemId) || {};
    upsert(item.itemId, { ...current, note: textarea.value });
    showToast('備註已儲存', 'success');
  });
  noteEl.appendChild(textarea);
  noteEl.appendChild(saveBtn);
  host.appendChild(noteEl);
  textarea.focus();
}

function togglePlaylistMembership(item, playlistId) {
  const entry = getEntry(item.itemId) || {};
  const current = [...(entry.playlists || [])];
  const idx = current.indexOf(playlistId);
  const pl = getPlaylist(playlistId);
  const plName = pl?.name || playlistId;
  if (idx >= 0) {
    current.splice(idx, 1);
    showToast(`已從「${plName}」移除`, 'info');
  } else {
    current.push(playlistId);
    showToast(`已加入「${plName}」`, 'success');
  }
  upsert(item.itemId, {
    title: item.title,
    url: item.url,
    thumb: item.thumb,
    rjCode: item.rjCode || entry.rjCode || '',
    playlists: current,
  });
}

function ensureActionsForItem(host, item, visualContainer, iconOnly = false, compact = false, insertAfterEl = null) {
  if (!host || !item.itemId) return;
  if (host.querySelector(':scope > .kuro-actions')) return;

  const wrap = document.createElement('div');
  wrap.className = 'kuro-actions';
  wrap.dataset.itemId = item.itemId;

  const sortedPlaylists = getPlaylistsSorted();
  const entry = getEntry(item.itemId);

  for (const pl of sortedPlaylists) {
    const isIn = entry?.playlists?.includes(pl.id) || false;
    const btn = createButton(
      iconOnly ? pl.icon : `${pl.icon} ${pl.name}`,
      () => togglePlaylistMembership(item, pl.id),
      isIn,
      iconOnly,
      pl.name
    );
    btn.dataset.plId = pl.id;
    if (isIn) btn.style.borderColor = pl.color;
    wrap.appendChild(btn);
  }

  if (!compact) {
    wrap.appendChild(createButton(iconOnly ? '\u{1F4DD}' : '\u{1F4DD} 備註', () => {
      toggleInlineNote(host, item);
    }, false, iconOnly, '備註'));

    wrap.appendChild(createButton(iconOnly ? '\u274C' : '\u274C 移除', () => {
      const snapshot = { ...getEntry(item.itemId) };
      removeEntry(item.itemId);
      showToast('已從所有播放清單移除', 'info', 5000, {
        label: '復原',
        onClick: () => upsert(snapshot.itemId, snapshot),
      });
    }, false, iconOnly, '移除'));
  }

  if (insertAfterEl && insertAfterEl.parentNode === host) {
    insertAfterEl.insertAdjacentElement('afterend', wrap);
  } else {
    host.appendChild(wrap);
  }
}

function checkSimilarTitles(host, itemId, title) {
  const entry = getEntry(itemId);
  if (entry && entry.playlists && entry.playlists.length > 0) return;
  if (host.querySelector('.kuro-similar-hint')) return;

  const db = getDB();
  let bestMatch = null;
  let bestScore = 0;
  for (const id in db) {
    if (id === itemId) continue;
    const e = db[id];
    if (!e.title) continue;
    const score = titleSimilarity(title, e.title);
    if (score >= 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = e;
    }
  }

  if (bestMatch) {
    const hint = document.createElement('div');
    hint.className = 'kuro-similar-hint';
    const pct = Math.round(bestScore * 100);
    const plNames = (bestMatch.playlists || []).map(id => getPlaylist(id)?.name).filter(Boolean).join(', ');
    const extra = plNames ? ` [${plNames}]` : '';
    hint.textContent = `\u26A0 相似 ${pct}%：${bestMatch.title}${extra}`;
    hint.title = `相似度 ${pct}%\n${bestMatch.title}`;
    host.appendChild(hint);
  }
}

/* ── List Page Scanner ───────────────────────────────── */

function collectListItems() {
  const items = [];
  const articles = document.querySelectorAll('article, .post, .type-post, [class*="code-block"]');
  const seen = new Set();

  articles.forEach(article => {
    if (article.closest && article.closest(`#${PANEL_ID}`)) return;
    // Skip comment elements
    if (article.closest && article.closest('#comments, .comments-area, .comment-respond')) return;
    const cls = article.className || '';
    if (cls.includes('comment')) return;
    const a = article.querySelector('h2 a, h3 a, .entry-title a, a[rel="bookmark"]')
           || article.querySelector('a[href*="japaneseasmr.com/"]');
    if (!a) return;
    const itemId = extractItemId(a.href);
    if (!itemId || seen.has(itemId)) return;
    seen.add(itemId);
    const thumb = guessThumb(article);
    items.push({
      itemId,
      title: a.textContent.trim(),
      url: a.href,
      thumb,
      rjCode: '',
      host: article,
    });
  });
  return items;
}

export function scanListPage() {
  const items = collectListItems();
  items.forEach(({ itemId, title, url, thumb, host }) => {
    const item = { itemId, title, url, thumb, rjCode: '' };
    const old = getEntry(itemId);
    if (old && thumb && !old.thumb) {
      upsert(itemId, { ...old, thumb });
    }
    ensureActionsForItem(host, item, null, true);
    applyVisualToHost(host, itemId);
    checkSimilarTitles(host, itemId, title);
  });

  if (items.length > 0) {
    ensureSkipAllButton(items);
  }
}

function ensureSkipAllButton(items) {
  if (document.querySelector('.kuro-skip-all-wrap')) return;
  const pager = document.querySelector('.pagination, .nav-links, nav.navigation, .wp-pagenavi');
  const main = document.querySelector('main, #content, .site-content, .content-area');
  const anchor = pager || main;
  if (!anchor) return;

  const skipPl = getPlaylistsSorted().find(p => {
    const n = p.name.toLowerCase();
    return n.includes('skip') || n.includes('ignore') || n.includes('略過') || n.includes('跳過');
  });
  if (!skipPl) return;

  const wrap = document.createElement('div');
  wrap.className = 'kuro-skip-all-wrap';
  wrap.style.cssText = 'display:flex;justify-content:flex-end;padding:12px 0;gap:8px';

  const btn = createButton(`${skipPl.icon} 略過此頁未追蹤項目`, () => {
    const untracked = items.filter(t => {
      const e = getEntry(t.itemId);
      return !e || !e.playlists || e.playlists.length === 0;
    });
    if (!untracked.length) {
      showToast('此頁所有項目皆已追蹤', 'info');
      return;
    }
    const ids = untracked.map(t => t.itemId);
    beginBatch();
    untracked.forEach(t => {
      upsert(t.itemId, {
        title: t.title, url: t.url, thumb: t.thumb, rjCode: '',
        playlists: [skipPl.id],
      });
    });
    endBatch();
    showToast(`已將 ${untracked.length} 個項目加入「${skipPl.name}」`, 'success', 5000, {
      label: '復原',
      onClick: () => { beginBatch(); ids.forEach(id => removeEntry(id)); endBatch(); },
    });
  });

  wrap.appendChild(btn);
  if (pager) {
    pager.parentNode.insertBefore(wrap, pager);
  } else if (anchor) {
    anchor.appendChild(wrap);
  }
}

/* ── Post Page Scanner ───────────────────────────────── */

export function scanPostPage() {
  const itemId = extractItemId(location.href);
  if (!itemId) return;

  // Detect single post page
  const isSinglePost = !!document.querySelector('.single-post, .single, article.post, body[class*="single"]')
                    || /\/\d+\/?$/.test(location.pathname);
  if (!isSinglePost) return;

  // Find the post title — try specific selectors first, then fall back
  const titleEl = document.querySelector('h1.entry-title, .entry-title, .post-title')
               || document.querySelector('.entry-header h1, .post-header h1, article h1')
               || document.querySelector('h1');
  if (!titleEl) return;

  // Skip if this h1 is a site header/logo, not a post title
  if (titleEl.closest && titleEl.closest('header > nav, .site-branding, .site-header, #masthead')) {
    return;
  }

  const rjCode = extractRjCode();

  // Try multiple strategies for finding the cover thumbnail
  let thumb = getEntry(itemId)?.thumb || '';
  if (!thumb) {
    // Strategy 1: look for wp-post-image (featured image)
    const featured = document.querySelector('.wp-post-image, .attachment-post-thumbnail');
    if (featured) thumb = featured.dataset.src || featured.dataset.lazySrc || featured.src || '';
    // Strategy 2: first image in entry content
    if (!thumb || thumb.startsWith('data:')) {
      const contentImg = document.querySelector('.entry-content img, article img');
      if (contentImg) thumb = contentImg.dataset.src || contentImg.dataset.lazySrc || contentImg.src || '';
    }
    // Strategy 3: og:image meta tag (most reliable for cover art)
    if (!thumb || thumb.startsWith('data:')) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) thumb = ogImg.content || '';
    }
    if (thumb && thumb.startsWith('data:')) thumb = '';
  }

  const item = {
    itemId,
    rjCode,
    title: titleEl.textContent.trim(),
    url: location.href,
    thumb,
  };

  const host = titleEl.parentElement || titleEl;
  ensureActionsForItem(host, item, null, false, false, titleEl);
  applyVisualToHost(host, itemId);

  if (!host.querySelector('.kuro-kbd-bar')) {
    const hint = document.createElement('div');
    hint.className = 'kuro-kbd-bar';
    const sorted = getPlaylistsSorted();
    hint.appendChild(document.createTextNode('快捷鍵：'));
    sorted.slice(0, 9).forEach((pl, i) => {
      if (i > 0) hint.appendChild(document.createTextNode('\u3000'));
      const kbd = document.createElement('kbd');
      kbd.textContent = String(i + 1);
      hint.appendChild(kbd);
      hint.appendChild(document.createTextNode(' ' + pl.name));
    });
    hint.appendChild(document.createTextNode('\u3000'));
    const kbd0 = document.createElement('kbd');
    kbd0.textContent = '0';
    hint.appendChild(kbd0);
    hint.appendChild(document.createTextNode(' 清除'));
    // Insert keyboard hint right after the actions bar
    const actionsBar = host.querySelector('.kuro-actions');
    if (actionsBar) {
      actionsBar.insertAdjacentElement('afterend', hint);
    } else {
      titleEl.insertAdjacentElement('afterend', hint);
    }
  }

  scanRelatedSections();
}

function scanRelatedSections() {
  const containers = document.querySelectorAll(
    '.related-posts, .jp-relatedposts, [class*="related"]:not(#comments):not(.comments-area), [class*="featured"], aside, .sidebar, .widget'
  );
  const seen = new Set();
  seen.add(extractItemId(location.href));

  containers.forEach(container => {
    if (container.closest && container.closest(`#${PANEL_ID}`)) return;
    // Skip containers inside comments section
    if (container.closest && container.closest('#comments, .comments-area, .comment-respond')) return;
    const links = container.querySelectorAll('a[href]');
    links.forEach(a => {
      // Skip comment reply links and anchors
      if (a.href.includes('replytocom') || a.href.includes('#respond') || a.href.includes('#comment')) return;
      // Skip links inside comment bodies
      if (a.closest && a.closest('#comments, .comment-body, .comment-content, .comments-area')) return;
      const tid = extractItemId(a.href);
      if (!tid || seen.has(tid)) return;
      seen.add(tid);

      let host = a.closest('li, article, .related-post') || a.parentElement;
      if (!host || (host.closest && host.closest(`#${PANEL_ID}`))) return;

      const title = a.textContent.trim() || a.getAttribute('title') || '';
      if (!title) return;

      const img = host.querySelector('img');
      const thumb = getEntry(tid)?.thumb || (img ? (img.dataset.src || img.src || '') : '');

      const item = { itemId: tid, title, url: a.href, thumb, rjCode: '' };
      ensureActionsForItem(host, item, null, true, true);
      applyVisualToHost(host, tid);
    });
  });
}
