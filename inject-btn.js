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
    btn.onclick = () => chrome.runtime.sendMessage({ action: 'openBackend' });
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  }

  const observer = new MutationObserver(insertBtn);
  observer.observe(document.body, { childList: true, subtree: true });
  insertBtn();
})();
