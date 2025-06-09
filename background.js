chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === 'capture') {
    const tabId = sender.tab.id;
    const imageUri = await chrome.tabs.captureVisibleTab(sender.tab.windowId, {
      format: 'png'
    });
    const img = new Image();
    img.src = imageUri;
    img.onload = () => {
      const canvas = new OffscreenCanvas(message.rect.width + message.padding * 2,
        message.rect.height + message.padding * 2);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        message.rect.left - message.padding,
        message.rect.top - message.padding,
        canvas.width,
        canvas.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      canvas.convertToBlob({ type: 'image/png' }).then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          chrome.tabs.sendMessage(tabId, {
            type: 'screenshot-captured',
            dataUrl: reader.result
          });
        };
        reader.readAsDataURL(blob);
      });
    };
  }
});
