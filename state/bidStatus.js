
((app) => {
  /**
   * 競標狀態機系統 - 消除 HasBids/BidPrice/Bidder/NickName 的條件分支地獄
   * 用狀態機 + 查找表代替 3層嵌套的 if/else 判斷
   */
  const BID_STATUS_SYSTEM = {
    // 競標狀態定義：每種狀態的樣式和行為
    states: {
      loading: {
        // 正在查詢競標資料
        text: '查詢中...',
        color: '#6c757d',
        background: '#f8f9fa',
        icon: '⏳',
        displayMode: 'simple'
      },
      noBids: {
        // 確認無競標
        text: '無競標',
        color: '#856404',
        background: '#fff3cd',
        icon: '○',
        displayMode: 'simple'
      },
      bidding: {
        // 競標中（有出價且未結束）
        text: '',  // 動態生成
        color: '#0056b3',
        background: '#f8f9ff',
        icon: '💰',
        displayMode: 'detailed',
        prefix: '競標中'
      },
      ended: {
        // 競標已結束（有出價且已結束）
        text: '',  // 動態生成
        color: '#155724',
        background: '#d4edda',
        icon: '🏆',
        displayMode: 'detailed',
        prefix: '已結束'
      },
      won: {
        // 已得標（有 WinnerID）
        text: '',  // 動態生成
        color: '#155724',
        background: '#d4edda',
        icon: '✓',
        displayMode: 'detailed',
        prefix: '已得標'
      }
    },

    /**
     * 根據商品資料判斷競標狀態
     * @param {Object} item - 商品物件
     * @returns {string} 狀態鍵 (loading|noBids|bidding|ended)
     */
    determineState(item) {
      // 檢查是否已完成競標資料查詢
      if (!item.hasOwnProperty('HasBids') || item.BidChecked === false) {
        return 'loading';
      }

      // 明確標記無競標
      if (item.HasBids === false) {
        return 'noBids';
      }

      // 已得標（優先判斷）- 有 WinnerID 代表已確定得標
      if (item.WinnerID) {
        return 'won';
      }

      // 有競標且有價格
      if (item.HasBids === true && item.BidPrice) {
        // 檢查是否已結束：EndDate < 現在時間
        if (item.EndDate) {
          const endDate = new Date(item.EndDate);
          const now = new Date();
          if (endDate < now) {
            return 'ended';  // 競標已結束但無得標者
          }
        }
        return 'bidding';  // 競標進行中
      }

      // 預設狀態（安全回退）
      return 'loading';
    },

    /**
     * 格式化出價者顯示名稱 - 消除嵌套條件分支
     * @param {Object} item - 商品物件
     * @param {string} state - 當前狀態
     * @returns {string} 格式化的顯示名稱
     */
    formatBidderName(item, state) {
      // 已得標狀態：優先使用 NickName + WinnerID
      if (state === 'won') {
        const { NickName, WinnerID, Account } = item;

        if (NickName && Account) return `${NickName}(${Account})`;
        if (NickName && WinnerID) return `${NickName}(${WinnerID})`;
        if (NickName) return NickName;
        if (Account) return Account;
        if (WinnerID) return `ID: ${WinnerID}`;
        return '得標者';
      }

      // 競標中/已結束狀態：使用 Bidder
      const { Bidder } = item;
      return Bidder || '出價者';
    },

    /**
     * 生成競標資訊的完整顯示HTML - 統一接口
     * @param {Object} item - 商品物件
     * @param {string} displayType - 顯示類型 ('inline'|'block')
     * @returns {string} 競標顯示HTML
     */
    generateBidDisplay(item, displayType = 'inline') {
      const state = this.determineState(item);
      const config = this.states[state];

      if (config.displayMode === 'simple') {
        // 簡單狀態：loading, noBids
        const style = `color:${config.color};`;
        return displayType === 'inline'
          ? `<span style="${style}">${config.text}</span>`
          : `<br><span style="${style}">${config.text}</span>`;
      }

      // 詳細狀態：bidding, ended, won
      const bidderName = this.formatBidderName(item, state);
      const priceStyle = `color:${config.color};font-weight:600;`;
      const statusPrefix = config.prefix || '';

      if (displayType === 'inline') {
        // 已得標狀態顯示格式：結標 + 價格 + 得標者
        if (state === 'won') {
          return `<span style="${priceStyle}">結標 ${item.BidPrice || '未知'}元 / ${bidderName}</span>`;
        }
        // 競標中/已結束狀態：競標 + 價格 + 出價者
        return `<span style="${priceStyle}">競標 ${item.BidPrice}元 / ${bidderName}</span>`;
      } else {
        const bgColor = state === 'ended' ? '#d4edda' : '#ffebee';
        return `<br><span style="background-color:${bgColor};padding:2px 4px;border-radius:3px;">${statusPrefix} - 最高競標價: ${item.BidPrice} 元<br>最高出價者: ${bidderName}</span>`;
      }
    },

    /**
     * 應用競標狀態樣式到容器元素
     * @param {HTMLElement} element - 要應用樣式的元素
     * @param {Object} item - 商品物件
     */
    applyContainerStyle(element, item) {
      const state = this.determineState(item);
      const config = this.states[state];

      if (config.background && config.background !== '#f8f9fa') {
        element.style.background = config.background;
      }
    }
  };

  app.BID_STATUS_SYSTEM = BID_STATUS_SYSTEM;
})(window.FurnitureHelper = window.FurnitureHelper || {});
