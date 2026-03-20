import { KEY, UI_STATE_KEY } from './constants.js';
import { nowIso, extractRjFromText } from './utils.js';
import { getPlaylistIds } from './playlist.js';

/* globals GM_getValue, GM_setValue, GM_deleteValue */

const THUMB_CDN = 'https://pic.weeabo0.xyz/';
function cdnThumbFromRJ(rjCode) {
  return rjCode ? THUMB_CDN + rjCode.toUpperCase() + '_img_main.jpg' : '';
}

let db = loadDB();
let refreshUICallback = null;
let batchDepth = 0;
let onSaveCallback = null;

export function setOnSaveCallback(fn) {
  onSaveCallback = fn;
}

function loadDB() {
  try {
    const data = GM_getValue(KEY, null);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function saveDB(skipCallback = false) {
  try {
    GM_setValue(KEY, db);
    if (!skipCallback && onSaveCallback) onSaveCallback();
  } catch (e) {
    console.error('[ASMR Tracker] Save failed', e);
  }
}

export function getDB() { return db; }
export function setDB(newDb) { db = newDb; }

export function setRefreshUICallback(fn) {
  refreshUICallback = fn;
}

export function loadUIState() {
  try { return GM_getValue(UI_STATE_KEY, {}); } catch { return {}; }
}

export function saveUIState(state) {
  try { GM_setValue(UI_STATE_KEY, state); } catch {}
}

export function deleteGMValue(key) {
  try { GM_deleteValue(key); } catch {}
}

function nextManualOrder() {
  let max = -1;
  for (const id in db) {
    const o = db[id].manualOrder;
    if (typeof o === 'number' && o > max) max = o;
  }
  return max + 1;
}

export function normalizeEntry(itemId, patch = {}) {
  const old = db[itemId] || {};
  const createdAt = old.createdAt || nowIso();

  // Validate playlists: keep only IDs that still exist
  const validIds = getPlaylistIds();
  let playlists = patch.playlists !== undefined ? patch.playlists : (old.playlists || []);
  if (!Array.isArray(playlists)) playlists = [];
  playlists = playlists.filter(id => validIds.has(id));

  // Auto-extract rjCode from title if not provided
  let rjCode = patch.rjCode !== undefined ? patch.rjCode : (old.rjCode || '');
  if (!rjCode) {
    const title = patch.title || old.title || '';
    rjCode = extractRjFromText(title);
  }

  const thumb = patch.thumb !== undefined ? patch.thumb : (old.thumb || cdnThumbFromRJ(rjCode));

  return {
    ...old,
    ...patch,
    itemId,
    playlists,
    rjCode,
    note: patch.note !== undefined ? patch.note : (old.note || ''),
    thumb,
    manualOrder: patch.manualOrder !== undefined ? patch.manualOrder : (old.manualOrder ?? nextManualOrder()),
    createdAt,
    updatedAt: nowIso(),
  };
}

export function beginBatch() { batchDepth++; }

export function endBatch() {
  if (batchDepth <= 0) { batchDepth = 0; return; }
  if (--batchDepth <= 0) {
    batchDepth = 0;
    saveDB();
    if (refreshUICallback) refreshUICallback();
  }
}

export function upsert(itemId, patch) {
  if (!itemId) return;
  db[itemId] = normalizeEntry(itemId, patch);
  if (batchDepth > 0) return;
  saveDB();
  if (refreshUICallback) refreshUICallback();
}

export function removeEntry(itemId) {
  if (!itemId) return;
  delete db[itemId];
  if (batchDepth > 0) return;
  saveDB();
  if (refreshUICallback) refreshUICallback();
}

export function getEntry(itemId) {
  return db[itemId] || null;
}
