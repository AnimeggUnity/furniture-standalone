
((app) => {
  // 類別映射表 (對應 webhook.php 的 CATEGORY_MAPPING)
  const CATEGORY_MAPPING = {
    '茶几': 6,
    '沙發': 39,
    '收納櫃': 9,
    '鞋架': 10,
    '鞋櫃': 10,
    '玄關櫃': 11,
    '電視櫃': 12,
    '椅子': 40,
    '書櫃': 14,
    '書桌': 15,
    '家飾': 28,
    '燈具': 29,
    '燈飾': 29,
    '家用電器': 30,
    '腳踏車': 31,
    '其他': 32
  };

  app.CATEGORY_MAPPING = CATEGORY_MAPPING;

  // 從 CategoryID 取得類別名稱
  function getCategoryNameFromID(categoryID) {
    if (!categoryID) return '';
    
    for (const [name, id] of Object.entries(CATEGORY_MAPPING)) {
      if (id === categoryID) {
        return name;
      }
    }
    return '';
  }

  // 取得類別ID的輔助函數
  function getCategoryID(jsonData) {
    // 1. 優先使用現有的 CategoryID
    if (jsonData.CategoryID) {
      return jsonData.CategoryID;
    }
    
    // 2. 從 CategoryName 轉換
    if (jsonData.CategoryName && CATEGORY_MAPPING[jsonData.CategoryName]) {
      return CATEGORY_MAPPING[jsonData.CategoryName];
    }
    
    // 3. 預設值
    return 13;
  }

  app.getCategoryNameFromID = getCategoryNameFromID;
  app.getCategoryID = getCategoryID;

})(window.FurnitureHelper = window.FurnitureHelper || {});
