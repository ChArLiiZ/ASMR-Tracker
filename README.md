# 🎧 ASMR Tracker

> Violentmonkey userscript for [japaneseasmr.com](https://japaneseasmr.com/) — track and organize ASMR content with custom playlists.

![License](https://img.shields.io/badge/license-MIT-blue)
![UserScript](https://img.shields.io/badge/userscript-Violentmonkey-orange)

## ✨ Features

- **自訂播放清單** — like YouTube playlists, create unlimited playlists with custom names, colors, and emoji icons
- **一鍵追蹤** — add items to playlists directly from list pages and detail pages
- **浮動面板** — search, filter by playlist, sort by date/title/manual order, batch operations
- **拖曳排序** — drag to reorder playlists in the manager, drag to reorder items in manual sort mode
- **Emoji 圖示選擇器** — categorized emoji picker for playlist icons
- **鍵盤快捷鍵** — press `1`-`9` on detail pages to toggle playlists, `0` to remove all
- **雲端同步** — sync data across devices via private GitHub Gist
- **智慧掃描** — auto-detects list pages, detail pages, and related sections; skips comment areas
- **相似標題提示** — warns when a similar title is already tracked
- **匯出/匯入** — JSON export & import with merge preview
- **深色玻璃主題** — glassmorphism dark UI that blends with the site

## 📦 Installation

### Prerequisites

- [Violentmonkey](https://violentmonkey.github.io/) browser extension (recommended)
- Or any UserScript manager that supports `GM_getValue` / `GM_setValue` / `GM_xmlhttpRequest`

### From Source

```bash
git clone https://github.com/ChArLiiZ/ASMR-Tracker.git
cd ASMR-Tracker
npm install
npm run build
```

Then open `dist/asmr-tracker.user.js` in your browser — Violentmonkey will prompt to install.

### Development

```bash
npm run dev    # Watch mode, auto-rebuild on save
```

After each rebuild, re-install `dist/asmr-tracker.user.js` in Violentmonkey.

## 🚀 Usage

1. Visit [japaneseasmr.com](https://japaneseasmr.com/)
2. A floating **🎧 ASMR Tracker** button appears at the bottom-right
3. On **list pages**: each item shows playlist buttons — click to add/remove
4. On **detail pages**: playlist buttons appear above the content, with keyboard shortcut hints
5. Click the floating button to open the **panel** — browse, search, filter, and manage your tracked items

### Keyboard Shortcuts (Detail Pages)

| Key | Action |
|-----|--------|
| `1` - `9` | Toggle first 9 playlists |
| `0` / `Delete` | Remove from all playlists |

### Playlist Management

- Click **管理播放清單** in the panel to open the playlist manager
- Drag the ⠿ handle to reorder playlists
- Click the emoji icon to change it via the emoji picker
- Click 🎨 to change color, ✏️ to rename, 🗑️ to delete

### Cloud Sync (Optional)

1. Open the panel → click the ☁️ sync button
2. Enter a [GitHub Personal Access Token](https://github.com/settings/tokens?type=beta) with Gist read/write permission
3. Leave Gist ID blank to auto-create, or enter an existing one
4. Enable auto-upload to push changes automatically

## 🏗️ Project Structure

```
src/
├── main.js          # Entry point, init, MutationObserver, keyboard shortcuts
├── constants.js     # Storage keys, element IDs
├── utils.js         # Time formatting, ID extraction, title similarity
├── db.js            # GM storage CRUD, batch mode, normalizeEntry
├── playlist.js      # Playlist CRUD (create/rename/delete/recolor/icon)
├── style.js         # CSS injection (glassmorphism dark theme)
├── ui-helpers.js    # Button creation, visual state, progress bar
├── scanner.js       # Page scanning (list, post, related sections)
├── panel.js         # Floating panel, playlist manager, emoji picker
├── toast.js         # Toast notification system
└── sync.js          # GitHub Gist cloud sync
build.js             # esbuild bundler config
```

## 📄 License

MIT
