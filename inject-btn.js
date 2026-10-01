(() => {
  function insertBtn() {
    if (document.getElementById('tm-standalone-btn')) return;
    const anchor = Array.from(document.querySelectorAll('button.el-button'))
      .find(b => /查\s*詢/.test(b.textContent));
    if (!anchor) return;

    const btn = document.createElement('button');
    btn.id = 'tm-standalone-btn';
    btn.type = 'button';
    btn.textContent = '管理後台';
    btn.className = 'el-button el-button--warning el-button--small';
    btn.style.marginLeft = '8px';
    btn.onclick = async () => {
      try {
        const runtime = globalThis.chrome?.runtime;
        if (!runtime?.id || typeof runtime.sendMessage !== 'function') {
          window.alert('擴充功能連線已失效，請重新整理此網頁後再開啟管理後台。若仍無法使用，請確認擴充功能已啟用。');
          return;
        }
        await runtime.sendMessage({ action: 'openBackend' });
      } catch (error) {
        console.warn('無法開啟管理後台：', error);
        window.alert('無法連線至管理後台擴充功能，請重新整理此網頁後再試。若仍無法使用，請到擴充功能管理頁重新載入擴充功能，再重新整理此網頁。');
      }
    };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  }

  const observer = new MutationObserver(insertBtn);
  observer.observe(document.body, { childList: true, subtree: true });
  insertBtn();
})();
