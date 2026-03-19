import { PANEL_ID } from './constants.js';
import { getEntry } from './db.js';
import { getPlaylist, getPlaylistsSorted } from './playlist.js';

export function createButton(label, onClick, active = false, iconOnly = false, title = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = (iconOnly ? 'kuro-icon-btn' : 'kuro-btn') + (active ? ' active' : '');
  btn.textContent = label;
  if (title) btn.title = title;
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  });
  return btn;
}

export function makePlaceholderThumb() {
  const div = document.createElement('div');
  div.className = 'kuro-thumb';
  div.textContent = '無圖';
  return div;
}

/**
 * Apply visual state to a host element based on the item's playlists.
 * Uses data-kuro-playlists for diff-based updates.
 */
export function applyVisualToHost(host, itemId) {
  if (!host || !itemId) return;

  const entry = getEntry(itemId);
  const playlists = entry?.playlists || [];
  const prevKey = host.dataset.kuroPlaylists || '';
  const newKey = playlists.join(',');
  if (prevKey === newKey) return;
  host.dataset.kuroPlaylists = newKey;

  // Update classes
  host.classList.remove('kuro-tracked', 'kuro-dimmed');

  if (playlists.length > 0) {
    host.classList.add('kuro-tracked');
    // Primary playlist (highest priority by order) determines border glow
    const sorted = getPlaylistsSorted();
    const primary = sorted.find(p => playlists.includes(p.id));
    if (primary) {
      host.style.setProperty('--kuro-pl-color', primary.color);
    }
    // Dim if only in "skip"-like playlists
    const allDimming = playlists.every(id => {
      const pl = getPlaylist(id);
      if (!pl) return false;
      const n = pl.name.toLowerCase();
      return n.includes('skip') || n.includes('downloaded') || n.includes('略過') || n.includes('跳過') || n.includes('已下載');
    });
    if (allDimming) host.classList.add('kuro-dimmed');
  } else {
    host.style.removeProperty('--kuro-pl-color');
  }

  // Update badge dots
  let badgeGroup = host.querySelector(':scope > .kuro-badge-group');
  if (playlists.length > 0) {
    if (!badgeGroup) {
      badgeGroup = document.createElement('span');
      badgeGroup.className = 'kuro-badge-group';
      host.appendChild(badgeGroup);
    }
    badgeGroup.innerHTML = '';
    for (const plId of playlists) {
      const pl = getPlaylist(plId);
      if (!pl) continue;
      const dot = document.createElement('span');
      dot.className = 'kuro-badge-dot';
      dot.style.background = pl.color;
      dot.title = pl.name;
      dot.textContent = pl.icon;
      badgeGroup.appendChild(dot);
    }
  } else if (badgeGroup) {
    badgeGroup.remove();
  }

  // Update active button states
  const actions = host.querySelector(':scope > .kuro-actions');
  if (actions) {
    const btns = actions.querySelectorAll('button[data-pl-id]');
    btns.forEach(btn => {
      const isIn = playlists.includes(btn.dataset.plId);
      btn.classList.toggle('active', isIn);
      if (isIn) {
        const pl = getPlaylist(btn.dataset.plId);
        btn.style.borderColor = pl?.color || '';
      } else {
        btn.style.borderColor = '';
      }
    });
  }
}

export function setProgressState(state) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  let box = panel.querySelector('.kuro-progress');
  if (!state) {
    if (box) box.remove();
    return;
  }
  if (!box) {
    box = document.createElement('div');
    box.className = 'kuro-progress';
    box.innerHTML = '<div class="kuro-progress-text"></div><div class="kuro-progress-bar"><div class="kuro-progress-fill"></div></div>';
    const body = panel.querySelector('.body');
    if (!body) return;
    body.insertBefore(box, body.firstChild);
  }
  box.querySelector('.kuro-progress-text').textContent = state.text || '載入中…';
  box.querySelector('.kuro-progress-fill').style.width = `${Math.max(0, Math.min(100, state.percent || 0))}%`;
}
