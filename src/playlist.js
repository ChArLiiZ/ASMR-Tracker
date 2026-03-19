import { PLAYLIST_KEY } from './constants.js';

/* globals GM_getValue, GM_setValue */

const DEFAULT_PLAYLISTS = {
  pl_listened: { name: '已聽', color: '#6ec8f5', icon: '\u{1F442}', order: 0 },
};

let playlists = loadPlaylists();
let onChangeCallback = null;

function loadPlaylists() {
  try {
    const data = GM_getValue(PLAYLIST_KEY, null);
    if (data && typeof data === 'object' && Object.keys(data).length > 0) return data;
  } catch {}
  // First run: create defaults
  const defaults = JSON.parse(JSON.stringify(DEFAULT_PLAYLISTS));
  try { GM_setValue(PLAYLIST_KEY, defaults); } catch {}
  return defaults;
}

export function savePlaylists() {
  try { GM_setValue(PLAYLIST_KEY, playlists); } catch {}
  if (onChangeCallback) onChangeCallback();
}

export function setPlaylistChangeCallback(fn) {
  onChangeCallback = fn;
}

export function getPlaylists() {
  return playlists;
}

export function getPlaylist(id) {
  return playlists[id] || null;
}

export function getPlaylistsSorted() {
  return Object.entries(playlists)
    .sort(([, a], [, b]) => (a.order ?? 999) - (b.order ?? 999))
    .map(([id, pl]) => ({ id, ...pl }));
}

export function getPlaylistIds() {
  return new Set(Object.keys(playlists));
}

export function createPlaylist(name, color, icon) {
  const id = 'pl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  const maxOrder = Math.max(-1, ...Object.values(playlists).map(p => p.order ?? 0));
  playlists[id] = { name, color: color || '#9ca3af', icon: icon || '\u{1F3F7}', order: maxOrder + 1 };
  savePlaylists();
  return id;
}

export function renamePlaylist(id, name) {
  if (!playlists[id]) return;
  playlists[id].name = name;
  savePlaylists();
}

export function recolorPlaylist(id, color) {
  if (!playlists[id]) return;
  playlists[id].color = color;
  savePlaylists();
}

export function setPlaylistIcon(id, icon) {
  if (!playlists[id]) return;
  playlists[id].icon = icon;
  savePlaylists();
}

export function reorderPlaylists(orderedIds) {
  orderedIds.forEach((id, i) => {
    if (playlists[id]) playlists[id].order = i;
  });
  savePlaylists();
}

export function deletePlaylist(id) {
  if (!playlists[id]) return;
  delete playlists[id];
  savePlaylists();
}

export function setPlaylists(data) {
  playlists = data;
}

export function reloadPlaylists() {
  playlists = loadPlaylists();
}
