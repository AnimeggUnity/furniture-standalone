
((app) => {
  /**
   * 商品狀態系統 - 消除 IsPay/IsGet 的 if/else 地獄
   * 用查找表代替 2^2=4 種條件分支組合
   */
  const ITEM_STATUS_SYSTEM = {
    // 狀態組合查找表：根據付款和取貨狀態決定樣式和文字
    combinations: {
      'paid-delivered': {
        text: '已付/已取',
        color: '#28a745',        // 綠色 - 完成狀態
        borderColor: '#28a745',
        background: '#f8f9ff',
        icon: '✓'
      },
      'paid-pending': {
        text: '已付/未取',
        color: '#ffc107',        // 橙色 - 待取貨
        borderColor: '#ffc107',
        background: '#fff8e1',
        icon: '⏳'
      },
      'unpaid-delivered': {
        text: '未付/已取',
        color: '#dc3545',        // 紅色 - 異常狀態
        borderColor: '#dc3545',
        background: '#ffebee',
        icon: '⚠'
      },
      'unpaid-pending': {
        text: '未付/未取',
        color: '#6c757d',        // 灰色 - 初始狀態
        borderColor: '#ddd',
        background: '#f8f9fa',
        icon: '○'
      }
    },

    /**
     * 根據付款和取貨狀態獲取狀態配置
     * @param {boolean} isPaid - 是否已付款
     * @param {boolean} isDelivered - 是否已取貨
     * @returns {Object} 狀態配置物件
     */
    getStatus(isPaid, isDelivered) {
      const key = `${isPaid ? 'paid' : 'unpaid'}-${isDelivered ? 'delivered' : 'pending'}`;
      return this.combinations[key] || this.combinations['unpaid-pending'];
    },

    /**
     * 生成狀態顯示的 HTML
     * @param {boolean} isPaid - 是否已付款
     * @param {boolean} isDelivered - 是否已取貨
     * @returns {string} 狀態 HTML 字符串
     */
    generateStatusHTML(isPaid, isDelivered) {
      const status = this.getStatus(isPaid, isDelivered);
      return `<span style="color:${status.color};font-weight:600;text-align:center;">${status.text}</span>`;
    },

    /**
     * 應用狀態樣式到元素
     * @param {HTMLElement} element - 要應用樣式的元素
     * @param {boolean} isPaid - 是否已付款
     * @param {boolean} isDelivered - 是否已取貨
     */
    applyStatusStyle(element, isPaid, isDelivered) {
      const status = this.getStatus(isPaid, isDelivered);
      element.style.borderLeftColor = status.borderColor;
      if (status.background && status.background !== '#f8f9fa') {
        element.style.background = status.background;
      }
    }
  };

  app.ITEM_STATUS_SYSTEM = ITEM_STATUS_SYSTEM;
})(window.FurnitureHelper = window.FurnitureHelper || {});
