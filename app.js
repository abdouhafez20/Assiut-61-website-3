// ========== Constants ==========
const canvas = document.getElementById('editorCanvas');
const ctx = canvas.getContext('2d');
const frameOverlay = document.getElementById('frameOverlay');
const canvasContainer = document.getElementById('canvasContainer');
const photoInput = document.getElementById('photoInput');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const telegramBtn = document.getElementById('telegramBtn');

let img = null;
let imgData = {
  x: 0,
  y: 0,
  scale: 1,
  drag: false,
  lastX: 0,
  lastY: 0,
  lastDist: 0
};

const CANVAS_SIZE = 800; // Export at 800x800 for high quality

// ========== Loading Indicator ==========
function showLoading() {
  if (document.getElementById('loading-overlay')) return;
  let loader = document.createElement('div');
  loader.id = 'loading-overlay';
  loader.innerHTML = `<div class="loader-spinner"></div>`;
  document.body.appendChild(loader);
}
function hideLoading() {
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.remove();
}

// ========== Setup ==========
function resizeCanvasToDisplay() {
  // responsive size
  const rect = canvasContainer.getBoundingClientRect();
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  frameOverlay.style.width = rect.width + 'px';
  frameOverlay.style.height = rect.height + 'px';
}

function resetState() {
  img = null;
  imgData = { x: 0, y: 0, scale: 1, drag: false, lastX: 0, lastY: 0, lastDist: 0 };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  photoInput.value = '';
}

window.addEventListener('resize', resizeCanvasToDisplay);

document.addEventListener('DOMContentLoaded', () => {
  resizeCanvasToDisplay();
  draw();
});

// ========== Drawing ==========
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img) {
    // Draw user image
    const dispW = canvas.width;
    const dispH = canvas.height;

    const imgW = img.width * imgData.scale;
    const imgH = img.height * imgData.scale;

    const x = imgData.x;
    const y = imgData.y;

    ctx.save();
    ctx.drawImage(
      img,
      x - imgW / 2 + dispW / 2,
      y - imgH / 2 + dispH / 2,
      imgW,
      imgH
    );
    ctx.restore();
  }
  // The frame overlay is drawn by the <img> over the canvas in the DOM, not here.
}

// ========== Image Upload ==========
photoInput.addEventListener('change', (e) => {
  if (!e.target.files.length) return;
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function(ev) {
    const image = new window.Image();
    image.onload = function() {
      img = image;
      // Fit image to canvas, center
      const scale = Math.max(
        CANVAS_SIZE / img.width,
        CANVAS_SIZE / img.height
      );
      imgData.scale = scale * 0.95; // Slightly smaller to allow manual zoom in
      imgData.x = 0;
      imgData.y = 0;
      draw();
    };
    image.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

// ========== Canvas Manipulation (Touch + Mouse) ==========

let isDragging = false;
let lastPointer = {x: 0, y: 0};
let lastDist = null;

function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  let touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  if (!touch) return {x:0, y:0};
  return {
    x: (touch.clientX - rect.left) * (canvas.width / rect.width),
    y: (touch.clientY - rect.top) * (canvas.height / rect.height)
  }
}

canvasContainer.addEventListener('mousedown', (e) => {
  if (!img) return;
  isDragging = true;
  lastPointer = {
    x: (e.offsetX) * (canvas.width / canvas.offsetWidth),
    y: (e.offsetY) * (canvas.height / canvas.offsetHeight)
  };
  canvasContainer.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', (e) => {
  if (!img || !isDragging) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);
  imgData.x += (x - lastPointer.x);
  imgData.y += (y - lastPointer.y);
  lastPointer = {x, y};
  draw();
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  canvasContainer.style.cursor = '';
});

canvasContainer.addEventListener('touchstart', (e) => {
  if (!img) return;
  if (e.touches.length === 1) {
    isDragging = true;
    let pos = getTouchPos(e);
    lastPointer = pos;
  } else if (e.touches.length === 2) {
    isDragging = false;
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});
canvasContainer.addEventListener('touchmove', (e) => {
  if (!img) return;
  if (e.touches.length === 1 && isDragging) {
    let pos = getTouchPos(e);
    imgData.x += (pos.x - lastPointer.x);
    imgData.y += (pos.y - lastPointer.y);
    lastPointer = pos;
    draw();
  } else if (e.touches.length === 2) {
    // Pinch to zoom
    let d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    let scaleChange = d / lastDist;
    imgData.scale *= scaleChange;
    lastDist = d;
    draw();
    e.preventDefault();
  }
});
canvasContainer.addEventListener('touchend', () => {
  isDragging = false;
  lastDist = null;
});

// Zoom with mouse wheel
canvasContainer.addEventListener('wheel', (e) => {
  if (!img) return;
  e.preventDefault();
  const scaleFactor = (e.deltaY < 0) ? 1.07 : 0.93;
  imgData.scale *= scaleFactor;
  draw();
}, {passive: false});

// Keyboard controls (arrows move, + - zoom)
canvas.addEventListener('keydown', (e) => {
  if (!img) return;
  switch (e.key) {
    case 'ArrowUp': imgData.y -= 10; break;
    case 'ArrowDown': imgData.y += 10; break;
    case 'ArrowLeft': imgData.x -= 10; break;
    case 'ArrowRight': imgData.x += 10; break;
    case '+':
    case '=':
      imgData.scale *= 1.07; break;
    case '-':
    case '_':
      imgData.scale *= 0.93; break;
    default: return;
  }
  draw();
});

// ========== Download ==========
downloadBtn.addEventListener('click', async () => {
  // Render frame on canvas then download
  if (!img) return;
  showLoading();
  try {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_SIZE;
    exportCanvas.height = CANVAS_SIZE;
    const exportCtx = exportCanvas.getContext('2d');

    // Draw image
    const imgW = img.width * imgData.scale;
    const imgH = img.height * imgData.scale;
    exportCtx.drawImage(
      img,
      imgData.x - imgW / 2 + CANVAS_SIZE / 2,
      imgData.y - imgH / 2 + CANVAS_SIZE / 2,
      imgW,
      imgH
    );

    // Draw the PNG frame overlay
    const overlayImg = new window.Image();
    overlayImg.crossOrigin = 'anonymous';
    overlayImg.src = frameOverlay.src;

    overlayImg.onload = () => {
      try {
        exportCtx.globalAlpha = 0.7;
        exportCtx.drawImage(overlayImg, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        exportCtx.globalAlpha = 1;
        exportCanvas.toBlob((blob) => {
          try {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'graduation-frame.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } catch (err) {
            alert('An error occurred during file download: ' + err.message);
          } finally {
            hideLoading();
          }
        }, 'image/png');
      } catch (err) {
        alert('An error occurred while drawing the overlay: ' + err.message);
        hideLoading();
      }
    };
    overlayImg.onerror = (err) => {
      alert('Could not load the frame overlay image.');
      hideLoading();
    };
  } catch (error) {
    alert('An error occurred during export: ' + error.message);
    hideLoading();
  }
});

// ========== Reset ==========
resetBtn.addEventListener('click', () => {
  resetState();
  draw();
});

// ========== Telegram Bot ==========
telegramBtn.addEventListener('click', () => {
  window.open('https://t.me/Assiut61framebot', '_blank');
});

// ========== Accessibility ==========
canvas.addEventListener('focus', () => {
  canvasContainer.style.boxShadow = '0 0 0 3px var(--accent)';
});
canvas.addEventListener('blur', () => {
  canvasContainer.style.boxShadow = '';
});