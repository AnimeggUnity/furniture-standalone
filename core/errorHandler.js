
((app) => {
  /**
   * 統一錯誤處理系統
   */
  const ERROR_HANDLER = {
    contextMessages: {
      'file-upload': '檔案上傳時發生錯誤',
      'file-download': '檔案下載時發生錯誤',
      'file-processing': '檔案處理時發生錯誤',
      'json-parsing': 'JSON 資料解析時發生錯誤',
      'api-call': 'API 請求時發生錯誤',
      'network-request': '網路請求時發生錯誤',
      'remote-import': '遠端匯入時發生錯誤',
      'ui-operation': '介面操作時發生錯誤',
      'dom-manipulation': 'DOM 操作時發生錯誤',
      'event-handling': '事件處理時發生錯誤',
      'data-conversion': '資料轉換時發生錯誤',
      'local-storage': '本地儲存操作時發生錯誤',
      'validation': '資料驗證時發生錯誤',
      'unknown': '操作時發生錯誤'
    },

    handle(error, context = 'unknown', options = {}) {
      const {
        userFriendly = true,
        showNotification = true,
        logToConsole = true,
        fallbackMessage = null
      } = options;

      if (logToConsole) {
        console.error(`[${context.toUpperCase()}]`, error);
      }

      if (showNotification && userFriendly && typeof window.showNotification === 'function') {
        const userMessage = this.getUserFriendlyMessage(error, context, fallbackMessage);
        window.showNotification(userMessage, 'error', app.APP_CONSTANTS.TIMING.NOTIFICATION_ERROR_DURATION);
      }

      return {
        context,
        originalError: error,
        message: error.message,
        userMessage: this.getUserFriendlyMessage(error, context, fallbackMessage),
        timestamp: new Date().toISOString()
      };
    },

    getUserFriendlyMessage(error, context, fallbackMessage) {
      if (fallbackMessage) return fallbackMessage;

      const contextMessage = this.contextMessages[context] || this.contextMessages['unknown'];

      if (error.name === 'SyntaxError') {
        return `${contextMessage}：資料格式不正確`;
      }
      if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
        return `${contextMessage}：網路連線問題，請檢查網路狀態`;
      }
      if (error.name === 'TypeError') {
        return `${contextMessage}：資料類型錯誤`;
      }

      return `${contextMessage}：${error.message}`;
    },

    async withErrorHandling(fn, context, options = {}) {
      try {
        return await fn();
      } catch (error) {
        const errorInfo = this.handle(error, context, options);
        if (options.rethrow !== false) {
          throw errorInfo;
        }
        return null;
      }
    },

    createHandler(context, defaultOptions = {}) {
      return (error, options = {}) => {
        return this.handle(error, context, { ...defaultOptions, ...options });
      };
    }
  };

  app.ERROR_HANDLER = ERROR_HANDLER;
})(window.FurnitureHelper = window.FurnitureHelper || {});
