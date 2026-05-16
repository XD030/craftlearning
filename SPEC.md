# 學生課程工作台 — 開發規格書

## 專案目標
一個給單一學生自己用的課程管理 Web App。以「課程」為核心，集中管理筆記、講義、作業、考試、複習。完全本地運行，不需後端，不需 API。

## 技術需求
- **框架**：React + TypeScript + Vite
- **樣式**：Tailwind CSS
- **路由**：React Router
- **資料庫**：IndexedDB（用 Dexie.js 包裝，較好操作）
- **狀態管理**：React Context + useReducer（不要用 Redux，過度設計）
- **圖示**：lucide-react
- **Markdown 渲染**：react-markdown + remark-gfm
- **PDF 預覽**：用 `<iframe>` 載入 blob URL 即可,不要引入 PDF.js
- **打包部署**：能 `npm run build` 出靜態檔案，可直接放 GitHub Pages

## 重要原則
1. **絕對不要呼叫任何外部 API**（OpenAI、Gemini 等都不要）
2. **絕對不要用 localStorage 存大資料**，全部用 IndexedDB
3. **資料隨時可匯出 JSON 備份**，這是使用者安全感的來源
4. **UI 要簡潔有質感**，參考 Linear / Notion 的設計語言,深色淺色模式都要支援
5. **行動裝置可用**(響應式)，但桌機優先

---

## 資料模型

```typescript
// 學期
interface Semester {
  id: string;
  name: string;          // 例如 "114-1"
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// 課程
interface Course {
  id: string;
  semesterId: string;
  name: string;          // 例如 "計算機概論"
  code?: string;         // 課號
  instructor?: string;
  credits?: number;
  schedule?: string;     // 例如 "週一 10:10-12:00"
  classroom?: string;
  color: string;         // 課程主題色（hex）
  gradingPolicy?: string; // 評分方式（純文字）
  createdAt: string;
}

// 筆記（Markdown）
interface Note {
  id: string;
  courseId: string;
  title: string;
  content: string;       // Markdown
  week?: number;         // 第幾週
  tags: string[];
  isHighlight: boolean;  // 是否標記為「重點」
  isReviewed: boolean;   // 是否已整理進複習清單
  createdAt: string;
  updatedAt: string;
}

// 講義/檔案
interface Material {
  id: string;
  courseId: string;
  title: string;
  type: 'file' | 'link';
  fileBlob?: Blob;       // 若 type=file
  fileName?: string;
  fileType?: string;     // mime type
  url?: string;          // 若 type=link
  week?: number;
  notes?: string;
  createdAt: string;
}

// 作業 / 考試 / 報告（統一稱 Task）
interface Task {
  id: string;
  courseId: string;
  type: 'assignment' | 'exam' | 'report' | 'project';
  title: string;
  description?: string;
  dueDate: string;       // ISO datetime
  status: 'todo' | 'in_progress' | 'done';
  scope?: string;        // 範圍（給考試用）例如 "第 3-5 章"
  weight?: number;       // 佔學期成績百分比
  grade?: string;        // 拿到的分數（事後填）
  createdAt: string;
}

// 自製測驗題（不用 AI，使用者自己出）
interface QuizQuestion {
  id: string;
  courseId: string;
  question: string;
  options: string[];     // 至少 2 個
  correctIndex: number;
  explanation?: string;
  tags: string[];
  timesAnswered: number;
  timesCorrect: number;
  lastAnswered?: string;
}

// 小組專案
interface GroupProject {
  id: string;
  courseId?: string;     // 可選關聯課程
  name: string;
  members: string[];     // 名字
  links: { label: string; url: string }[];  // Google Drive、共筆等
  tasks: { id: string; title: string; assignee?: string; done: boolean }[];
  notes: string;
  dueDate?: string;
  createdAt: string;
}
```

---

## 頁面與功能

### 1. 首頁 `/` — 本週儀表板

**頂部**
- 今日日期、星期
- 學期切換下拉選單（預設顯示作用中學期）

**三大區塊（卡片式排列）**

**A. 即將到期**
- 列出未來 14 天內所有 Task（按時間排序）
- 用顏色標示：3 天內紅色、7 天內黃色、其他灰色
- 每筆顯示：課程顏色標籤、類型 icon、標題、剩餘時間、課程名
- 點擊跳到該 Task 詳情

**B. 今日課程**
- 根據 Course.schedule 推算今天有什麼課
- 顯示時間、課名、教室
- 點擊進入課程頁

**C. 待整理提醒**
- 顯示各課程有幾則筆記尚未 `isReviewed`
- 點擊跳到該課程的「整理模式」

**底部：快速動作**
- 「+ 新增筆記」（彈窗選課程）
- 「+ 新增作業/考試」
- 「全域搜尋」按鈕

### 2. 課程列表 `/courses`

- 卡片式呈現所有課程（顯示課程主題色）
- 每張卡片顯示：課名、老師、本週新增筆記數、待辦數
- 右上角「+ 新增課程」
- 學期 tab 切換

### 3. 課程詳情 `/courses/:id`

**頂部**
- 課程資訊（可編輯）
- 顏色 picker
- 評分方式（Markdown 顯示）

**Tabs（橫向）**
- 📝 **筆記**：按週次分組，可切換成「依重點」或「依標籤」檢視
- 📎 **講義**：列表 + 上傳/新增連結按鈕
- ✅ **作業/考試**：時間軸式呈現，已過期歸到最下
- ⭐ **重點整理**：所有 `isHighlight=true` 的筆記，一頁瀏覽
- 🎯 **自測**：題目列表、進入測驗模式
- 👥 **小組專案**：本課的所有 GroupProject

每個 Tab 內部都有「新增」按鈕。

### 4. 筆記編輯器 `/notes/:id`（或新增彈窗）

- 左側：Markdown 編輯區（textarea + 工具列：粗體、列表、code、引用）
- 右側：即時預覽
- 上方：標題、所屬課程、週次、tags、是否重點、是否已整理
- 自動儲存（debounce 1 秒）
- 支援拖入圖片（存 Blob 到 IndexedDB,Markdown 內用 blob URL）

### 5. 考前複習模式 `/courses/:id/review`

**步驟流程**

**Step 1：選範圍**
- 勾選週次（multi-select）
- 或選 tags
- 或全部

**Step 2：自動生成複習頁**
- 上方：該範圍所有「重點筆記」彙整（按週次排序）
- 中段：該範圍所有「講義」清單（檔案/連結）
- 下段：自測題（從該課程選符合 tags 的題目）

**Step 3：複習進度**
- 每個段落可勾選「已複習」
- 顯示總進度條
- 完成後可匯出成 PDF 或 Markdown

### 6. 自測模式 `/courses/:id/quiz`

- 答題介面：一題一頁、4 個選項
- 答完顯示對錯、解析
- 結算頁：總分、錯題列表、「再試一次」「只練錯題」
- 統計：每題的 `timesAnswered` / `timesCorrect` 更新

題目編輯介面（在課程頁 Tab 內）：
- 表單式新增：題目、選項（可動態增減）、正確答案、解析、tags

### 7. 全域搜尋 `/search`

- 頂部搜尋框
- 即時搜尋所有：筆記內容、Task 標題、講義標題、Quiz 題目
- 結果分類顯示，點擊跳轉
- 鍵盤快捷鍵：`Cmd/Ctrl + K` 從任何頁面開啟

### 8. 小組專案頁 `/projects/:id`

- 專案資訊（名稱、課程、deadline）
- 成員清單
- 連結區（Google Drive、共筆等網址，自己貼）
- 內部任務清單（簡單 todo）
- 筆記區（Markdown）

### 9. 設定頁 `/settings`

- 學期管理（新增、編輯、設定作用中）
- 深色/淺色模式切換
- **資料匯出**：下載完整 JSON 備份（含所有 Blob 轉成 base64）
- **資料匯入**：上傳 JSON 還原
- **清除所有資料**（要二次確認）
- 顯示目前資料量（IndexedDB 用量）

---

## UI / UX 細節要求

- **配色**：主色用中性深藍灰 `#1e293b`，輔色用課程自訂色
- **字型**：英數用 Inter，中文用系統預設
- **間距**：寬鬆，不要擠
- **動畫**：頁面切換淡入、卡片 hover 微浮起，不要太花俏
- **空狀態**：每個列表沒資料時要有友善的 empty state 圖示和「新增第一筆」按鈕
- **快捷鍵**：
  - `Cmd/Ctrl + K`：全域搜尋
  - `Cmd/Ctrl + N`：新增筆記
  - `Esc`：關閉彈窗
- **確認機制**：刪除任何資料都要 confirm dialog

---

## 開發優先順序（請依此順序實作）

**Phase 1 — 骨架（先做這個，可運行為止）**
1. 專案初始化、Tailwind、路由設定
2. Dexie.js 設定，定義所有 table
3. Layout（側邊欄 + 主內容區）
4. 學期管理（先寫死一個學期也行）
5. 課程 CRUD + 課程列表頁 + 課程詳情頁框架

**Phase 2 — 核心內容**
6. 筆記 CRUD + Markdown 編輯器
7. Task（作業/考試）CRUD + 課程詳情的 Tab 顯示
8. 講義上傳/連結 CRUD

**Phase 3 — 儀表板與搜尋**
9. 首頁儀表板（聚合各課程資料）
10. 全域搜尋 + `Cmd+K` 快捷鍵

**Phase 4 — 進階模式**
11. 重點筆記檢視 + 考前複習模式
12. 自測題 CRUD + 答題模式 + 統計

**Phase 5 — 收尾**
13. 小組專案模組
14. 設定頁 + 匯入匯出
15. 深色模式
16. 響應式調整

---

## 給 Claude Code 的執行指示

請你：
1. 從 Phase 1 開始，**每完成一個 Phase 就停下來**讓我測試
2. 每個 Phase 完成時告訴我：本階段做了什麼、可以怎麼測試、下一階段是什麼
3. 程式碼分檔清楚，**單檔不超過 300 行**，超過就拆
4. 元件用函式式寫法 + hooks
5. 所有資料操作集中在 `src/db/` 下，UI 元件不要直接碰 Dexie
6. 寫好 README，包含啟動指令和功能說明
7. 遇到設計取捨先問我，不要自己亂選

開始吧。先確認你讀懂規格，列出你打算建立的檔案結構，再開始寫 Phase 1。