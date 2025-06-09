async function getCurrentTab() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

document.getElementById('start').addEventListener('click', async () => {
  const padding = parseInt(document.getElementById('padding').value, 10) || 0;
  const figmaLink = document.getElementById('figmaLink').value;

  const tab = await getCurrentTab();
  chrome.storage.local.set({ figmaLink });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });
  chrome.tabs.sendMessage(tab.id, { type: 'start-selection', padding });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'screenshot-captured') {
    const img = document.getElementById('screenshot');
    img.src = message.dataUrl;
  }
});
