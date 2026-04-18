# 新北再生家具管理後台工具 (Furniture Management Helper)

一個專為「新北市再生家具拍賣網」管理員設計的專業級 Chrome 擴充功能，提供自動化上架、競標監控、聯絡人同步與高效資料管理功能。

![Version](https://img.shields.io/badge/version-1.1.4-blue.svg)
![Platform](https://img.shields.io/badge/platform-Chrome%20|%20Edge-lightgrey.svg)
![Manifest](https://img.shields.io/badge/manifest-V3-orange.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 功能架構概覽

### 🎯 核心檔案結構
```text
.
├── manifest.json          # 擴充功能清單檔 (V3)
├── background.js          # 背景 Service Worker
├── inject-btn.js          # 頁面注入腳本 (Content Script)
├── init-shims.js          # 環境相容性補丁
├── config/                # 系統配置模組
│   ├── constants.js       # 全域常數 (配色、時間、API 設定)
│   └── mappings.js        # 類別與行政區映射邏輯
├── core/                  # 核心系統
│   └── errorHandler.js    # 統一錯誤攔截與處理
├── state/                 # 狀態管理
│   ├── appState.js        # 應用程式全域狀態
│   ├── bidStatus.js       # 競標狀態判斷邏輯
│   └── itemStatus.js      # 項目處理狀態追蹤
├── ui/                    # 使用者介面元件
│   ├── notifications.js   # 現代化通知系統
│   └── queryBuilder.js    # 進階查詢 UI 建構器
└── utils/                 # 工具函式庫
    ├── api.js             # 官方 API 互動封裝
    ├── csv.js             # CSV 資料處理工具
    ├── image.js           # 圖片壓縮與 Base64 轉換
    └── sheetSync.js       # 聯絡人遠端同步模組
```

### 🔧 主要功能模組

#### 1. 產品管理自動化 (Product Automation)
- **快速上架系統**：繞過繁瑣表單，直接透過 `directSubmitToAPI` 送出 JSON 資料。
- **批次刷新截標日**：一鍵將流標物件延長競標期（預設 +7 天），大幅減少重複勞動。
- **智慧類別映射**：自動將中文名稱轉換為系統內部的 `CategoryID`。

#### 2. 強大圖片處理引擎 (Image Engine)
- **自動化上傳**：偵測 Base64 圖片並自動調用官方上傳接口，獲取伺服器路徑。
- **品質優化**：內建圖片壓縮邏輯（品質 0.8），確保上傳效能並符合伺服器限制。
- **格式轉換**：支援 File 物件與 Base64 互轉。

#### 3. 聯絡人資料同步 (Sheet Sync) 🆕
- **遠端資料同步**：從自定義 PHP API 同步得標者聯絡資料（支援 API Key 驗證）。
- **雙重索引查詢**：支援透過「帳號」或「Email」O(1) 複雜度快速檢索聯絡人資訊。
- **即時狀態反饋**：同步按鈕顯示 (⏳同步中 / ✓已同步 / 🔄未同步) 狀態。
- **資料補充機制**：可在介面上直接更新聯絡人電話與備註，並回傳至遠端資料庫。

#### 4. 競標狀態監控 (Bidding Monitor)
- **即時出價抓取**：整合 `GetBidLog` API，自動標註最高出價者與出價金額。
- **智慧狀態標籤**：自動判斷並區分「競標中」、「已結束」、「已得標」與「流標」狀態。
- **視覺化反饋**：根據競標狀態自動套用不同的顏色主題（藍/綠/橙/紅）。

#### 5. 現代化 UI 系統 (Modern UI/UX)
- **按鈕無縫注入**：自動在官方後台插入功能按鈕，維持原生操作習慣。
- **扁平風設計**：使用柔和配色系統 (`#4A90E2`) 與圓角設計，提升管理體驗。
- **彈性配置面板**：支援自定義 API URL 與連線測試功能。

---

## 🚀 詳細功能說明

### 核心模組職責

#### `utils/api.js` - API 互動層
封裝了所有與新北市政府伺服器的通訊邏輯：
- `uploadImage()`: 處理單張或多張圖片上傳。
- `directSubmitToAPI()`: 處理商品新增。
- `updateProductEndDate()`: 執行截標日更新。
- `enrichWithBids()`: 批量抓取競標記錄並整合進商品資料。

#### `utils/sheetSync.js` - 資料同步層
負責與外部聯絡人資料庫對接：
- 支援 `get_contacts` 與 `update_contact` 操作。
- 具備記憶體快取機制，避免重複請求。
- 優先採用「手動補充資料」，自動資料作為備援。

#### `config/constants.js` - 系統常數
定義了全域一致的視覺與邏輯基準：
- **配色常數**: `PRIMARY`, `SUCCESS`, `WARNING`, `DANGER` 等。
- **時間常數**: 通知顯示時間、API 請求延遲、圖片處理間隔。
- **UI 尺寸**: 模態框與面板的寬度限制。

---

## 🔍 技術特色

### 1. 響應式系統整合
- 完美相容官方網頁使用的 **Vue.js 2.x** 框架。
- 透過 `inject-btn.js` 監控 DOM 變化，確保功能按鈕隨時可用。

### 2. 非同步效能優化
- 採用 `Promise.all` 並行處理圖片上傳與競標資料查詢。
- 內建延遲處理機制，避免瞬間請求過多導致伺服器拒絕連線。

### 3. 安全與穩定性
- **統一錯誤處理**: `ERROR_HANDLER` 攔截所有網路錯誤並提供友好的 UI 通知。
- **狀態機機制**: `bidStatus.js` 確保競標狀態判斷邏輯的一致性，避免人為誤判。

---

### 4. Chrome Extension CSP 規則（Manifest V3）

MV3 預設採用嚴格的 Content Security Policy，以下幾種寫法會被**靜默封鎖**（不拋出例外，只是無效）：

#### ❌ 禁止寫法

| 類型 | 禁止範例 | 原因 |
|------|----------|------|
| innerHTML 內嵌事件 | `'<button onclick="fn()">X</button>'` | inline event handler 被 CSP 封鎖 |
| eval | `eval('1+1')` | 禁止動態代碼執行 |
| new Function | `new Function('return 1')()` | 同上 |
| setTimeout 字串 | `setTimeout('fn()', 1000)` | 字串形式等同 eval |
| setInterval 字串 | `setInterval('fn()', 1000)` | 同上 |
| javascript: URL | `<a href="javascript:void(0)">` | 禁止 javascript: 協議 |

#### ✅ 正確寫法

```js
// innerHTML 設完後，用 JS 綁定事件
el.innerHTML = '<button id="close-btn">×</button>';
el.querySelector('#close-btn').onclick = () => modal.remove();
// 或
el.querySelector('#close-btn').addEventListener('click', () => modal.remove());

// setTimeout / setInterval 用函式而非字串
setTimeout(() => fn(), 1000);   // ✅
setTimeout('fn()', 1000);       // ❌
```

> **背景**：本專案 `options.html` 是作為獨立分頁開啟的 Extension Page，同樣受 MV3 CSP 約束。歷史上曾因在 `showFAQModal` 的 `innerHTML` 裡寫 `onclick="..."` 導致關閉按鈕靜默失效（2026/04 修復）。

---

## 📊 資料結構 (Payload)

### 產品上傳結構 (Product Schema)
```json
{
  "CategoryID": 13,
  "Name": "範例家具",
  "Description": "商品描述內容",
  "InitPrice": "100",
  "OriginPrice": "500",
  "StartDate": "2026-04-06 00:00:00",
  "EndDate": "2026-04-20 00:00:00",
  "DistID": "231",
  "Photos": [
    { "Photo": "/Static/Image/Upload/Product/uuid.jpg" }
  ]
}
```

---

## 🛠️ 使用方式

### 安裝步驟
1. 下載本專案至本地資料夾。
2. 開啟 Chrome 瀏覽器，進入 `chrome://extensions/`。
3. 開啟右上角的「開發者模式」。
4. 點擊「載入未封裝擴充功能」，選擇專案資料夾。

### 基本操作
1. **設定 API**: 點擊工具列圖示進入「選項」，設定聯絡人同步 API 與 Webhook。
2. **同步資料**: 開啟後台頁面，點擊「同步聯絡人」以載入最新得標者資訊。
3. **快速管理**: 在商品列表中使用「刷新截標日」或「直接上架」功能。

---

## 🔄 版本更新歷史

### v1.1.4 (Current - 2026/04)
- ✅ **取貨單列印**：在得標者分組標頭新增「🖨 取貨單」按鈕。
  - 點擊後開啟新分頁，列出該得標者所有未取貨商品（含未入帳付款、排除棄標）。
  - 列印頁顯示商品圖片、名稱、得標金額，底部附領貨人簽名、聯絡電話、領貨日期填寫欄。
  - 等待圖片完整載入後才觸發列印預覽，確保圖片不缺失。
  - 商品依 AutoID 降冪排列（最新商品在上）。
- ✅ **得標者分組智慧排序**：得標者群組依三層優先級排列。
  - 第一層：有未取貨商品（非棄標）→ 最優先顯示。
  - 第二層：無未取貨但有未付款商品（非棄標）→ 次之。
  - 第三層：全數取完 → 排最後。
  - 同層內維持姓名字母排序。
- ✅ **操作按鈕防呆**：已得標商品隱藏「編輯」，已結標/已得標商品隱藏「即時結標」，按鈕位置保留避免版面跳動。
- 🔧 **設定快速連結**：更新 GitHub 連結與介紹網站連結至正確位址。

### v1.1.1 (2026/04)
- 🐛 **聯絡人編輯**：修正得標者聯絡資訊無法清空存檔的問題。
  - 編輯模式下允許三欄全空存檔（清除資料）；新增模式維持至少填一欄的限制。
  - 修正 `sheetSync.updateContact` 中空字串不會傳送至後端與本地快取的問題。
- 🐛 **Modal 選字**：修正在輸入框拖曳選取文字時，滑鼠飛出範圍導致 Modal 意外關閉的問題。
  - 改以 `mousedown` 追蹤點擊來源，確保只有真正點擊背景才觸發關閉，套用至全部 4 個 Modal。

### v1.1.0 (2026/04)
- ✅ 整合 **商品問答（FAQ）顯示與回覆** 功能。
  - 查詢時並行抓取 `GetFAQs` API，以 `ProductID` 建立索引，零等待時間。
  - 表格新增「問答」欄：無問答顯示 `—`、有未回覆顯示紅色 `N則 (X未回)`、全部已回覆顯示綠色 `N則`。
  - 點擊徽章開啟 Modal，逐條顯示問題/回覆；未回覆項目可直接在 Modal 內輸入並送出。
  - 回覆成功後即時更新本地狀態與表格徽章（因 `GetFAQs` 只回傳未回覆項目）。

### v1.0.0 (2026/04)
- ✅ 基礎架構遷移至 **Manifest V3**。
- ✅ 整合 **聯絡人資料同步系統 (Sheet Sync)**。
- ✅ 強化 **競標狀態監控** 與自動化查詢邏輯。
- ✅ 採用 **現代化扁平風 UI** 配色與動畫。
- ✅ 支援 **批量截標日刷新** 功能。

---
