# ASMR Tracker

Violentmonkey userscript for https://japaneseasmr.com/ to track and organize content with custom playlists.

**UI language: Traditional Chinese (繁體中文)** — all buttons, labels, toasts, and dialogs must be in Chinese.

## Project Structure

- `src/` — Source code (ES modules)
  - `main.js` — Entry point, init, MutationObserver (100ms debounce), keyboard shortcuts
  - `constants.js` — Storage keys, element IDs
  - `utils.js` — Utilities (time formatting, item ID extraction, RJ code extraction, title similarity)
  - `db.js` — GM_getValue/GM_setValue CRUD, batch mode, normalizeEntry (playlist-aware)
  - `playlist.js` — Playlist CRUD (create/rename/delete/recolor/icon, drag-to-reorder)
  - `style.js` — CSS injection (glassmorphism dark theme, emoji picker, playlist manager styles)
  - `ui-helpers.js` — Button creation, visual state (multi-playlist badge dots), progress bar
  - `scanner.js` — Page scanning for list pages, post pages (buttons at top), related sections
  - `panel.js` — Floating panel UI, playlist management modal, emoji picker, filtering, sorting, batch ops
  - `toast.js` — Non-blocking notification system with undo support (double-click protected)
  - `sync.js` — GitHub Gist cloud sync (dual payload: items + playlists)
- `build.js` — esbuild config (banner with UserScript metadata, target: es2020)
- `dist/` — Build output (gitignored)

## Commands

```bash
npm run build    # Bundle to dist/asmr-tracker.user.js
npm run dev      # Watch mode, auto-rebuild on save
```

## Development Notes

- This is a Violentmonkey userscript; build output must be a single IIFE `.user.js` file
- UserScript metadata block is in `build.js` banner — edit @match/@version there
- `@grant GM_getValue / GM_setValue / GM_deleteValue / GM_xmlhttpRequest`
- Data stored in GM storage under key `kuro_asmr_tracker_v1`
- Playlist definitions stored under `kuro_asmr_playlists`
- UI preferences (sort, filter, wide mode) stored in `kuro_asmr_ui_state`
- All modules connected via ES module import/export, esbuild bundles into single file
- After source changes: `npm run build`, then install `dist/asmr-tracker.user.js` in Violentmonkey
- `dist/` is in `.gitignore`

## Security Notes

- Never use `innerHTML` with user-controlled data — use `textContent` or DOM API
- Sync token is set via DOM `.value`, not interpolated into HTML
- Imported JSON data is normalized through `normalizeEntry()` before merging
- Playlist names are rendered with `textContent` to prevent XSS

## Data Model

### Playlist Definitions (`kuro_asmr_playlists`)
```js
{
  "pl_listened": { name: "已聽", color: "#6ec8f5", icon: "👂", order: 0 },
  // Users can add custom playlists (like YouTube playlists)
}
```
1 default ("已聽") created on first run. Users can add custom playlists, rename/delete/recolor/change icon freely. Playlist order is user-draggable in the manager modal.

### Item Entry (`kuro_asmr_tracker_v1`)
```js
{
  itemId: "12345",
  rjCode: "RJ01583417",
  title: "...",
  url: "https://japaneseasmr.com/12345/",
  thumb: "https://...",
  playlists: ["pl_listened", "pl_custom"],  // multiple allowed
  note: "",
  manualOrder: 0,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
}
```

## Performance Design

- `beginBatch()` / `endBatch()` — batch ops trigger one saveDB + refreshUI (guarded against mismatched calls)
- `saveDB(skipCallback)` — optional flag to skip auto-sync callback (used after pull to prevent push loop)
- `applyVisualToHost` uses `data-kuro-playlists` diff tracking, skips unchanged DOM
- MutationObserver 100ms debounce + filters own injected elements
- Search input 150ms debounce
- Panel hidden = skip `renderPanel()`, render on open
- Card list uses DocumentFragment for single DOM write

## Keyboard Shortcuts (Post Pages)

| Key | Action |
|-----|--------|
| `1`-`9` | Toggle first 9 playlists |
| `0` / `Delete` | Remove from all playlists |

## Scanner Behavior

- **List pages**: Scans `article` elements, skips comments (`#comments`, `.comments-area`, `.comment-respond`)
- **Post pages**: Detects single-post pages, inserts playlist buttons **above content** (after title), shows keyboard hint bar
- **Related sections**: Scans aside/widget/related containers, excludes comment links and reply anchors

## Sync

- GitHub Gist-based cloud sync
- Payload: `{ items: {...}, playlists: {...} }`
- Auto-push (debounced 3s) after each save when enabled
- Pull does NOT trigger auto-push (uses `saveDB(true)` to skip callback)
- Manual pull via "立即同步" button
- Item merge: conflict resolved by `updatedAt` timestamp
- Playlist merge: union of both sides, local takes precedence for existing
- `syncFull()` wrapped in try/catch for error reporting

## UI Components

- **Emoji Picker**: Categorized tabs (表情/手勢/愛心/星星/音樂/動物/食物/符號), grid layout, click to select
- **Playlist Manager Modal**: Drag-to-reorder, inline rename/recolor/icon-change, Escape to close
- **Batch Operations**: Multi-select with dropdown for add/remove playlist, outside-click to dismiss
- **Toast Notifications**: Auto-dismiss, undo button (double-click protected), stacked display
