chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_TABS') {
    chrome.tabs.query({ currentWindow: true }, (foundTabs) => {
      const tabs = (foundTabs || []).map((t) => ({
        id: t.id,
        title: t.title || 'Untitled',
        url: t.url || ''
      }));
      sendResponse({ tabs });
    });
    return true; // keep message channel open for async response
  }
});
