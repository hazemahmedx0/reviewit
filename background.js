chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'capture') {
    const tabId = sender.tab.id;
    const imageUri = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      format: 'png'
    });
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(
      message.rect.width + message.padding * 2,
      message.rect.height + message.padding * 2
    );
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      imgBitmap,
      message.rect.left - message.viewport.scrollX - message.padding,
      message.rect.top - message.viewport.scrollY - message.padding,
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const blobOut = await canvas.convertToBlob({ type: 'image/png' });
    const reader = new FileReader();
    reader.onload = () => {
      const outMessage = {
        type: 'screenshot-captured',
        dataUrl: reader.result
      };
      // send to content script on the page
      chrome.tabs.sendMessage(tabId, outMessage);
      // also notify popup or other extension pages
      chrome.runtime.sendMessage(outMessage);
    };
    reader.readAsDataURL(blobOut);
  }
});
