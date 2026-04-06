
((app) => {
  // 將圖片轉換為 Base64 的函數
  async function convertImageToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // 處理跨域問題
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 設定 canvas 尺寸
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          // 繪製圖片到 canvas
          ctx.drawImage(img, 0, 0);
          
          // 轉換為 Base64
          const base64 = canvas.toDataURL('image/jpeg', 0.8); // 使用 JPEG 格式，品質 0.8
          resolve(base64);
        } catch (error) {
          reject(new Error(`Canvas 轉換失敗: ${error.message}`));
        }
      };
      
      img.onerror = () => {
        reject(new Error(`圖片載入失敗: ${imageUrl}`));
      };
      
      // 設定圖片來源
      img.src = imageUrl;
    });
  }

  /**
   * 將 Base64 字串轉換為 File 物件。
   * @param {string} base64String - 包含 data URI scheme 的 Base64 字串 (e.g., "data:image/png;base64,...")
   * @param {string} filename - 轉換後的檔案名稱
   * @returns {File} - 可用於上傳的 File 物件
   */
  function base64ToFile(base64String, filename = 'image.jpg') {
    try {
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)[1]; // 從 "data:image/png;base64" 中提取 "image/png"
      const bstr = atob(arr[1]); // 解碼 Base64
      let n = bstr.length;
      const u8arr = new Uint8Array(n);

      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      const file = new File([u8arr], filename, { type: mime });
      return file;
    } catch (error) {
      throw error;
    }
  }

  // 優化的 Base64 轉 File 函數
  function optimizedBase64ToFile(base64String, filename = 'image.jpg') {
    try {
      // 檢查 Base64 大小
      const base64Size = base64String.length;
      const estimatedFileSize = Math.ceil(base64Size * 0.75);
      
      console.log(` Base64 大小: ${(base64Size / 1024).toFixed(1)}KB`);
      console.log(` 預估檔案大小: ${(estimatedFileSize / 1024).toFixed(1)}KB`);
      
      // 如果檔案太大，給出警告
      if (estimatedFileSize > app.APP_CONSTANTS.FILE_SIZE.IMAGE_WARNING_THRESHOLD) {
        console.warn(`警告: 圖片檔案較大: ${(estimatedFileSize / 1024 / 1024).toFixed(1)}MB`);
      }
      
      const arr = base64String.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      
      // 使用 Uint8Array 優化記憶體使用
      const u8arr = new Uint8Array(bstr.length);
      for (let i = 0; i < bstr.length; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      
      const file = new File([u8arr], filename, { type: mime });
      console.log(` 轉換成功: ${filename} (${file.size} bytes)`);
      
      // 清理變數，幫助垃圾回收
      u8arr.fill(0);
      
      return file;
      
    } catch (error) {
      console.error(` Base64 轉換失敗: ${error.message}`);
      throw error;
    }
  }

  app.convertImageToBase64 = convertImageToBase64;
  app.base64ToFile = base64ToFile;
  app.optimizedBase64ToFile = optimizedBase64ToFile;
})(window.FurnitureHelper = window.FurnitureHelper || {});
