// notifications.js 依賴 styles.js，options page 不需要浮動通知
(function(app) {
  app.showNotification = (msg, type) => console.warn('[Notification]', type, msg);
  app.showDownloadSettingsWarning = (cb) => cb();

  const DEFAULT_WEBHOOK = 'https://580.blias.com/daobo/files.php?format=json';
  app.getCurrentWebhookUrl = () =>
    localStorage.getItem('furniture-helper-webhook-url') || DEFAULT_WEBHOOK;
})(window.FurnitureHelper = window.FurnitureHelper || {});
