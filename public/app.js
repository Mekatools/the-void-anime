/* ==========================================================================
   THE VOID ANIME // Manga Short Studio (Vertical OCR + Drag-to-Translate)
   ========================================================================== */

// Global State
const appState = {
  pages: [],
  activePageIndex: 0,
  fabricCanvas: null,
  shortsGuideActive: false,
  isDrawingBox: false,
  origX: 0,
  origY: 0,
  activeRect: null
};

// DOM References
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const thumbnailList = document.getElementById('thumbnailList');
const pageCountLabel = document.getElementById('pageCount');
const stageContainer = document.getElementById('stageContainer');

// --------------------------------------------------------------------------
// 1. Upload & State Handlers
// --------------------------------------------------------------------------
if (dropZone) {
  ['dragenter', 'dragover'].forEach(n => {
    dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(n => {
    dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
  });
  dropZone.addEventListener('drop', e => handleIncomingFiles(Array.from(e.dataTransfer.files)));
}

if (fileInput) {
  fileInput.addEventListener('change', e => handleIncomingFiles(Array.from(e.target.files)));
}

function handleIncomingFiles(files) {
  const images = files.filter(f => f.type.startsWith('image/'));
  if (!images.length) return alert('Please upload image files.');

  const remaining = 10 - appState.pages.length;
  if (remaining <= 0) return alert('Maximum 10 pages limit reached.');

  images.slice(0, remaining).forEach((file, idx) => {
    appState.pages.push({
      id: `p_${Date.now()}_${idx}`,
      name: file.name,
      file: file,
      objectUrl: URL.createObjectURL(file)
    });
  });

  renderThumbnails();
  if (appState.pages.length === images.length) selectPage(0);
}

function renderThumbnails() {
  if (!thumbnailList || !pageCountLabel) return;
  pageCountLabel.textContent = appState.pages.length;
  thumbnailList.innerHTML = '';

  appState.pages.forEach((page, index) => {
    const card = document.createElement('div');
    card.className = `thumbnail-card ${index === appState.activePageIndex ? 'active' : ''}`;
    card.innerHTML = `
      <img src="${page.objectUrl}" alt="Page ${index + 1}">
      <div class="thumbnail-label">
        <span>PAGE ${String(index + 1).padStart(2, '0')}</span>
      </div>
    `;
    card.addEventListener('click', () => selectPage(index));
    thumbnailList.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// 2. Editor Workspace
// --------------------------------------------------------------------------
function selectPage(index) {
  if (index < 0 || index >= appState.pages.length) return;
  appState.activePageIndex = index;

  const cards = thumbnailList.querySelectorAll('.thumbnail-card');
  cards.forEach((c, i) => c.classList.toggle('active', i === index));

  initEditorWorkspace(appState.pages[index]);
}

function initEditorWorkspace(page) {
  stageContainer.innerHTML = `
    <div class="editor-workspace">
      <!-- Toolbar -->
      <div class="editor-toolbar">
        <div class="toolbar-group">
          <select id="langSelector" class="btn-secondary" style="padding: 0.55rem 0.8rem; cursor: pointer;">
            <option value="jpn_vert">🇯🇵 JAPANESE (VERTICAL MANGA)</option>
            <option value="kor">🇰🇷 KOREAN (MANHWA)</option>
            <option value="chi_sim">🇨🇳 CHINESE (MANHUA)</option>
          </select>

          <button class="btn-primary" id="btnDragTranslate">
            <i data-lucide="crop"></i> DRAG OVER BUBBLE TO TRANSLATE
          </button>
          
          <button class="btn-secondary" id="btnAddBubble">
            <i data-lucide="plus-circle"></i> + BLANK BUBBLE
          </button>
        </div>

        <div class="toolbar-group">
          <button class="btn-action" id="btnToggleShorts">
            <i data-lucide="smartphone"></i> 9:16 SHORTS GUIDE
          </button>
          <button class="btn-primary" id="btnExport">
            <i data-lucide="download"></i> DOWNLOAD PNG
          </button>
        </div>
      </div>

      <!-- Notification Banner -->
      <div class="scan-progress-banner" id="scanBanner">
        <i data-lucide="loader-2" class="spin"></i>
        <span id="scanStatus">Ready</span>
      </div>

      <!-- Canvas Viewport -->
      <div class="canvas-viewport" id="viewport">
        <div class="canvas-wrapper" id="canvasWrapper">
          <canvas id="mangaCanvas"></canvas>
          <div class="shorts-frame-overlay" id="shortsOverlay">
            <span class="shorts-badge">9:16 SHORTS SAFE ZONE</span>
          </div>
        </div>
      </div>

      <!-- Bubble Inspector -->
      <div class="bubble-inspector" id="bubbleInspector">
        <input type="text" id="inspectorText" class="inspector-input" placeholder="Type dialogue...">
        <div class="toolbar-group">
          <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted);">SIZE:</label>
          <input type="range" id="inspectorFontSize" min="16" max="72" value="26" style="cursor:pointer; width:90px;">
        </div>
        <button class="btn-action btn-danger" id="btnDeleteBubble">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  setupCanvas(page.objectUrl);
  bindEditorButtons();
}

function setupCanvas(imageUrl) {
  const img = new Image();
  img.src = imageUrl;
  img.onload = () => {
    const maxWidth = Math.min(window.innerWidth - 320, 800);
    const scaleFactor = Math.min(1, maxWidth / img.width);
    
    const canvasWidth = img.width * scaleFactor;
    const canvasHeight = img.height * scaleFactor;

    if (appState.fabricCanvas) appState.fabricCanvas.dispose();

    const canvasElem = document.getElementById('mangaCanvas');
    appState.fabricCanvas = new fabric.Canvas(canvasElem, {
      width: canvasWidth,
      height: canvasHeight,
      selection: true
    });

    fabric.Image.fromURL(imageUrl, (fImg) => {
      fImg.set({
        scaleX: canvasWidth / fImg.width,
        scaleY: canvasHeight / fImg.height,
        selectable: false,
        evented: false
      });
      appState.fabricCanvas.setBackgroundImage(fImg, appState.fabricCanvas.renderAll.bind(appState.fabricCanvas));
    });

    setupObjectListeners();
    setupDragToTranslate();
  };
}

// --------------------------------------------------------------------------
// 3. Precision Drag-To-Translate Tool
// --------------------------------------------------------------------------
function setupDragToTranslate() {
  const canvas = appState.fabricCanvas;
  let isSelecting = false;
  let selectionBox = null;
  let startX = 0;
  let startY = 0;

  const dragBtn = document.getElementById('btnDragTranslate');

  let dragMode = false;
  dragBtn.onclick = () => {
    dragMode = !dragMode;
    dragBtn.classList.toggle('active', dragMode);
    canvas.defaultCursor = dragMode ? 'crosshair' : 'default';
    canvas.selection = !dragMode;
  };

  canvas.on('mouse:down', (o) => {
    if (!dragMode) return;
    isSelecting = true;
    const pointer = canvas.getPointer(o.e);
    startX = pointer.x;
    startY = pointer.y;

    selectionBox = new fabric.Rect({
      left: startX,
      top: startY,
      originX: 'left',
      originY: 'top',
      width: 0,
      height: 0,
      fill: 'rgba(255, 42, 75, 0.2)',
      stroke: '#ff2a4b',
      strokeWidth: 2,
      strokeDashArray: [4, 4],
      selectable: false
    });
    canvas.add(selectionBox);
  });

  canvas.on('mouse:move', (o) => {
    if (!isSelecting || !selectionBox) return;
    const pointer = canvas.getPointer(o.e);
    selectionBox.set({
      width: Math.abs(pointer.x - startX),
      height: Math.abs(pointer.y - startY),
      left: Math.min(startX, pointer.x),
      top: Math.min(startY, pointer.y)
    });
    canvas.renderAll();
  });

  canvas.on('mouse:up', async () => {
    if (!isSelecting || !selectionBox) return;
    isSelecting = false;

    const left = selectionBox.left;
    const top = selectionBox.top;
    const width = selectionBox.width;
    const height = selectionBox.height;

    canvas.remove(selectionBox);
    selectionBox = null;
    dragMode = false;
    dragBtn.classList.remove('active');
    canvas.defaultCursor = 'default';
    canvas.selection = true;

    if (width > 20 && height > 20) {
      await processBubbleRegion(left, top, width, height);
    }
  });
}

// --------------------------------------------------------------------------
// 4. Crop Specific Bubble Region, OCR & Translate
// --------------------------------------------------------------------------
async function processBubbleRegion(x, y, w, h) {
  const banner = document.getElementById('scanBanner');
  const status = document.getElementById('scanStatus');
  const selectedLang = document.getElementById('langSelector').value;

  banner.classList.add('active');
  status.textContent = "Reading speech bubble...";

  try {
    // 1. Crop the selected bubble area to a temporary offscreen canvas
    const activePage = appState.pages[appState.activePageIndex];
    const img = new Image();
    img.src = activePage.objectUrl;
    await img.decode();

    const canvas = appState.fabricCanvas;
    const scaleFactor = img.naturalWidth / canvas.width;

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w * scaleFactor;
    cropCanvas.height = h * scaleFactor;
    const ctx = cropCanvas.getContext('2d');

    ctx.drawImage(
      img,
      x * scaleFactor, y * scaleFactor, w * scaleFactor, h * scaleFactor,
      0, 0, cropCanvas.width, cropCanvas.height
    );

    const croppedBlob = await new Promise(r => cropCanvas.toBlob(r, 'image/png'));

    // 2. Run OCR strictly on the cropped bubble
    const ocrModel = selectedLang === 'jpn_vert' ? 'jpn_vert' : selectedLang;
    status.textContent = "Scanning characters...";

    const worker = await Tesseract.createWorker(ocrModel);
    const result = await worker.recognize(croppedBlob);
    await worker.terminate();

    const rawText = (result.data.text || '').replace(/\s+/g, '').trim();

    if (!rawText) {
      status.textContent = "Could not read text. Type dialogue manually.";
      addDialogueBubble(x + w / 2, y + h / 2, w, h, "TYPE HERE");
      setTimeout(() => banner.classList.remove('active'), 2500);
      return;
    }

    // 3. Send to Cloudflare Workers AI for translation
    status.textContent = `Translating: "${rawText}"...`;
    const englishText = await translateText(rawText, selectedLang === 'jpn_vert' ? 'jpn' : selectedLang);

    // 4. Put speech bubble exactly where the user drew the box!
    addDialogueBubble(x + w / 2, y + h / 2, w, h, englishText);

    status.textContent = "Done!";
    setTimeout(() => banner.classList.remove('active'), 1500);

  } catch (err) {
    console.error('Bubble process failed:', err);
    status.textContent = "Scan error. Add blank bubble.";
    setTimeout(() => banner.classList.remove('active'), 3000);
  }
}

// --------------------------------------------------------------------------
// 5. Cloudflare Translation API Helper
// --------------------------------------------------------------------------
async function translateText(rawText, sourceLang) {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText, sourceLang: sourceLang })
    });

    if (!response.ok) throw new Error('Translation endpoint failed');
    const data = await response.json();
    return data.translatedText || rawText;
  } catch (err) {
    console.warn('Translation fallback to raw text:', err);
    return rawText;
  }
}

// --------------------------------------------------------------------------
// 6. Speech Bubble Factory & Inspector
// --------------------------------------------------------------------------
function addDialogueBubble(x, y, width, height, text = "SPEECH HERE") {
  const canvas = appState.fabricCanvas;
  if (!canvas) return;

  const bubbleW = Math.max(width || 120, 90);
  const bubbleH = Math.max(height || 60, 45);

  const bgRect = new fabric.Rect({
    width: bubbleW,
    height: bubbleH,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    rx: 6,
    ry: 6,
    originX: 'center',
    originY: 'center'
  });

  const textBox = new fabric.Textbox(text.toUpperCase(), {
    width: bubbleW - 12,
    fontSize: 22,
    fontFamily: 'Bangers',
    fill: '#000000',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    splitByGrapheme: true
  });

  const group = new fabric.Group([bgRect, textBox], {
    left: x || canvas.width / 2,
    top: y || canvas.height / 2,
    originX: 'center',
    originY: 'center',
    isBubble: true
  });

  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.renderAll();
}

function setupObjectListeners() {
  const canvas = appState.fabricCanvas;
  const inspector = document.getElementById('bubbleInspector');
  const textInput = document.getElementById('inspectorText');
  const sizeInput = document.getElementById('inspectorFontSize');
  const deleteBtn = document.getElementById('btnDeleteBubble');

  canvas.on('selection:created', onSelect);
  canvas.on('selection:updated', onSelect);
  canvas.on('selection:cleared', () => {
    if (inspector) inspector.classList.remove('active');
  });

  function onSelect(e) {
    const obj = e.selected ? e.selected[0] : null;
    if (!obj || !obj.isBubble) {
      inspector.classList.remove('active');
      return;
    }

    inspector.classList.add('active');
    textInput.value = obj.item(1).text;
    sizeInput.value = obj.item(1).fontSize;
  }

  textInput.oninput = (e) => {
    const active = canvas.getActiveObject();
    if (active && active.isBubble) {
      active.item(1).set('text', e.target.value.toUpperCase());
      canvas.renderAll();
    }
  };

  sizeInput.oninput = (e) => {
    const active = canvas.getActiveObject();
    if (active && active.isBubble) {
      active.item(1).set('fontSize', parseInt(e.target.value, 10));
      canvas.renderAll();
    }
  };

  deleteBtn.onclick = () => {
    const active = canvas.getActiveObject();
    if (active) {
      canvas.remove(active);
      canvas.discardActiveObject();
      inspector.classList.remove('active');
      canvas.renderAll();
    }
  };
}

// --------------------------------------------------------------------------
// 7. Toolbar Actions
// --------------------------------------------------------------------------
function bindEditorButtons() {
  document.getElementById('btnAddBubble').onclick = () => {
    addDialogueBubble(null, null, 140, 70, "ENTER TEXT");
  };

  const btnShorts = document.getElementById('btnToggleShorts');
  const overlay = document.getElementById('shortsOverlay');
  btnShorts.onclick = () => {
    appState.shortsGuideActive = !appState.shortsGuideActive;
    btnShorts.classList.toggle('active', appState.shortsGuideActive);
    overlay.classList.toggle('active', appState.shortsGuideActive);
  };

  document.getElementById('btnExport').onclick = exportPageAsPng;
}

function exportPageAsPng() {
  const canvas = appState.fabricCanvas;
  if (!canvas) return;

  canvas.discardActiveObject();
  canvas.renderAll();

  const dataUrl = canvas.toDataURL({
    format: 'png',
    multiplier: 2
  });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `THE_VOID_PAGE_${appState.activePageIndex + 1}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
