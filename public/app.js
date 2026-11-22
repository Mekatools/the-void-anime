/* ==========================================================================
   THE VOID ANIME // Manga Short Studio Engine (Bulletproof OCR & Translation)
   ========================================================================== */

// Global State
const appState = {
  pages: [],
  activePageIndex: 0,
  fabricCanvas: null,
  shortsGuideActive: false
};

// DOM References
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const thumbnailList = document.getElementById('thumbnailList');
const pageCountLabel = document.getElementById('pageCount');
const stageContainer = document.getElementById('stageContainer');

// --------------------------------------------------------------------------
// 1. Drag & Drop and Upload Listeners
// --------------------------------------------------------------------------
if (dropZone) {
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleIncomingFiles(files);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleIncomingFiles(files);
  });
}

function handleIncomingFiles(files) {
  const images = files.filter(f => f.type.startsWith('image/'));
  if (!images.length) return alert('Please upload image files (PNG, JPG, WEBP).');

  const remaining = 10 - appState.pages.length;
  if (remaining <= 0) return alert('Maximum 10 pages limit reached.');

  const filesToAdd = images.slice(0, remaining);
  filesToAdd.forEach((file, idx) => {
    appState.pages.push({
      id: `page_${Date.now()}_${idx}`,
      name: file.name,
      file: file,
      objectUrl: URL.createObjectURL(file)
    });
  });

  renderThumbnails();
  if (appState.pages.length === filesToAdd.length) {
    selectPage(0);
  }
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
        <span>${page.name.length > 10 ? page.name.substring(0, 8) + '...' : page.name}</span>
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
          <!-- Language Selector -->
          <select id="langSelector" class="btn-secondary" style="padding: 0.55rem 0.8rem; cursor: pointer;">
            <option value="jpn">🇯🇵 JAPANESE (MANGA)</option>
            <option value="kor">🇰🇷 KOREAN (MANHWA)</option>
            <option value="chi_sim">🇨🇳 CHINESE (MANHUA)</option>
          </select>

          <button class="btn-primary" id="btnScanOcr">
            <i data-lucide="scan-text"></i> AUTO-TRANSLATE BUBBLES
          </button>
          <button class="btn-secondary" id="btnAddBubble">
            <i data-lucide="plus-circle"></i> + ADD BUBBLE
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

      <!-- Scanning & Translation Progress Banner -->
      <div class="scan-progress-banner" id="scanBanner">
        <i data-lucide="loader-2" class="spin"></i>
        <span id="scanStatus">Scanning dialogue...</span>
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
          <input type="range" id="inspectorFontSize" min="16" max="72" value="28" style="cursor:pointer; width:90px;">
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

    if (appState.fabricCanvas) {
      appState.fabricCanvas.dispose();
    }

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
  };
}

// --------------------------------------------------------------------------
// 3. Speech Bubble Inspector & Editing
// --------------------------------------------------------------------------
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
// 4. Bubble Creation Helper
// --------------------------------------------------------------------------
function addDialogueBubble(x, y, width, height, text = "SPEECH HERE") {
  const canvas = appState.fabricCanvas;
  if (!canvas) return;

  const bubbleW = Math.max(width || 130, 110);
  const bubbleH = Math.max(height || 65, 55);

  const bgRect = new fabric.Rect({
    width: bubbleW,
    height: bubbleH,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    rx: 8,
    ry: 8,
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
// 6. Robust OCR Scanning & Translation Pipeline
// --------------------------------------------------------------------------
async function runOcrScan() {
  const activePage = appState.pages[appState.activePageIndex];
  const banner = document.getElementById('scanBanner');
  const status = document.getElementById('scanStatus');
  const selectedLang = document.getElementById('langSelector').value;

  if (!activePage || !banner) return;
  banner.classList.add('active');
  
  const langNames = { jpn: 'Japanese', kor: 'Korean', chi_sim: 'Chinese' };
  status.textContent = `Loading ${langNames[selectedLang]} OCR model...`;

  try {
    // 1. Get original image natural dimensions reliably
    const imgMeasure = new Image();
    imgMeasure.src = activePage.objectUrl;
    await new Promise(res => {
      if (imgMeasure.complete) res();
      else imgMeasure.onload = res;
    });
    const naturalWidth = imgMeasure.naturalWidth || 800;

    // 2. Initialize Tesseract with a live progress logger
    const worker = await Tesseract.createWorker(selectedLang, 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          status.textContent = `Scanning ${langNames[selectedLang]}: ${Math.round((m.progress || 0) * 100)}%`;
        }
      }
    });

    status.textContent = `Detecting dialogue bubbles...`;
    const result = await worker.recognize(activePage.file);
    await worker.terminate();

    const canvas = appState.fabricCanvas;
    const scaleFactor = canvas.width / naturalWidth;

    // 3. Find detected text blocks (or fallback to lines)
    let textItems = (result.data.blocks || []).filter(b => b.text && b.text.trim().length > 1);
    if (!textItems.length && result.data.lines) {
      textItems = result.data.lines.filter(l => l.text && l.text.trim().length > 1);
    }

    if (!textItems.length) {
      status.textContent = "No text found. Use '+ ADD BUBBLE' manually.";
      setTimeout(() => banner.classList.remove('active'), 2500);
      return;
    }

    // 4. Translate & overlay each detected bubble
    for (let i = 0; i < textItems.length; i++) {
      const item = textItems[i];
      const cleanOriginal = item.text.trim();
      
      status.textContent = `Translating bubble ${i + 1} of ${textItems.length}...`;
      const englishText = await translateText(cleanOriginal, selectedLang);

      const bbox = item.bbox;
      const x = ((bbox.x0 + bbox.x1) / 2) * scaleFactor;
      const y = ((bbox.y0 + bbox.y1) / 2) * scaleFactor;
      const w = (bbox.x1 - bbox.x0) * scaleFactor;
      const h = (bbox.y1 - bbox.y0) * scaleFactor;

      addDialogueBubble(x, y, w + 16, h + 16, englishText);
    }

    status.textContent = `Done! Translated ${textItems.length} bubbles.`;
    setTimeout(() => banner.classList.remove('active'), 2000);
  } catch (err) {
    console.error('OCR Error Details:', err);
    status.textContent = "Scan error. Use '+ ADD BUBBLE' manually.";
    setTimeout(() => banner.classList.remove('active'), 3000);
  }
}

// --------------------------------------------------------------------------
// 7. Toolbar Actions (9:16 Shorts Toggle & PNG Export)
// --------------------------------------------------------------------------
function bindEditorButtons() {
  document.getElementById('btnScanOcr').onclick = runOcrScan;
  
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
