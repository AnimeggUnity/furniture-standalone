chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'openBackend') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
  }
});
