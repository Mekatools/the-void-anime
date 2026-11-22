/* ==========================================================================
   THE VOID ANIME // Core Application Engine (Zero Storage, In-Memory)
   ========================================================================== */

// Application State (Kept strictly in browser RAM)
const appState = {
  pages: [],       // Array of { id, name, file, objectUrl }
  activePageIndex: 0
};

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const thumbnailList = document.getElementById('thumbnailList');
const pageCountLabel = document.getElementById('pageCount');
const stageContainer = document.getElementById('stageContainer');

// --------------------------------------------------------------------------
// Drag and Drop Event Listeners with GSAP Feedback
// --------------------------------------------------------------------------
if (dropZone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
      gsap.to(dropZone, { scale: 1.02, duration: 0.2, ease: 'power2.out' });
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
      gsap.to(dropZone, { scale: 1, duration: 0.2, ease: 'power2.out' });
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

// --------------------------------------------------------------------------
// File Ingestion & Memory Management
// --------------------------------------------------------------------------
function handleIncomingFiles(files) {
  const imageFiles = files.filter(file => file.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    alert('Please select valid image files (PNG, JPG, WEBP).');
    return;
  }

  // Cap at 10 pages total
  const remainingSlots = 10 - appState.pages.length;
  if (remainingSlots <= 0) {
    alert('Maximum limit reached: You can load up to 10 pages at a time.');
    return;
  }

  const filesToAdd = imageFiles.slice(0, remainingSlots);

  filesToAdd.forEach((file, index) => {
    // createObjectURL creates an in-memory browser reference without storing anything on a server
    const memoryUrl = URL.createObjectURL(file);
    appState.pages.push({
      id: 'page_' + Date.now() + '_' + index,
      name: file.name,
      file: file,
      objectUrl: memoryUrl
    });
  });

  renderThumbnails();
  
  // Set the first uploaded page as active if this is the first batch
  if (appState.pages.length === filesToAdd.length) {
    selectPage(0);
  }
}

// --------------------------------------------------------------------------
// Sidebar Thumbnail Rendering
// --------------------------------------------------------------------------
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
        <span>${page.name.length > 12 ? page.name.substring(0, 9) + '...' : page.name}</span>
      </div>
    `;

    card.addEventListener('click', () => selectPage(index));
    thumbnailList.appendChild(card);
  });

  // Re-run Lucide icons in case any were added
  if (window.lucide) lucide.createIcons();
}

// --------------------------------------------------------------------------
// Page Switcher
// --------------------------------------------------------------------------
function selectPage(index) {
  if (index < 0 || index >= appState.pages.length) return;
  appState.activePageIndex = index;

  // Highlight active thumbnail
  const cards = thumbnailList.querySelectorAll('.thumbnail-card');
  cards.forEach((card, idx) => {
    card.classList.toggle('active', idx === index);
  });

  // Switch workspace view from dropzone to active preview
  const activePage = appState.pages[index];
  displayActivePage(activePage);
}

function displayActivePage(page) {
  stageContainer.innerHTML = `
    <div class="active-page-preview" style="text-align: center; max-width: 90%; max-height: 90%;">
      <img src="${page.objectUrl}" alt="${page.name}" style="max-height: 75vh; max-width: 100%; border: 2px solid var(--border-subtle); border-radius: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="margin-top: 1rem; display: flex; gap: 1rem; justify-content: center;">
        <button class="btn-primary" id="btnStartOcr">
          <i data-lucide="scan"></i> DETECT SPEECH BUBBLES
        </button>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  gsap.from('.active-page-preview', { opacity: 0, y: 15, duration: 0.3, ease: 'power2.out' });
}
