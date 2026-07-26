/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
  holder: {
    firstName: "Christian",
    lastName: "Rasmussen",
    nationality: "Danish",
    dob: "09 / 01 / 1992",
    pob: "N\u00F8rre Aaby",
    passportNumber: "RB7842916",
    issueDate: "12 / 06 / 2026",
    expiryDate: "Never"
  },
  pages: [
    { id: 'cover',   file: 'pages/cover.html' },
    { id: 'info',    file: 'pages/info.html' },
    { id: 'map',     file: 'pages/map.html' },
    { id: 'travels', file: 'pages/travels.html' },
    { id: 'lovestory', file: 'pages/lovestory.html' },
    { id: 'ending', file: 'pages/ending.html' }
  ]
};

/* ============================================================
   STATE
   ============================================================ */
const pages = CONFIG.pages.map(p => p.id);
const pageEls = pages.map(id => document.getElementById('page-' + id));
let currentPage = 0;
let isAnimating = false;

/* ============================================================
   DOM REFS
   ============================================================ */
const hint = document.getElementById('hint');
const zoneLeft = document.getElementById('zone-left');
const zoneRight = document.getElementById('zone-right');
const cornerRight = document.getElementById('corner-right');
const cornerLeft = document.getElementById('corner-left');
const flipShadowLeft = document.getElementById('flip-shadow-left');
const flipShadowRight = document.getElementById('flip-shadow-right');
const bookEl = document.getElementById('book');
const navBtns = document.querySelectorAll('.nav-btn');

/* ============================================================
   NAVIGATION
   ============================================================ */

/** Set z-indices so the correct pages are visible */
function setZIndices(){
  pageEls.forEach((el, i) => {
    if(i < currentPage){
      // Already-flipped pages go to the back
      el.style.zIndex = 0;
    } else {
      // Remaining pages: current page on top, then decreasing
      el.style.zIndex = pages.length - (i - currentPage);
    }
  });
}

function updateUI(){
  // Active class (pointer-events)
  pageEls.forEach((el, i) => {
    el.classList.toggle('active', i === currentPage);
  });

  // Flipped state: all pages before currentPage are flipped
  pageEls.forEach((el, i) => {
    el.classList.toggle('page-flipped', i < currentPage);
  });

  // Z-indices
  setZIndices();

  // Navbar active state
  navBtns.forEach((btn, i) => {
    btn.classList.toggle('active', i === currentPage);
  });

  // Corner curls visibility
  cornerRight.classList.toggle('visible', currentPage < pages.length - 1);
  cornerLeft.classList.toggle('visible', currentPage > 0);

  // Page stack layers
  const stackLayers = document.querySelectorAll('.page-stack-layer');
  stackLayers.forEach((layer, i) => {
    const remaining = pages.length - currentPage - 1;
    layer.style.opacity = Math.max(0, 0.1 + (remaining - i) * 0.15);
    layer.style.transform = `translate(${1 + (remaining - i) * 0.5}px, ${0.5 + (remaining - i) * 0.3}px)`;
  });
}

function goToPage(targetIndex){
  if(targetIndex === currentPage || isAnimating || targetIndex < 0 || targetIndex >= pages.length) return;
  isAnimating = true;

  const goingForward = targetIndex > currentPage;

  if(goingForward){
    // Flip pages from currentPage to targetIndex-1
    for(let i = currentPage; i < targetIndex; i++){
      const el = pageEls[i];
      el.style.zIndex = pages.length + 5 - (i - currentPage); // High z during flip
      el.classList.remove('active');
      el.classList.add('page-turning', 'page-flipped');
    }
    // Reveal destination page
    pageEls[targetIndex].classList.add('active');
    pageEls[targetIndex].style.zIndex = pages.length;

  } else {
    // Un-flip pages from targetIndex to currentPage-1
    pageEls[currentPage].classList.remove('active');
    for(let i = targetIndex; i < currentPage; i++){
      const el = pageEls[i];
      el.style.zIndex = pages.length + 5 - (i - targetIndex); // High z during un-flip
      el.classList.add('page-turning');
      el.classList.remove('page-flipped');
    }
    pageEls[targetIndex].classList.add('active');
  }

  setTimeout(() => {
    // Clean up animation classes
    pageEls.forEach(el => el.classList.remove('page-turning'));
    currentPage = targetIndex;
    updateUI();
    isAnimating = false;

    // Re-fit Leaflet map when map page becomes visible
    if(mapInstance && pages[currentPage] === 'map'){
      mapInstance.invalidateSize();
    }
  }, 500);
}

// Turn zones - click to navigate
zoneRight.addEventListener('click', () => goToPage(currentPage + 1));
zoneLeft.addEventListener('click', () => goToPage(currentPage - 1));

// Keyboard navigation
document.addEventListener('keydown', e => {
  if(e.key === 'ArrowRight' || e.key === 'ArrowDown') goToPage(currentPage + 1);
  if(e.key === 'ArrowLeft' || e.key === 'ArrowUp') goToPage(currentPage - 1);
});

// Navbar navigation
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = parseInt(btn.dataset.page);
    goToPage(target);
  });
});

/* ============================================================
   TOUCH / SWIPE SUPPORT
   ============================================================ */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

bookEl.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}, { passive: true });

bookEl.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dt = Date.now() - touchStartTime;

  if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 600){
    if(dx < 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
  }
}, { passive: true });

/* ============================================================
   DRAG INTERACTION
   ============================================================ */
let dragStartX = 0;
let isDragging = false;
let dragDirection = null;

bookEl.addEventListener('mousedown', e => {
  if (e.target.closest('input, button, a, textarea')) return;
  isDragging = true;
  dragStartX = e.clientX;
  const bookRect = bookEl.getBoundingClientRect();
  const relX = e.clientX - bookRect.left;
  dragDirection = relX > bookRect.width / 2 ? 'right' : 'left';
  e.preventDefault();
});

bookEl.addEventListener('mousemove', e => {
  if(!isDragging) return;
  const dx = e.clientX - dragStartX;
  const fromEl = pageEls[currentPage];
  if(dragDirection === 'right' && currentPage < pages.length - 1){
    fromEl.style.transform = `translateX(${Math.min(0, dx * 0.3)}px)`;
    fromEl.style.transition = 'none';
  } else if(dragDirection === 'left' && currentPage > 0){
    fromEl.style.transform = `translateX(${Math.max(0, dx * 0.3)}px)`;
    fromEl.style.transition = 'none';
  }
});

document.addEventListener('mouseup', e => {
  if(!isDragging) return;
  const dx = e.clientX - dragStartX;
  isDragging = false;
  dragDirection = null;

  // Reset drag transform
  pageEls.forEach(el => {
    el.style.transform = '';
    el.style.transition = '';
  });

  if(Math.abs(dx) > 60){
    if(dx < 0) goToPage(currentPage + 1);
    else goToPage(currentPage - 1);
  }
});

bookEl.addEventListener('mouseleave', () => {
  if(isDragging){
    isDragging = false;
    dragDirection = null;
    pageEls.forEach(el => {
      el.style.transform = '';
      el.style.transition = '';
    });
  }
});

/* ============================================================
   PAGE LOADING
   ============================================================ */
async function loadPages(){
  const promises = CONFIG.pages.map(async (page) => {
    const res = await fetch(page.file);
    const html = await res.text();
    const el = document.getElementById('page-' + page.id);
    el.innerHTML = html;
  });
  await Promise.all(promises);
  populateData();
  updateUI();
  initMap();
  initLoveStory();
}

/* ============================================================
   LOVE STORY LOCK
   ============================================================ */
function initLoveStory() {
  const submitBtn = document.getElementById('ls-submit');
  const input = document.getElementById('ls-password');
  const lockedView = document.getElementById('lovestory-locked');
  const unlockedView = document.getElementById('lovestory-unlocked');
  const errorMsg = document.getElementById('ls-error');

  if(submitBtn && input) {
    const checkPassword = () => {
      if(input.value === 'HabibiChristian') {
        lockedView.style.display = 'none';
        unlockedView.style.display = 'block';
        if(errorMsg) errorMsg.style.display = 'none';
      } else {
        if(errorMsg) errorMsg.style.display = 'block';
      }
    };
    submitBtn.addEventListener('click', checkPassword);
    input.addEventListener('keypress', (e) => {
      if(e.key === 'Enter') checkPassword();
    });
  }
}

/* ============================================================
   MAP INITIALIZATION
   ============================================================ */
let mapInstance = null;
function initMap() {
  const mapEl = document.getElementById('leaflet-map');
  if(!mapEl) return;
  
  // Initialize map
  mapInstance = L.map('leaflet-map', {
    center: [46.0, 15.0],
    zoom: 4,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false, // Prevent interfering with book swipe
    dragging: false // Prevent interfering with book swipe
  });

  // Add elegant light tiles
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(mapInstance);

  // Define locations
  const locations = [
    { name: "France", coords: [46.2276, 2.2137], code: "fr" },
    { name: "Barcelona", coords: [41.3851, 2.1734], code: "es" },
    { name: "Munich", coords: [48.1351, 11.5820], code: "de" },
    { name: "Rome", coords: [41.9028, 12.4964], code: "it" },
    { name: "Greece", coords: [39.0742, 21.8243], code: "gr" },
    { name: "Croatia", coords: [45.1000, 15.2000], code: "hr" },
    { name: "Malta", coords: [35.9375, 14.3754], code: "mt" },
    { name: "Austria", coords: [47.5162, 14.5501], code: "at" },
    { name: "Slovenia", coords: [46.1512, 14.9955], code: "si" },
    { name: "Slovakia", coords: [48.6690, 19.6990], code: "sk" },
    { name: "Istanbul", coords: [41.0082, 28.9784], code: "tr" },
    { name: "Tunisia", coords: [33.8869, 9.5375], code: "tn" },
    { name: "Indonesia", coords: [-0.7893, 113.9213], code: "id" }
  ];

  // Add markers
  locations.forEach(loc => {
    const icon = L.divIcon({
      className: 'custom-map-pin',
      html: `<div class="pin-marker">
               <img src="https://flagcdn.com/w40/${loc.code}.png" class="pin-flag-img">
             </div>`,
      iconSize: [28, 40],
      iconAnchor: [14, 40],
      popupAnchor: [0, -40]
    });

    L.marker(loc.coords, { icon: icon })
      .bindPopup(`<b>${loc.name}</b>`)
      .addTo(mapInstance);
  });

  // Home marker
  const homeIcon = L.divIcon({
    className: 'custom-map-pin home-pin',
    html: `<div class="pin-marker home">
             <img src="https://flagcdn.com/w40/dk.png" class="pin-flag-img">
             <div class="pin-home-badge">HOME</div>
           </div>`,
    iconSize: [36, 50],
    iconAnchor: [18, 50],
    popupAnchor: [0, -50]
  });
  L.marker([56.2639, 9.5018], { icon: homeIcon, zIndexOffset: 1000 })
    .bindPopup(`<b>Denmark (Home)</b>`)
    .addTo(mapInstance);

  // Fix map rendering when hidden
  setTimeout(() => mapInstance.invalidateSize(), 500);
}

/* ============================================================
   DATA POPULATION
   ============================================================ */
function populateData(){
  const h = CONFIG.holder;
  const el = (id) => document.getElementById(id);
  if(el('cover-name')) el('cover-name').textContent = h.firstName + ' ' + h.lastName;
  if(el('f-lastname')) el('f-lastname').textContent = h.lastName;
  if(el('f-firstname')) el('f-firstname').textContent = h.firstName;
  if(el('f-nat')) el('f-nat').textContent = h.nationality;
  if(el('f-dob')) el('f-dob').textContent = h.dob;
  if(el('f-pob')) el('f-pob').textContent = h.pob;
  if(el('f-num')) el('f-num').textContent = h.passportNumber;
  if(el('f-issue')) el('f-issue').textContent = h.issueDate;
  if(el('f-exp')) el('f-exp').textContent = h.expiryDate;
}

/* ============================================================
   GALLERY MODAL
   ============================================================ */
function initGallery() {
  const modal = document.getElementById('gallery-modal');
  const closeBtn = document.getElementById('gallery-close');
  const overlay = document.getElementById('gallery-overlay');
  const grid = document.getElementById('gallery-grid');
  const title = document.getElementById('gallery-title');
  const subtitle = document.getElementById('gallery-subtitle');
  
  if(!modal || !closeBtn || !overlay || !grid) return;

  function closeModal() {
    modal.classList.remove('active');
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);

  // We use event delegation on the document for clicks on destination cards
  document.addEventListener('click', (e) => {
    // Traverse up to find if a .trav-card was clicked
    let target = e.target;
    while(target && target !== document) {
      if(target.classList && target.classList.contains('trav-card')) {
        const placeName = target.querySelector('.trav-names b');
        const countryName = target.querySelector('.trav-names small');
        if(placeName) {
          const placeText = placeName.textContent.trim();
          const subText = countryName ? countryName.textContent.trim() : '';
          // Open gallery for any clicked destination
          openGallery(placeText, subText);
          return;
        }
      }
      target = target.parentNode;
    }
  });
  
  function openGallery(folderName, subText) {
    // Update header
    if(title) title.textContent = folderName;
    if(subtitle) subtitle.textContent = subText;
    
    // Populate the grid
    grid.innerHTML = '';
    // Loop up to a reasonable max number (e.g. 10).
    // If an image doesn't exist (like Denmark only having 3), the onerror handler removes it.
    for(let i=1; i<=10; i++) {
      const item = document.createElement('div');
      item.className = 'polaroid-item';
      
      const img = document.createElement('img');
      img.src = `images/${folderName}/${i}.jpg`;
      img.alt = `${folderName} Photo ${i}`;
      
      // If the image fails to load, remove the whole polaroid item
      img.onerror = function() {
        item.remove();
      };
      
      const caption = document.createElement('div');
      caption.className = 'polaroid-caption';
      caption.textContent = `Memory ${i}`;
      
      item.appendChild(img);
      item.appendChild(caption);
      
      grid.appendChild(item);
    }
    modal.classList.add('active');
  }
}

// Init
loadPages().then(() => {
  initGallery();
});
