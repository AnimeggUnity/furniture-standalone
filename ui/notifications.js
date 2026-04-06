
((app) => {
  /**
   * 通知類型到樣式的映射表
   */
  const NOTIFICATION_TYPE_MAP = {
    success: app.UI_COMPONENTS.notification.success,
    error: app.UI_COMPONENTS.notification.error,
    warning: app.UI_COMPONENTS.notification.warning,
    info: app.UI_COMPONENTS.notification.info
  };

  /**
   * 統一通知系統 - 使用新的樣式組合器
   * @param {string} message - 通知訊息
   * @param {string} type - 通知類型 (success|error|warning|info)
   * @param {number} duration - 顯示時長（毫秒）
   */
  function showNotification(message, type = 'info', duration = app.APP_CONSTANTS.TIMING.NOTIFICATION_DEFAULT_DURATION) {
    const notification = document.createElement('div');
    const typeStyle = NOTIFICATION_TYPE_MAP[type] || NOTIFICATION_TYPE_MAP.info;

    notification.style.cssText = app.combineStyles(
      app.UI_COMPONENTS.notification.base,
      typeStyle
    );

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);
  }

  app.showNotification = showNotification;
  window.showNotification = showNotification; // Expose globally for error handler
})(window.FurnitureHelper = window.FurnitureHelper || {});
