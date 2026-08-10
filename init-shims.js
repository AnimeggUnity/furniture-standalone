// notifications.js 依賴 styles.js，options page 不需要浮動通知
(function(app) {
  app.showDownloadSettingsWarning = (cb) => cb();

  app.getCurrentDistID = () =>
    localStorage.getItem('furniture-helper-dist-id') || app.APP_CONSTANTS.API.DEFAULT_DISTRICT_ID;
})(window.FurnitureHelper = window.FurnitureHelper || {});
