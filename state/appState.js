
((app) => {
  /**
   * 家具助手應用狀態管理 - 替代全域變數的命名空間
   * 所有應用狀態都封裝在此物件中，避免全域命名空間污染
   */
  const FurnitureHelper = {
    // 應用內部狀態
    state: {
      isStatsButtonTriggered: false,  // 替代 window.__statsButtonTriggered
      version: '3.2.0'
    },

    // 狀態管理方法
    setState(key, value) {
      if (this.state.hasOwnProperty(key)) {
        this.state[key] = value;
        console.debug(`[FurnitureHelper] State updated: ${key} = ${value}`);
      }
    },

    getState(key) {
      return this.state[key];
    },

    // 統計按鈕狀態管理
    setStatsTriggered(value) {
      this.setState('isStatsButtonTriggered', value);
    },

    isStatsTriggered() {
      return this.getState('isStatsButtonTriggered');
    }
  };

  // Assign to the global namespace
  Object.assign(app, FurnitureHelper);

})(window.FurnitureHelper = window.FurnitureHelper || {});
