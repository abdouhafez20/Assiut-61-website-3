const canvas = document.getElementById('editorCanvas'),
  ctx = canvas.getContext('2d'),
  frameOverlay = document.getElementById('frameOverlay'),
  canvasContainer = document.getElementById('canvasContainer'),
  photoInput = document.getElementById('photoInput'),
  downloadBtn = document.getElementById('downloadBtn'),
  resetBtn = document.getElementById('resetBtn'),
  telegramBtn = document.getElementById('telegramBtn'),
  qualitySelect = document.getElementById('qualitySelect'),
  dropZone = document.getElementById('dropZone'),
  shareBtn = document.getElementById('shareBtn'),
  loadingOverlay = document.getElementById('loading-overlay');

let img = null,
  imgData = { x: 0, y: 0, scale: 1 },
  CANVAS_SIZE = 800;

function showLoading() {
  loadingOverlay && (loadingOverlay.style.display = 'flex');
}

function hideLoading() {
  loadingOverlay && (loadingOverlay.style.display = 'none');
}

function resizeCanvasToDisplay() {
  const e = canvasContainer.getBoundingClientRect();
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  canvas.style.width = e.width + 'px';
  canvas.style.height = e.height + 'px';
  frameOverlay.style.width = e.width + 'px';
  frameOverlay.style.height = e.height + 'px';
}

function resetState() {
  img = null;
  imgData = { x: 0, y: 0, scale: 1 };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  photoInput.value = '';
}

window.addEventListener('resize', resizeCanvasToDisplay);
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvasToDisplay();
  draw();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (img) {
    const e = canvas.width,
      t = canvas.height,
      i = img.width * imgData.scale,
      a = img.height * imgData.scale,
      o = imgData.x,
      n = imgData.y;
    ctx.save();
    ctx.drawImage(
      img,
      o - i / 2 + e / 2,
      n - a / 2 + t / 2,
      i,
      a
    );
    ctx.restore();
  }
}

photoInput.addEventListener('change', e => {
  if (!e.target.files.length) return;
  handleFile(e.target.files[0]);
});

function handleFile(e) {
  if (!e.type.startsWith('image/'))
    return alert('يرجى رفع صورة فقط');
  if (e.size > 7e6)
    return alert('الصورة كبيرة جداً. يرجى اختيار صورة أقل من 7 ميجابايت');
  const t = new FileReader();
  t.onload = function (i) {
    const a = new window.Image();
    a.onload = function () {
      img = a;
      const o = Math.max(
        CANVAS_SIZE / img.width,
        CANVAS_SIZE / img.height
      );
      imgData.scale = o * 0.95;
      imgData.x = 0;
      imgData.y = 0;
      draw();
    };
    a.onerror = function () {
      alert('تعذر تحميل الصورة. جرب صورة أخرى.');
    };
    a.src = i.target.result;
  };
  t.readAsDataURL(e);
}

// Mouse drag to move image
canvasContainer.addEventListener('mousedown', e => {
  if (!img) return;
  isDragging = true;
  lastPointer = {
    x: e.offsetX * (canvas.width / canvas.offsetWidth),
    y: e.offsetY * (canvas.height / canvas.offsetHeight)
  };
  canvasContainer.style.cursor = 'grabbing';
});
window.addEventListener('mousemove', e => {
  if (!img || !isDragging) return;
  const t = canvas.getBoundingClientRect(),
    i = (e.clientX - t.left) * (canvas.width / t.width),
    a = (e.clientY - t.top) * (canvas.height / t.height);
  imgData.x += i - lastPointer.x;
  imgData.y += a - lastPointer.y;
  lastPointer = { x: i, y: a };
  draw();
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  canvasContainer.style.cursor = '';
});
let isDragging = false,
  lastPointer = { x: 0, y: 0 },
  lastDist = null;

function getTouchPos(e) {
  const t = canvas.getBoundingClientRect(),
    i =
      (e.touches && e.touches[0]) ||
      (e.changedTouches && e.changedTouches[0]);
  return i
    ? {
        x: (i.clientX - t.left) * (canvas.width / t.width),
        y: (i.clientY - t.top) * (canvas.height / t.height)
      }
    : { x: 0, y: 0 };
}
// Touch move and pinch to zoom
canvasContainer.addEventListener('touchstart', e => {
  if (!img) return;
  if (e.touches.length === 1) {
    isDragging = true;
    lastPointer = getTouchPos(e);
  } else if (e.touches.length === 2) {
    isDragging = false;
    lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
});
canvasContainer.addEventListener(
  'touchmove',
  e => {
    if (!img) return;
    if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      imgData.x += getTouchPos(e).x - lastPointer.x;
      imgData.y += getTouchPos(e).y - lastPointer.y;
      lastPointer = getTouchPos(e);
      draw();
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      imgData.scale *= d / lastDist;
      lastDist = d;
      draw();
    }
  },
  { passive: false }
);
canvasContainer.addEventListener('touchend', () => {
  isDragging = false;
  lastDist = null;
});

// Wheel zoom
canvasContainer.addEventListener(
  'wheel',
  e => {
    if (!img) return;
    e.preventDefault();
    const t = e.deltaY < 0 ? 1.07 : 0.93;
    imgData.scale *= t;
    draw();
  },
  { passive: false }
);

// Keyboard navigation
canvas.addEventListener('keydown', e => {
  if (!img) return;
  switch (e.key) {
    case 'ArrowUp':
      imgData.y -= 10;
      break;
    case 'ArrowDown':
      imgData.y += 10;
      break;
    case 'ArrowLeft':
      imgData.x -= 10;
      break;
    case 'ArrowRight':
      imgData.x += 10;
      break;
    case '+':
    case '=':
      imgData.scale *= 1.07;
      break;
    case '-':
    case '_':
      imgData.scale *= 0.93;
      break;
    default:
      return;
  }
  draw();
});

// Download
downloadBtn.addEventListener('click', async () => {
  if (!img) return;
  showLoading();
  try {
    let e = parseInt(qualitySelect.value) || 800;
    const t = document.createElement('canvas');
    t.width = e;
    t.height = e;
    const i = t.getContext('2d'),
      a = img.width * imgData.scale * (e / CANVAS_SIZE),
      o = img.height * imgData.scale * (e / CANVAS_SIZE);
    i.drawImage(
      img,
      imgData.x - a / 2 + e / 2,
      imgData.y - o / 2 + e / 2,
      a,
      o
    );
    const n = new window.Image();
    n.crossOrigin = 'anonymous';
    n.src = frameOverlay.src;
    n.onload = () => {
      try {
        i.globalAlpha = 1;
        i.drawImage(n, 0, 0, e, e);
        i.globalAlpha = 1;
        t.toBlob(blob => {
          try {
            const s = URL.createObjectURL(blob),
              r = document.createElement('a');
            r.href = s;
            r.download = 'graduation-frame.png';
            document.body.appendChild(r);
            r.click();
            document.body.removeChild(r);
            URL.revokeObjectURL(s);
          } catch (l) {
            alert('حدث خطأ أثناء تحميل الملف: ' + l.message);
          } finally {
            hideLoading();
          }
        }, 'image/png');
      } catch (s) {
        alert('حدث خطأ أثناء رسم الإطار: ' + s.message);
        hideLoading();
      }
    };
    n.onerror = () => {
      alert('تعذر تحميل صورة الإطار.');
      hideLoading();
    };
  } catch (s) {
    alert('حدث خطأ أثناء التصدير: ' + s.message);
    hideLoading();
  }
});

// Reset
resetBtn.addEventListener('click', () => {
  resetState();
  draw();
});

// Telegram Bot
telegramBtn.addEventListener('click', () => {
  window.open('https://t.me/Assiut61framebot', '_blank');
});

// Canvas focus style
canvas.addEventListener('focus', () => {
  canvasContainer.style.boxShadow = '0 0 0 3px var(--accent)';
});
canvas.addEventListener('blur', () => {
  canvasContainer.style.boxShadow = '';
});

// Quality change
qualitySelect.addEventListener('change', () => {
  CANVAS_SIZE = parseInt(qualitySelect.value) || 800;
  resizeCanvasToDisplay();
  draw();
});

// Drop zone for drag & drop
function showDropZone() {
  dropZone.style.display = 'flex';
}
function hideDropZone() {
  dropZone.style.display = 'none';
}
canvasContainer.addEventListener('dragover', e => {
  e.preventDefault();
  canvasContainer.classList.add('dragover');
  showDropZone();
});
canvasContainer.addEventListener('dragleave', e => {
  e.preventDefault();
  canvasContainer.classList.remove('dragover');
  hideDropZone();
});
canvasContainer.addEventListener('drop', e => {
  e.preventDefault();
  canvasContainer.classList.remove('dragover');
  hideDropZone();
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

// Share (Web Share API)
shareBtn.addEventListener('click', async () => {
  if (!img) return;
  showLoading();
  let e = parseInt(qualitySelect.value) || 800;
  const t = document.createElement('canvas');
  t.width = e;
  t.height = e;
  const i = t.getContext('2d'),
    a = img.width * imgData.scale * (e / CANVAS_SIZE),
    o = img.height * imgData.scale * (e / CANVAS_SIZE);
  i.drawImage(
    img,
    imgData.x - a / 2 + e / 2,
    imgData.y - o / 2 + e / 2,
    a,
    o
  );
  const n = new window.Image();
  n.crossOrigin = 'anonymous';
  n.src = frameOverlay.src;
  n.onload = () => {
    try {
      i.globalAlpha = 0.7;
      i.drawImage(n, 0, 0, e, e);
      i.globalAlpha = 1;
      t.toBlob(async blob => {
        try {
          const s = new File([blob], 'graduation-frame.png', {
            type: 'image/png'
          });
          if (
            navigator.share &&
            navigator.canShare({ files: [s] })
          ) {
            await navigator.share({
              files: [s],
              title: 'إطار التخرج',
              text: 'صورة تخرج دفعة 61 طب أسيوط'
            });
          } else {
            alert(
              'المشاركة غير مدعومة في متصفحك. يمكنك تحميل الصورة ثم مشاركتها يدوياً.'
            );
          }
        } catch (l) {
          alert('حدث خطأ أثناء المشاركة: ' + l.message);
        } finally {
          hideLoading();
        }
      }, 'image/png');
    } catch (s) {
      alert('حدث خطأ أثناء تجهيز المشاركة: ' + s.message);
      hideLoading();
    }
  };
  n.onerror = () => {
    alert('تعذر تحميل صورة الإطار.');
    hideLoading();
  };
});
