
((app) => {
  /**
   * 應用常數 - 將所有魔法數字語義化，便於維護和理解
   */
  const APP_CONSTANTS = {
    // 時間相關常數（毫秒）
    TIMING: {
      NOTIFICATION_DEFAULT_DURATION: 3000,    // 預設通知顯示時間
      NOTIFICATION_ERROR_DURATION: 4000,      // 錯誤通知顯示時間
      HIGHLIGHT_FADE_DURATION: 2000,          // 高亮消退時間
      STATS_QUERY_DELAY: 1000,                // 統計查詢延遲
      QUERY_FALLBACK_DELAY: 500,              // 查詢回退延遲
      API_REFRESH_DELAY: 2000,                // API 刷新延遲
      PROGRESS_REMOVE_DELAY: 2000,            // 進度條移除延遲
      IMAGE_PROCESSING_DELAY: 200,            // 圖片處理間隔
      HIGHLIGHT_RESET_DELAY: 2000,
      API_RETRY_DELAY: 200,
      PROGRESS_CLEANUP_DELAY: 2000
    },

    // 檔案大小相關常數（bytes）
    FILE_SIZE: {
      MB: 1024 * 1024,                        // 1MB 大小
      IMAGE_WARNING_THRESHOLD: 2 * 1024 * 1024, // 圖片警告閾值 2MB
      KB: 1024                                 // 1KB 大小
    },

    // UI 尺寸相關常數
    UI_DIMENSIONS: {
      MODAL_MIN_WIDTH: 600,                    // 模態框最小寬度
      PANEL_DEFAULT_WIDTH: 320,               // 面板預設寬度
      PANEL_WIDE_WIDTH: 400,                  // 寬版面板寬度
      PANEL_CUSTOM_WIDTH: 380,                // 自定義面板寬度
      MODAL_STATS_WIDTH: 1000                 // 統計模態框寬度
    },

    // Z-index 層級管理
    Z_INDEX: {
      PANEL: 99999,                           // 面板層級
      MODAL: 9999,                            // 模態框層級
      MODAL_HIGH: 10000,                      // 高層級模態框
      NOTIFICATION: 10000,                    // 通知層級
      PROGRESS: 10000                         // 進度條層級
    },

    // API 相關常數
    API: {
      DEFAULT_DISTRICT_ID: '231',             // 預設行政區ID
      CATEGORY_DEFAULT_ID: 13,                // 預設類別ID
      AUCTION_DURATION_DAYS: 14,              // 預設競標持續天數
      IMAGE_QUALITY: 0.8                      // 圖片壓縮品質
    },

    // 顏色常數（語義化）- 現代扁平風
    COLORS: {
      PRIMARY: '#4A90E2',                     // 主色調（柔和藍）
      SUCCESS: '#5CB85C',                     // 成功色（柔和綠）
      WARNING: '#FFB74D',                     // 警告色（柔和橙）
      DANGER: '#E57373',                      // 危險色（柔和紅）
      INFO: '#64B5F6',                        // 資訊色（柔和亮藍）
      SECONDARY: '#9E9E9E',                   // 次要色（柔和灰）
      TEXT_MUTED: '#666'                      // 文字淡色
    },

    // UI組件相關常數
    UI_COMPONENTS: {
      // 進度條相關常數
      PROGRESS: {
        INITIAL: '20%',
        PROCESSING_BASE: 20,
        PROCESSING_RANGE: 60,
        FINAL: '90%',
        COMPLETE: '100%'
      }
    },

    // 業務邏輯常數
    BUSINESS: {
      DEFAULT_AUCTION_DURATION_DAYS: 14       // 預設競標天數
    }
  };

  app.APP_CONSTANTS = APP_CONSTANTS;
})(window.FurnitureHelper = window.FurnitureHelper || {});
