# 🎧 ASMR Tracker

> 適用於 [japaneseasmr.com](https://japaneseasmr.com/) 的 Violentmonkey 使用者腳本 — 追蹤與管理 ASMR 內容，支援自訂播放清單。

**繁體中文** | **[English](./README.md)**

![License](https://img.shields.io/badge/license-MIT-blue)
![UserScript](https://img.shields.io/badge/userscript-Violentmonkey-orange)

## ✨ 功能特色

- **自訂播放清單** — 類似 YouTube 播放清單，可自訂名稱、顏色和 Emoji 圖示
- **一鍵追蹤** — 在列表頁和詳情頁直接將項目加入播放清單
- **浮動面板** — 搜尋、依播放清單篩選、多種排序方式、批次操作
- **拖曳排序** — 在管理介面拖曳調整播放清單順序，手動排序模式下拖曳調整項目順序
- **Emoji 圖示選擇器** — 分類式 Emoji 選擇器，輕鬆挑選播放清單圖示
- **鍵盤快捷鍵** — 在詳情頁按 `1`-`9` 切換播放清單，按 `0` 移除全部
- **雲端同步** — 透過私人 GitHub Gist 跨裝置同步資料
- **智慧掃描** — 自動偵測列表頁、詳情頁和相關推薦區段，自動略過評論區
- **相似標題提示** — 當相似標題已被追蹤時顯示警告
- **匯出 / 匯入** — JSON 格式匯出與匯入，支援合併預覽
- **深色玻璃主題** — 毛玻璃風格深色 UI，與網站風格融合

## 📦 安裝方式

### 前置需求

- [Violentmonkey](https://violentmonkey.github.io/) 瀏覽器擴充功能（推薦）
- 或任何支援 `GM_getValue` / `GM_setValue` / `GM_xmlhttpRequest` 的使用者腳本管理器

### 從原始碼安裝

```bash
git clone https://github.com/ChArLiiZ/ASMR-Tracker.git
cd ASMR-Tracker
npm install
npm run build
```

在瀏覽器中開啟 `dist/asmr-tracker.user.js`，Violentmonkey 會提示安裝。

### 開發模式

```bash
npm run dev    # 監聽模式，儲存後自動重新建置
```

每次重新建置後，在 Violentmonkey 中重新安裝 `dist/asmr-tracker.user.js`。

## 🚀 使用方式

1. 前往 [japaneseasmr.com](https://japaneseasmr.com/)
2. 右下角會出現浮動的 **🎧 ASMR Tracker** 按鈕
3. **列表頁**：每個項目旁會顯示播放清單按鈕，點擊即可加入或移除
4. **詳情頁**：播放清單按鈕顯示在內容上方，並附有鍵盤快捷鍵提示
5. 點擊浮動按鈕開啟**面板** — 瀏覽、搜尋、篩選及管理已追蹤的項目

### 鍵盤快捷鍵（詳情頁）

| 按鍵 | 動作 |
|------|------|
| `1` - `9` | 切換前 9 個播放清單 |
| `0` / `Delete` | 從所有播放清單移除 |

### 播放清單管理

- 在面板中點擊 **管理播放清單** 開啟管理介面
- 拖曳 ⠿ 把手調整播放清單順序
- 點擊 Emoji 圖示透過選擇器更換
- 點擊 🎨 更換顏色、✏️ 重新命名、🗑️ 刪除

### 雲端同步（選用）

1. 開啟面板 → 點擊 ☁️ 同步按鈕
2. 輸入具有 Gist 讀寫權限的 [GitHub Personal Access Token](https://github.com/settings/tokens?type=beta)
3. Gist ID 留空會自動建立，或輸入現有的 Gist ID
4. 開啟自動上傳，每次變更後自動推送

## 🏗️ 專案結構

```
src/
├── main.js          # 進入點、初始化、MutationObserver、鍵盤快捷鍵
├── constants.js     # 儲存鍵名、元素 ID
├── utils.js         # 時間格式化、ID 擷取、標題相似度
├── db.js            # GM 儲存 CRUD、批次模式、normalizeEntry
├── playlist.js      # 播放清單 CRUD（建立/重命名/刪除/換色/換圖示）
├── style.js         # CSS 注入（毛玻璃深色主題）
├── ui-helpers.js    # 按鈕建立、視覺狀態、進度條
├── scanner.js       # 頁面掃描（列表頁、詳情頁、相關區段）
├── panel.js         # 浮動面板、播放清單管理、Emoji 選擇器
├── toast.js         # Toast 通知系統
└── sync.js          # GitHub Gist 雲端同步
build.js             # esbuild 打包設定
```

## 📄 授權

MIT
