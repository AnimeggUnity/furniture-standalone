/**
 * 聯絡人資料同步模組
 * 從自己的 PHP 伺服器讀取得標者聯絡資料
 */

((app) => {
  // 預設值（第一次使用時）
  const DEFAULT_API_BASE_URL = 'https://580.blias.com/daobo/contacts.php';
  const DEFAULT_API_KEY = 'furniture-helper-2024-secret';

  // 從設定讀取 API URL 和 Key
  let API_BASE_URL = DEFAULT_API_BASE_URL;
  let API_KEY = DEFAULT_API_KEY;

  // 載入設定的函數
  function loadSettings() {
    // 等待 settingsPanel.js 載入完成
    if (app.getContactsApiUrl && app.getContactsApiKey) {
      API_BASE_URL = app.getContactsApiUrl();
      API_KEY = app.getContactsApiKey();
      console.log('📋 已載入聯絡人 API 設定:', { url: API_BASE_URL });
    } else {
      // 如果 settingsPanel 還沒載入，直接從 localStorage 讀取
      try {
        API_BASE_URL = localStorage.getItem('furniture-helper-contacts-api-url') || DEFAULT_API_BASE_URL;
        API_KEY = localStorage.getItem('furniture-helper-contacts-api-key') || DEFAULT_API_KEY;
      } catch (e) {
        console.warn('無法讀取聯絡人 API 設定，使用預設值');
      }
    }
  }

  // 重新載入設定（當設定變更時呼叫）
  function reloadSettings() {
    loadSettings();
    console.log('🔄 聯絡人 API 設定已重新載入');
  }

  // 初始載入設定
  loadSettings();

  // 聯絡人資料庫（記憶體快取）
  let contactsDB = {};
  let lastSyncTime = null;
  let isSyncing = false;

  /**
   * 從 PHP API 同步聯絡人資料
   */
  async function syncContacts() {
    if (isSyncing) {
      console.log('⏳ 同步進行中，請稍候...');
      return false;
    }

    // 同步前重新載入設定（確保使用最新設定）
    loadSettings();

    isSyncing = true;
    console.log('🔄 開始同步聯絡人資料...');
    console.log(`📡 API URL: ${API_BASE_URL}`);

    try {
      // 帶上 API Key 進行驗證
      const response = await fetch(`${API_BASE_URL}?action=get_contacts&apiKey=${encodeURIComponent(API_KEY)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '同步失敗');
      }

      // 清空舊資料
      contactsDB = {};

      // 建立聯絡人資料庫
      data.contacts.forEach(contact => {
        const account = contact.account;
        if (!account) return;

        // 合併自動資料和手動補充資料
        const mergedContact = {
          name: contact.name || '',
          nickname: contact.nickname || '',
          account: account,
          // 優先使用手動補充的電話，沒有則用自動資料
          phone: contact.phone_manual || contact.phone || '',
          mobile: contact.mobile_manual || contact.mobile || '',
          email: contact.email || '',
          note: contact.note || '',
          lastItem: contact.lastItem || '',
          lastPrice: contact.lastPrice || '',
          lastDate: contact.lastDate || ''
        };

        // 用帳號作為 key
        contactsDB[account] = mergedContact;

        // 也用 Email 作為 key（雙重索引）
        if (mergedContact.email) {
          contactsDB[mergedContact.email] = mergedContact;
        }
      });

      lastSyncTime = new Date();
      console.log(`✅ 同步完成！共載入 ${Object.keys(contactsDB).length / 2} 位聯絡人`);
      console.log(`📅 同步時間: ${lastSyncTime.toLocaleString('zh-TW')}`);

      return true;

    } catch (error) {
      console.error('❌ 同步失敗:', error);
      app.showNotification('聯絡人資料同步失敗: ' + error.message, 'error');
      return false;

    } finally {
      isSyncing = false;
    }
  }

  /**
   * 更新聯絡人資料（補充電話）
   */
  async function updateContact(account, phone, mobile, note) {
    // 更新前重新載入設定
    loadSettings();

    try {
      const formData = new FormData();
      formData.append('action', 'update_contact');
      formData.append('apiKey', API_KEY);
      formData.append('account', account);
      formData.append('phone', phone);
      formData.append('mobile', mobile);
      formData.append('note', note);

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '更新失敗');
      }

      // 更新本地快取
      if (contactsDB[account]) {
        contactsDB[account].phone = phone;
        contactsDB[account].mobile = mobile;
        contactsDB[account].note = note;
      }

      console.log(`✅ 已更新聯絡人: ${account}`);
      return true;

    } catch (error) {
      console.error('❌ 更新失敗:', error);
      app.showNotification('更新聯絡人資料失敗: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * 根據帳號或 Email 查找聯絡人
   */
  function getContact(accountOrEmail) {
    if (!accountOrEmail) return null;
    return contactsDB[accountOrEmail] || null;
  }

  /**
   * 取得所有聯絡人
   */
  function getAllContacts() {
    // 去除重複（因為有雙重索引）
    const uniqueContacts = {};
    Object.values(contactsDB).forEach(contact => {
      uniqueContacts[contact.account] = contact;
    });
    return Object.values(uniqueContacts);
  }

  /**
   * 取得最後同步時間
   */
  function getLastSyncTime() {
    return lastSyncTime;
  }

  /**
   * 檢查是否已同步
   */
  function isSynced() {
    return lastSyncTime !== null && Object.keys(contactsDB).length > 0;
  }

  /**
   * 取得同步狀態資訊
   */
  function getSyncStatus() {
    const contactCount = Object.keys(contactsDB).length / 2; // 因為有雙重索引
    return {
      isSynced: isSynced(),
      isSyncing: isSyncing,
      lastSyncTime: lastSyncTime,
      contactCount: contactCount,
      statusText: isSyncing
        ? '同步中...'
        : isSynced()
          ? `已同步 (${contactCount} 位聯絡人)`
          : '未同步'
    };
  }

  // 匯出到全域
  app.SheetSync = {
    syncContacts,
    getContact,
    getAllContacts,
    getLastSyncTime,
    isSynced,
    getSyncStatus,
    updateContact,      // 更新聯絡人資料
    reloadSettings      // 重新載入設定
  };

  console.log('📋 聯絡人同步模組已載入');

})(window.FurnitureHelper = window.FurnitureHelper || {});
