(() => {
  if (window.reviewItInjected) {
    return;
  }
  window.reviewItInjected = true;

  let currentOverlay;
  let currentTarget;
  let capturePadding = 0;
  let hoverPadding = 0;
  let linkInterceptor;

function createOverlay(rect, pad) {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY - pad}px`;
  overlay.style.left = `${rect.left + window.scrollX - pad}px`;
  overlay.style.width = `${rect.width + pad * 2}px`;
  overlay.style.height = `${rect.height + pad * 2}px`;
  overlay.style.border = '2px dashed red';
  overlay.style.zIndex = 999999;
  overlay.style.pointerEvents = 'none';
  return overlay;
}

function removeOverlay() {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

function mouseOverHandler(e) {
  if (currentTarget) return;
  removeOverlay();
  const rect = e.target.getBoundingClientRect();
  currentOverlay = createOverlay(rect, hoverPadding);
  document.body.appendChild(currentOverlay);
}

function clickHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  currentTarget = e.target;
  captureSelected();
  cleanup();
}

function cleanup() {
  removeOverlay();
  document.removeEventListener('mouseover', mouseOverHandler, true);
  document.removeEventListener('click', clickHandler, true);
  if (linkInterceptor) {
    document.removeEventListener('click', linkInterceptor, true);
    linkInterceptor = null;
  }
  document.body.style.cursor = '';
}

let dialog;

function parseFigmaLink(url) {
  try {
    const u = new URL(url);
    const fileKey = u.pathname.split('/')[2];
    const nodeId = u.searchParams.get('node-id');
    return { fileKey, nodeId };
  } catch (e) {
    return {};
  }
}

async function fetchFigmaFrame(fileKey, nodeId, token) {
  const res = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png`,
    { headers: { 'X-Figma-Token': token } }
  );
  const data = await res.json();
  return data.images[nodeId];
}

function showDialog(imageDataUrl) {
  if (dialog) dialog.remove();
  dialog = document.createElement('div');
  dialog.style.position = 'fixed';
  dialog.style.top = '10%';
  dialog.style.left = '10%';
  dialog.style.right = '10%';
  dialog.style.background = 'white';
  dialog.style.border = '1px solid #ccc';
  dialog.style.padding = '10px';
  dialog.style.zIndex = 1000000;
  dialog.style.display = 'flex';
  dialog.style.gap = '10px';

  const screenshot = document.createElement('img');
  screenshot.src = imageDataUrl;
  screenshot.style.maxWidth = '45%';

  const figmaImg = document.createElement('img');
  figmaImg.style.maxWidth = '45%';
  figmaImg.id = 'figmaPreview';

  const linkInput = document.createElement('input');
  linkInput.placeholder = 'Figma frame link';
  linkInput.style.display = 'block';
  linkInput.style.width = '100%';

  const tokenInput = document.createElement('input');
  tokenInput.placeholder = 'Figma token';
  tokenInput.style.display = 'block';
  tokenInput.style.width = '100%';

  const button = document.createElement('button');
  button.textContent = 'Load & Compare';

  const controls = document.createElement('div');
  controls.style.flex = '1';
  controls.appendChild(linkInput);
  controls.appendChild(tokenInput);
  controls.appendChild(button);

  const left = document.createElement('div');
  left.style.flex = '1';
  left.appendChild(screenshot);
  left.appendChild(controls);

  const right = document.createElement('div');
  right.style.flex = '1';
  right.appendChild(figmaImg);

  dialog.appendChild(left);
  dialog.appendChild(right);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '5px';
  closeBtn.style.right = '5px';
  closeBtn.addEventListener('click', () => dialog.remove());
  dialog.appendChild(closeBtn);

  button.addEventListener('click', async () => {
    const { fileKey, nodeId } = parseFigmaLink(linkInput.value);
    const token = tokenInput.value;
    chrome.storage.local.set({ figmaToken: token });
    if (fileKey && nodeId && token) {
      const url = await fetchFigmaFrame(fileKey, nodeId, token);
      figmaImg.src = url;
    }
  });

  document.body.appendChild(dialog);
}

function captureSelected() {
  const rect = currentTarget.getBoundingClientRect();
  chrome.runtime.sendMessage({
    type: 'capture',
    rect: {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    },
    padding: capturePadding,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    }
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'start-selection') {
    capturePadding = message.padding || 0;
    currentTarget = null;
    hoverPadding = 0;
    linkInterceptor = (e) => {
      if (e.target.closest('a')) {
        e.preventDefault();
      }
    };
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mouseover', mouseOverHandler, true);
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('click', linkInterceptor, true);
  } else if (message.type === 'screenshot-captured') {
    showDialog(message.dataUrl);
  }
});

})();
