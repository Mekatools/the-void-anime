/* ==========================================================================
   THE VOID ANIME // Manga Short Studio (Clean Translation & Page Summary)
   ========================================================================== */

const appState = {
  pages: [],
  activePageIndex: 0,
  fabricCanvas: null,
  shortsGuideActive: false,
  allDetectedDialogue: []
};

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const thumbnailList = document.getElementById('thumbnailList');
const pageCountLabel = document.getElementById('pageCount');
const stageContainer = document.getElementById('stageContainer');

// 1. Upload Handlers
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
      <div class="thumbnail-label"><span>PAGE ${String(index + 1).padStart(2, '0')}</span></div>
    `;
    card.addEventListener('click', () => selectPage(index));
    thumbnailList.appendChild(card);
  });
}

// 2. Editor Workspace
function selectPage(index) {
  if (index < 0 || index >= appState.pages.length) return;
  appState.activePageIndex = index;
  appState.allDetectedDialogue = []; // Reset dialogue for active page

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
            <option value="jpn_vert">🇯🇵 JAPANESE (VERTICAL)</option>
            <option value="kor">🇰🇷 KOREAN (MANHWA)</option>
            <option value="chi_sim">🇨🇳 CHINESE (MANHUA)</option>
          </select>

          <button class="btn-primary" id="btnDragTranslate">
            <i data-lucide="crop"></i> DRAG OVER BUBBLE
          </button>
          
          <button class="btn-secondary" id="btnAddBubble">
            <i data-lucide="plus-circle"></i> + BLANK TEXT
          </button>

          <!-- CLEAN: Page Summary Button -->
          <button class="btn-primary" id="btnOpenSummaryModal" style="background: #ffb800; color: #000;">
            <i data-lucide="book-open"></i> PAGE SUMMARY
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

      <!-- Banner -->
      <div class="scan-progress-banner" id="scanBanner">
        <i data-lucide="loader-2" class="spin"></i>
        <span id="scanStatus">Ready</span>
      </div>

      <!-- Canvas Area -->
      <div class="canvas-viewport" id="viewport">
        <div class="canvas-wrapper" id="canvasWrapper">
          <canvas id="mangaCanvas"></canvas>
          <div class="shorts-frame-overlay" id="shortsOverlay">
            <span class="shorts-badge">9:16 SHORTS SAFE ZONE</span>
          </div>
        </div>
      </div>

      <!-- Floating Bubble Inspector -->
      <div class="bubble-inspector" id="bubbleInspector">
        <input type="text" id="inspectorText" class="inspector-input" placeholder="Type dialogue...">
        <div class="toolbar-group">
          <label style="font-size:0.75rem; font-weight:800; color:var(--text-muted);">SIZE:</label>
          <input type="range" id="inspectorFontSize" min="16" max="72" value="24" style="cursor:pointer; width:90px;">
        </div>
        <button class="btn-action btn-danger" id="btnDeleteBubble">
          <i data-lucide="trash-2"></i>
        </button>
      </div>

      <!-- PURE PAGE SUMMARY MODAL -->
      <div id="summaryModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); z-index:9999; align-items:center; justify-content:center;">
        <div style="background:#12141a; border:2px solid #ffb800; border-radius:8px; max-width:600px; width:90%; padding:2rem; max-height:85vh; display:flex; flex-direction:column; gap:1.25rem; box-shadow:0 20px 50px rgba(0,0,0,0.8);">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #262a36; padding-bottom:0.75rem;">
            <h2 style="font-family:'Dela Gothic One', sans-serif; font-size:1.1rem; color:#ffb800; display:flex; align-items:center; gap:0.5rem;">
              <i data-lucide="book-open"></i> MANGA PAGE SUMMARY
            </h2>
            <button id="btnCloseModal" style="background:transparent; border:none; color:#8b92a5; font-size:1.5rem; cursor:pointer;">&times;</button>
          </div>
          
          <div id="summaryContent" style="flex:1; overflow-y:auto; font-family:'Plus Jakarta Sans', sans-serif; font-size:0.95rem; line-height:1.6; color:#f5f6fa; white-space:pre-wrap; background:#0a0b0e; padding:1.25rem; border-radius:4px; border:1px solid #262a36;">
            Analyzing dialogue to summarize this page...
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button class="btn-secondary" id="btnCopySummary">
              <i data-lucide="copy"></i> COPY SUMMARY
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
  setupCanvas(page.objectUrl);
  bindEditorButtons();
  bindSummaryModal();
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

// 3. Drag to Select Bubble Tool
function setupDragToTranslate() {
  const canvas = appState.fabricCanvas;
  let isSelecting = false;
  let selectionBox = null;
  let startX = 0, startY = 0;

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
      fill: 'rgba(255, 42, 75, 0.25)',
      stroke: '#ff2a4b',
      strokeWidth: 2,
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

// 4. Crop, OCR, Translate
async function processBubbleRegion(x, y, w, h) {
  const banner = document.getElementById('scanBanner');
  const status = document.getElementById('scanStatus');
  const selectedLang = document.getElementById('langSelector').value;

  banner.classList.add('active');
  status.textContent = "Reading Japanese bubble...";

  try {
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
      0, 0, cropCanvas.width, cropCanvas.
