let currentOverlay;
let currentTarget;
let padding = 0;

function createOverlay(rect) {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = `${rect.top + window.scrollY - padding}px`;
  overlay.style.left = `${rect.left + window.scrollX - padding}px`;
  overlay.style.width = `${rect.width + padding * 2}px`;
  overlay.style.height = `${rect.height + padding * 2}px`;
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
  currentOverlay = createOverlay(rect);
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
    padding,
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
    padding = message.padding || 0;
    currentTarget = null;
    document.addEventListener('mouseover', mouseOverHandler, true);
    document.addEventListener('click', clickHandler, true);
  }
});
