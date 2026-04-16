
((app) => {
  const BASE = 'https://recycledstuff.ntpc.gov.tw';

  /**
   * 上傳單張圖片檔案到新北市再生家具的伺服器。
   * 這個 API 是一個純粹的檔案上傳接口，它接收圖片並回傳一個包含路徑的 JSON。
   *
   * @param {File} imageFile - 使用者透過 <input type="file"> 選擇的圖片檔案物件。
   * @returns {Promise<object>} - 伺服器回傳的 JSON 物件，預期包含 FilePath 等欄位。
   *                              例如: { FilePath: "/Static/Image/Upload/Product/uuid.jpg", ... }
   */
  async function uploadImage(imageFile) {
    const apiUrl = 'https://recycledstuff.ntpc.gov.tw/BidMgr/api/Product/UploadFile';

    console.log(`🖼️ 開始上傳圖片: ${imageFile.name} (${(imageFile.size / 1024).toFixed(1)}KB)`);

    const formData = new FormData();
    formData.append('file', imageFile, imageFile.name);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 圖片上傳失敗: ${response.status} ${response.statusText}`);
        throw new Error(`伺服器錯誤: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ 圖片上傳成功:`, result);
      return result;

    } catch (error) {
      console.error(`❌ 圖片上傳例外:`, error);
      throw error; // 將錯誤向上拋出，以便呼叫者可以處理
    }
  }

  async function directSubmitToAPI(jsonData) {
    console.log(' 開始直接 API 送出...');
    try {
      const payload = {
        CategoryID: app.getCategoryID(jsonData),
        Name: jsonData.Name || '',
        Description: jsonData.Description || '',
        InitPrice: jsonData.InitPrice || '0',
        OriginPrice: jsonData.OriginPrice || '0',
        MinAddPrice: jsonData.MinAddPrice || 10,
        StartDate: jsonData.StartDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
        EndDate: jsonData.EndDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // ← 預設為兩周後
        DistID: jsonData.DistID || '231',
        DeliveryAddress: jsonData.DeliveryAddress || '',
        Length: jsonData.Length || '0',
        Width: jsonData.Width || '0',
        Height: jsonData.Height || '0',
        Photos: []
      };

      if (jsonData.Photos && Array.isArray(jsonData.Photos) && jsonData.Photos.length > 0) {
        const hasBase64Images = jsonData.Photos.some(photo => photo.Photo && photo.Photo.startsWith('data:image'));
        if (hasBase64Images) {
          console.log(`📸 偵測到 ${jsonData.Photos.length} 張 Base64 圖片，開始上傳...`);
          const uploadedPhotos = await uploadImagesWithCorrectAPI(jsonData.Photos);
          payload.Photos = uploadedPhotos.map(photo => ({ Photo: photo.uploadedUrl }));
          console.log(`📸 所有圖片上傳完成，URLs:`, payload.Photos);
        } else {
          payload.Photos = jsonData.Photos;
        }
      }

      console.log('📡 送出 API payload:', payload);
      const response = await fetch(BASE + '/BidMgr/api/Product/AddProduct', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 檢查回應的 Content-Type
      const contentType = response.headers.get('content-type');
      console.log(`📥 伺服器回應: status=${response.status}, content-type=${contentType}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API 錯誤回應 (${response.status}):`, errorText.substring(0, 500));
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 檢查是否真的是 JSON
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error(`❌ 伺服器返回非 JSON 格式 (${contentType}):`, htmlText.substring(0, 500));
        throw new Error(`伺服器返回非 JSON 格式: ${htmlText.substring(0, 200)}`);
      }

      const result = await response.json();
      console.log('✅ API 送出成功:', result);
      return result;
    } catch (error) {
      console.error('API 送出失敗:', error);
      alert(` API 送出失敗: ${error.message}`);
      throw error;
    }
  }

  async function deleteProductAPI(itemData) {
    console.log('🗑️ 開始刪除項目:', itemData.Name, itemData.ID);
    try {
      const response = await fetch(BASE + '/BidMgr/api/Product/DeleteProduct', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      console.log('🗑️ 項目刪除成功:', result);
      return { success: true, result };
    } catch (error) {
      console.error('❌ 項目刪除失敗:', error);
      throw error;
    }
  }

  async function uploadImagesWithCorrectAPI(photos) {
    const uploaded = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      if (photo.Photo && photo.Photo.startsWith('data:image')) {
        const file = app.optimizedBase64ToFile(photo.Photo, `image_${i + 1}.jpg`);
        const result = await uploadImage(file);
        uploaded.push({ ...photo, uploadedUrl: result.FilePath || result });
      } else if (photo.Photo) {
        uploaded.push(photo);
      }
    }
    return uploaded;
  }

  async function updateProductEndDate(item, days = 7) {
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    const newEndDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} 00:00`;
    const payload = { ...item, EndDate: newEndDate };
    console.log(`📅 刷新截標日: ${item.Name} (AutoID: ${item.AutoID}) → ${newEndDate}`);
    const response = await fetch(BASE + '/BidMgr/api/Product/UpdateProduct', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  }

  async function closeProductNow(item) {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const payload = { ...item, EndDate: nowStr };
    const response = await fetch(BASE + '/BidMgr/api/Product/UpdateProduct', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function getProducts(startDate, endDate) {
    const resp = await fetch(BASE + '/BidMgr/api/Product/GetProducts', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        AutoID: null, Name: '', CategoryID: 0, DistID: '231',
        IsPay: null, IsGet: null, Winner: '',
        StartDate: startDate, EndDate: endDate, BidStatus: 0
      })
    });
    if (!resp.ok) throw new Error(`GetProducts failed: ${resp.status}`);
    return resp.json();
  }

  async function enrichWithBids(products) {
    return Promise.all(products.map(async (row) => {
      // 已付款：Payment 資料完整，不需要查 BidLog
      if (row.IsPay) return { ...row, BidChecked: true };
      // 已結束且無得標者（流標）
      if (row.IsFinish && !row.WinnerID) return { ...row, HasBids: false, BidChecked: true };

      const uuid = row.ID;
      if (!uuid) return { ...row, HasBids: false, BidChecked: true };
      try {
        const resp = await fetch(`${BASE}/BidMgr/api/Product/GetBidLog?id=${uuid}`, {
          credentials: 'include',
          headers: { accept: 'application/json' }
        });
        const bids = resp.ok ? await resp.json() : [];
        if (!Array.isArray(bids) || bids.length === 0) return { ...row, HasBids: false, BidChecked: true };
        const maxBid = bids.reduce((a, b) => parseFloat(a.BidPrice || 0) >= parseFloat(b.BidPrice || 0) ? a : b);
        return { ...row, BidPrice: maxBid.BidPrice, Bidder: maxBid.BidderName || maxBid.Account || maxBid.NickName, HasBids: true, BidChecked: true };
      } catch {
        return { ...row, HasBids: false, BidChecked: true };
      }
    }));
  }

  async function getFAQs(distID = '231') {
    const resp = await fetch(`${BASE}/BidMgr/api/Product/GetFAQs?distID=${distID}`, {
      credentials: 'include',
      headers: { accept: 'application/json' }
    });
    if (!resp.ok) throw new Error(`GetFAQs failed: ${resp.status}`);
    return resp.json();
  }

  async function updateProductFAQ(faq, replyText) {
    const payload = { ...faq, Reply: replyText };
    const resp = await fetch(`${BASE}/BidMgr/api/Product/UpdateProductFAQ`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) throw new Error(`UpdateProductFAQ failed: ${resp.status}`);
    return resp.json();
  }

  app.uploadImage = uploadImage;
  app.directSubmitToAPI = directSubmitToAPI;
  app.deleteProductAPI = deleteProductAPI;
  app.uploadImagesWithCorrectAPI = uploadImagesWithCorrectAPI;
  app.updateProductEndDate = updateProductEndDate;
  app.getProducts = getProducts;
  app.enrichWithBids = enrichWithBids;
  app.getFAQs = getFAQs;
  app.updateProductFAQ = updateProductFAQ;
  app.closeProductNow = closeProductNow;
})(window.FurnitureHelper = window.FurnitureHelper || {});
