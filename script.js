// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, push, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

let currentPackageResi = null; // Track current package resi for door unlock

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUNxHKkWEc-HQG6ibe8kEtaRFc1eRmRFQ",
  authDomain: "paxibox.firebaseapp.com",
  databaseURL: "https://paxibox-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "paxibox",
  storageBucket: "paxibox.firebasestorage.app",
  messagingSenderId: "994249307432",
  appId: "1:994249307432:web:2cf693e9bddc7f9c9ccc1d",
  measurementId: "G-ZBS33VQ541"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

// Elements
const form = document.getElementById('serialForm');
const serialInput = document.getElementById('serialNumber');
const submitBtn = document.getElementById('submitBtn');
const messageDiv = document.getElementById('message');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const checkBtn = document.getElementById('checkBtn');
const topbar = document.getElementById('topbar');
const backToLandingBtn = document.getElementById('backToLanding');
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-btn');
const targetButtons = document.querySelectorAll('[data-target]');
const capacityBar = document.querySelector('[data-capacity-bar]');
const capacityFill = document.querySelector('[data-capacity-fill]');
const capacityValue = document.querySelector('[data-capacity-value]');
const capacityPill = document.querySelector('[data-pill-state]');
const weightValue = document.querySelector('[data-weight-value]');
const weightStatus = document.querySelector('[data-weight-status]');
const lastMotionEl = document.querySelector('[data-last-motion]');
const doorStatusEls = document.querySelectorAll('[data-door-status]');
const vibrationLatestEl = document.querySelector('[data-vibration-latest]');
const vibrationMaxEl = document.querySelector('[data-vibration-max]');
const packagesList = document.getElementById('packagesList');
const addPackageForm = document.getElementById('addPackageForm');
const addPkgMessage = document.getElementById('addPkgMessage');
const pkgTitle = document.getElementById('pkgTitle');
const pkgStatus = document.getElementById('pkgStatus');
const pkgTracking = document.getElementById('pkgTracking');
const toastStack = document.getElementById('toastStack');
const packageModal = document.getElementById('packageModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalStatus = document.getElementById('modalStatus');
const modalSerial = document.getElementById('modalSerial');
const modalTracking = document.getElementById('modalTracking');
const modalArrived = document.getElementById('modalArrived');
const modalHero = document.getElementById('modalHero');
const modalGallery = document.getElementById('modalGallery');
const pinModal = document.getElementById('pinModal');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');
const pinCancel = document.getElementById('pinCancel');
const pinClose = document.getElementById('pinClose');
const pinConfirm = document.getElementById('pinConfirm');
const openSmartboxBtn = document.getElementById('openSmartboxBtn');

// Mock dashboard data
const dashboardData = {
  capacity: 0,
  weightKg: 0,
  maxWeight: 25, // safe default, updated as needed
  lastMotion: 'No motion yet',
  doors: {
    front: 'Locked',
    rear: 'Locked'
  },
  vibration: {
    latest: '0.00 g',
    maxToday: '0.00 g'
  }
};

let packagesData = [];
const PACKAGES_PATH = '/paxibox/packages';
const SYSTEM_PATH = '/paxibox/system';
const defaultPackageImage = "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=800&q=80";

// Navigation
function showPage(target, options = {}) {
  const { skipScroll = false } = options;

  pages.forEach((page) => page.classList.toggle('active', page.id === target));

  navButtons.forEach((btn) => {
    const isActive = btn.dataset.target === target;
    btn.classList.toggle('active', isActive);
  });

  if (target === 'landing') {
    topbar.classList.add('topbar--hidden');
  } else {
    topbar.classList.remove('topbar--hidden');
  }

  if (backToLandingBtn) {
    backToLandingBtn.hidden = target === 'landing';
  }

  if (!skipScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

targetButtons.forEach((btn) => {
  if (btn === checkBtn) return;
  btn.addEventListener('click', () => showPage(btn.dataset.target));
});

// Dashboard rendering
function getState(value) {
  if (value >= 90) return 'danger';
  if (value >= 75) return 'warning';
  return 'safe';
}

function hydrateDashboard() {
  const { capacity, weightKg, maxWeight, lastMotion, doors, vibration } = dashboardData;
  const state = getState(capacity);

  if (capacityBar && capacityFill) {
    const clamped = Math.min(100, Math.max(0, capacity));
    capacityFill.style.height = `${clamped}%`;
    capacityBar.dataset.state = state;
    
    // Update weight display inside capacity bar (only show if fill is tall enough)
    const capacityWeightEl = document.querySelector('[data-capacity-weight]');
    if (capacityWeightEl) {
      const safeWeight = (Number.isFinite(weightKg) && weightKg >= 0) ? weightKg : 0;
      capacityWeightEl.textContent = `${safeWeight.toFixed(1)} kg`;
      // Show weight only if fill height is at least 15% for readability
      capacityWeightEl.style.opacity = clamped >= 15 ? '1' : '0';
    }
  }

  if (capacityValue) {
    const safeVal = Number.isFinite(capacity) ? capacity : 0;
    capacityValue.textContent = `${safeVal}%`;
  }

  if (capacityPill) {
    const label = state === 'danger' ? 'Full' : state === 'warning' ? 'Almost Full' : 'Safe';
    capacityPill.textContent = label;
    capacityPill.dataset.state = state;
  }

  if (weightValue) {
    const displayWeight = (Number.isFinite(weightKg) && weightKg >= 0) ? weightKg : 0;
    weightValue.textContent = `${displayWeight.toFixed(1)} kg`;
  }

  if (weightStatus) {
    const utilization = Math.min(100, Math.round((weightKg / maxWeight) * 100));
    const weightState = getState(utilization);
    const weightLabel = weightState === 'danger' ? 'Over limit' : weightState === 'warning' ? 'Close to limit' : 'Within limit';
    weightStatus.textContent = `${weightLabel} • ${utilization}% of ${maxWeight} kg`;
    weightStatus.dataset.state = weightState;
  }

  if (lastMotionEl) {
    lastMotionEl.textContent = lastMotion || 'No motion yet';
  }

  if (doorStatusEls && doorStatusEls.length) {
    doorStatusEls.forEach((el) => {
      const key = el.dataset.doorStatus;
      const value = doors && key in doors ? doors[key] : 'Locked';
      el.textContent = value;
      el.dataset.state = value.toLowerCase() === 'locked' ? 'safe' : 'warning';
    });
  }

  if (vibrationLatestEl && vibration) {
    vibrationLatestEl.textContent = vibration.latest || '0.00 g';
  }

  if (vibrationMaxEl && vibration) {
    vibrationMaxEl.textContent = `Highest today: ${vibration.maxToday || '0.00 g'}`;
  }
}

function renderPackages() {
  if (!packagesList) return;
  packagesList.innerHTML = '';

  if (!packagesData.length) {
    const empty = document.createElement('div');
    empty.className = 'card subtle empty-state';
    empty.innerHTML = `
      <h3>No packages yet</h3>
      <p class="card-subtitle">Packages will appear here once added.</p>
    `;
    packagesList.appendChild(empty);
    return;
  }

  packagesData.forEach((pkg) => {
    const card = document.createElement('article');
    card.className = 'package-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="package-image" style="background-image: url('${pkg.image || defaultPackageImage}');"></div>
      <div class="package-body">
        <div class="package-top">
          <h3>${pkg.title || 'Package'}</h3>
          <span class="pill subtle">Tap for details</span>
        </div>
        <p class="package-status">${pkg.status || '—'}</p>
        <p class="package-meta">Serial: <strong>${pkg.tracking || pkg.serialNumber || '—'}</strong></p>
      </div>
    `;

    card.addEventListener('click', () => openPackageModal(pkg));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPackageModal(pkg);
      }
    });

    packagesList.appendChild(card);
  });
}

function openPackageModal(pkg) {
  if (!packageModal || !modalTitle || !modalStatus || !modalSerial || !modalTracking || !modalArrived || !modalHero || !modalGallery) {
    showToast('Unavailable', 'Cannot open package details right now.', 'error');
    return;
  }

  modalTitle.textContent = pkg.title;
  modalStatus.textContent = pkg.status;
  modalSerial.textContent = pkg.serialNumber || pkg.tracking || '—';
  modalTracking.textContent = pkg.serialNumber || pkg.tracking || '—';
  modalArrived.textContent = pkg.arrivedAt || '—';
  modalHero.style.backgroundImage = `url('${pkg.image || defaultPackageImage}')`;

  modalGallery.innerHTML = '';
  (pkg.courierPhotos || []).slice(0, 3).forEach((src) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${pkg.title} courier photo`;
    modalGallery.appendChild(img);
  });

  packageModal.classList.add('active');
  packageModal.setAttribute('aria-hidden', 'false');
}

function normalizePackages(raw) {
  if (!raw || typeof raw !== 'object') return [];

  return Object.entries(raw)
    .map(([key, value]) => {
      const v = value || {};
      // Build photo list from saved Firebase images or legacy courierPhotos
      let photos = [];

      // New structure from ESP32-CAM: images/image1 = { data: <base64>, timestamp }
      if (v.images && typeof v.images === 'object') {
        photos = Object.values(v.images)
          .map((img) => {
            if (!img) return null;
            if (typeof img === 'string') {
              // Already a URL or data URI
              return img;
            }
            if (img.data) {
              return `data:image/jpeg;base64,${img.data}`;
            }
            return null;
          })
          .filter(Boolean);
      } else if (Array.isArray(v.courierPhotos)) {
        // Legacy array of URLs
        photos = v.courierPhotos;
      } else if (v.courierPhotos && typeof v.courierPhotos === 'object') {
        // Legacy object of URLs
        photos = Object.values(v.courierPhotos).filter(Boolean);
      }

      return {
        id: key,
        title: v.name || v.title || 'Package',
        status: v.status || '—',
        tracking: v.tracking || v.serialNumber || key,
        serialNumber: v.serialNumber || v.tracking || key,
        arrivedAt: v.arrivedAt || v.deliveredAt || v.completedAt || v.arrived || '—',
        // Use first saved image as the hero if available
        image: (photos && photos.length ? photos[0] : v.image) || defaultPackageImage,
        courierPhotos: photos,
        createdAt: v.createdAt || 0,
        fullnessPercent: typeof v.fullness_percent === 'number' ? v.fullness_percent : null,
        weight_g: typeof v.weight_g === 'number' ? v.weight_g : null
      };
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function startPackagesListener() {
  const packagesRef = ref(database, PACKAGES_PATH);

  console.log('Starting packages listener on:', PACKAGES_PATH);

  onValue(
    packagesRef,
    (snapshot) => {
      console.log('Packages data received:', snapshot.exists() ? 'exists' : 'empty');
      const raw = snapshot.exists() ? snapshot.val() : null;
      packagesData = normalizePackages(raw);
      console.log('Normalized packages count:', packagesData.length);
      renderPackages();

      // Update dashboard metrics from the most recent package (only if system values aren't available)
      // Note: Weight and capacity now come from /paxibox/system, not packages
      // This is kept as fallback for capacity if system.capacity is not set
      const latest = packagesData[0];
      if (latest) {
        console.log('Latest package:', latest.serialNumber, 'fullness:', latest.fullnessPercent, 'weight:', latest.weight_g);
        // Only update capacity from package if system.capacity hasn't been set yet
        if (typeof dashboardData.capacity === 'undefined' || dashboardData.capacity === 0) {
          dashboardData.capacity = typeof latest.fullnessPercent === 'number' ? latest.fullnessPercent : 0;
        }
        // Weight is now read from system.weight_g, not from packages
      } else {
        console.log('No packages found, using default dashboard values');
        // Don't reset capacity/weight here - let system listener handle it
      }
      hydrateDashboard();
    },
    (error) => {
      console.error('Failed to load packages', error);
      showToast('Packages unavailable', 'Could not load packages right now.', 'error');
    }
  );
}

// PIN verification modal
let expectedPinCache = null;
let nextPageAfterPin = 'dashboard';

async function fetchExpectedPin() {
  if (expectedPinCache) return expectedPinCache;

  const pinRef = ref(database, '/paxibox/pin');
  const snapshot = await get(pinRef);

  if (!snapshot.exists()) {
    throw new Error('PIN not configured');
  }

  const value = snapshot.val();
  const resolvedPin = (value && typeof value === 'object' && 'pin' in value)
    ? value.pin
    : value;

  if (resolvedPin === undefined || resolvedPin === null || resolvedPin === '') {
    throw new Error('PIN missing');
  }

  expectedPinCache = String(resolvedPin);
  return expectedPinCache;
}

function openPinPrompt(targetPage = 'dashboard') {
  nextPageAfterPin = targetPage || 'dashboard';

  if (!pinModal || !pinInput) {
    showToast('Unavailable', 'Cannot open PIN prompt right now.', 'error');
    return;
  }

  pinModal.classList.add('active');
  pinModal.setAttribute('aria-hidden', 'false');
  pinInput.value = '';
  hidePinError();
  setPinLoading(false);

  setTimeout(() => pinInput.focus(), 80);
}

function closePinPrompt() {
  if (!pinModal) return;
  pinModal.classList.remove('active');
  pinModal.setAttribute('aria-hidden', 'true');
  if (pinForm) pinForm.reset();
  hidePinError();
  setPinLoading(false);
}

function showPinError(text) {
  if (!pinError) return;
  pinError.textContent = text;
  pinError.style.display = 'block';
}

function hidePinError() {
  if (!pinError) return;
  pinError.textContent = '';
  pinError.style.display = 'none';
}

function setPinLoading(loading) {
  if (pinConfirm) pinConfirm.disabled = loading;
  if (pinCancel) pinCancel.disabled = loading;
  if (pinInput) pinInput.disabled = loading;
}

function closePackageModal() {
  if (!packageModal) return;
  packageModal.classList.remove('active');
  packageModal.setAttribute('aria-hidden', 'true');
}

function showToast(title, message, type = 'info') {
  if (!toastStack) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.dataset.type = type;
  toast.innerHTML = `
    <h4>${title}</h4>
    <p>${message}</p>
  `;

  toastStack.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

function setOpenSmartboxLoading(loading) {
  if (!openSmartboxBtn) return;
  openSmartboxBtn.disabled = loading;
  openSmartboxBtn.textContent = loading ? 'Opening...' : 'Open Smartbox';
}

async function handleOpenSmartbox() {
  if (!openSmartboxBtn) return;

  setOpenSmartboxLoading(true);

  try {
    // Get PIN from Firebase
    let pin = null;
    try {
      const pinRef = ref(database, '/paxibox/pin');
      const pinSnapshot = await get(pinRef);
      if (pinSnapshot.exists()) {
        const pinValue = pinSnapshot.val();
        pin = (pinValue && typeof pinValue === 'object' && 'pin' in pinValue) ? pinValue.pin : pinValue;
      }
    } catch (err) {
      console.warn('Could not fetch PIN:', err);
    }

    // Get current package resi from system/currentPackage or latest package
    let resi = currentPackageResi;
    if (!resi) {
      try {
        const currentPkgRef = ref(database, '/paxibox/system/currentPackage');
        const currentPkgSnapshot = await get(currentPkgRef);
        if (currentPkgSnapshot.exists()) {
          resi = currentPkgSnapshot.val();
        }
      } catch (err) {
        console.warn('Could not fetch current package:', err);
      }
    }

    // Fallback to latest package if no current package
    if (!resi && packagesData.length > 0) {
      const latest = packagesData.find(p => p.status === 'delivered' || p.status === 'in_progress');
      if (latest) {
        resi = latest.serialNumber || latest.tracking;
      }
    }

    if (!resi) {
      showToast('No package found', 'Please ensure a package is active or delivered.', 'error');
      return;
    }

    // Write unlock request to Firebase (bridge will forward to MQTT)
    const cmdRef = ref(database, '/paxibox/system/userOpenRequest');
    await set(cmdRef, {
      resi: resi,
      pin: pin || '',
      requestedAt: Date.now()
    });
    
    console.log('User unlock request written to Firebase:', { resi, pin });
    showToast('Opening smartbox', 'Door unlock request sent.', 'success');
  } catch (err) {
    console.error('Failed to open smartbox', err);
    showToast('Open failed', 'Could not open the smartbox right now.', 'error');
  } finally {
    setOpenSmartboxLoading(false);
  }
}

function setAddPackageLoading(loading) {
  if (!addPackageForm) return;
  addPackageForm.querySelectorAll('input, button').forEach((el) => {
    el.disabled = loading;
  });
}

async function addPackageCard(evt) {
  evt.preventDefault();

  const title = pkgTitle.value.trim();
  const status = pkgStatus.value.trim();
  const tracking = pkgTracking.value.trim();

  if (!title || !status || !tracking) {
    if (addPkgMessage) {
      addPkgMessage.textContent = 'Please fill out title, status, and tracking.';
      addPkgMessage.className = 'message error';
      addPkgMessage.style.display = 'block';
    }
    showToast('Missing info', 'Fill title, status, and tracking.', 'error');
    return;
  }

  setAddPackageLoading(true);

  try {
    // Use the serial number as the package ID so it matches the ESP32 "resi"
    const id = tracking.trim();
    const pkgRef = ref(database, `${PACKAGES_PATH}/${id}`);

    await set(pkgRef, {
      name: title,
      serialNumber: tracking,
      tracking,
      status: status || 'pending',
      createdAt: Date.now(),
      createdAt: Date.now()
    });

    addPackageForm.reset();
    showPage('packages');

    if (addPkgMessage) {
      addPkgMessage.textContent = 'Package added and saved.';
      addPkgMessage.className = 'message success';
      addPkgMessage.style.display = 'block';
      setTimeout(() => addPkgMessage.style.display = 'none', 2000);
    }
    showToast('Package added', `${title} was added and saved.`, 'success');
  } catch (err) {
    console.error('Failed to save package', err);
    if (addPkgMessage) {
      addPkgMessage.textContent = 'Could not save package. Please try again.';
      addPkgMessage.className = 'message error';
      addPkgMessage.style.display = 'block';
    }
    showToast('Save failed', 'Could not save package to database.', 'error');
  } finally {
    setAddPackageLoading(false);
  }
}

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const serialNumber = serialInput.value.trim();

  if (!serialNumber) {
    showMessage('Please enter a serial number', 'error');
    showToast('Form error', 'Please enter a serial number', 'error');
    return;
  }

  setLoadingState(true);
  hideMessage();

  try {
    const foundPkg = await findPackageBySerial(serialNumber);

    if (foundPkg) {
      showMessage('Package found. Opening details…', 'success');
      showToast('Package found', 'Opening package details.', 'success');
      form.reset();
      showPage('packages');
      openPackageModal(foundPkg);
    } else {
      showMessage('No package found with that serial number. Please check again.', 'error');
      showToast('Access denied', 'Serial number not found in your packages.', 'error');
    }

    setTimeout(() => hideMessage(), 3200);
  } catch (error) {
    console.error('Error saving serial number:', error);
    showMessage('Error saving serial number. Please try again.', 'error');
    showToast('Save failed', 'Error saving serial number', 'error');
  } finally {
    setLoadingState(false);
  }
});

function setLoadingState(loading) {
  submitBtn.disabled = loading;
  serialInput.disabled = loading;

  if (loading) {
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
  } else {
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
  }
}

function showMessage(text, type) {
  messageDiv.textContent = text;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = 'block';
}

function hideMessage() {
  messageDiv.style.display = 'none';
  messageDiv.className = 'message';
}

async function findPackageBySerial(serialNumber) {
  const normalized = serialNumber.trim().toUpperCase();
  if (!normalized) return null;

  // Quick check against the locally cached list
  const localMatch = packagesData.find(
    (pkg) => (pkg.serialNumber || pkg.tracking || '').toUpperCase() === normalized
  );
  if (localMatch) return localMatch;

  // Fallback: fetch a fresh snapshot from the database
  const packagesRef = ref(database, PACKAGES_PATH);
  const snapshot = await get(packagesRef);
  if (!snapshot.exists()) return null;

  const raw = snapshot.val() || {};
  const normalizedList = normalizePackages(raw);
  return normalizedList.find(
    (pkg) => (pkg.serialNumber || pkg.tracking || '').toUpperCase() === normalized
  ) || null;
}

// Listen to /paxibox/system for live dashboard state (doors, last update, etc.)
function startSystemListener() {
  const systemRef = ref(database, SYSTEM_PATH);

  console.log('Starting system listener on:', SYSTEM_PATH);

  onValue(
    systemRef,
    (snapshot) => {
      console.log('System data received:', snapshot.exists() ? 'exists' : 'empty');
      const v = snapshot.exists() ? snapshot.val() || {} : {};
      console.log('System values:', {
        courierActive: v.courierActive,
        userActive: v.userActive,
        currentPackage: v.currentPackage,
        lastUpdate: v.lastUpdate,
        capacity: v.capacity,
        weight_g: v.weight_g
      });

      // Doors: map courierActive/userActive to front/rear door states
      const courierActive = !!v.courierActive;
      const userActive = !!v.userActive;
      dashboardData.doors.front = courierActive ? 'Unlocked' : 'Locked';
      dashboardData.doors.rear = userActive ? 'Unlocked' : 'Locked';
      console.log('Door states updated - Front:', dashboardData.doors.front, 'Rear:', dashboardData.doors.rear);

      // Capacity from system (mirrored from MQTT fullness_percent)
      if (typeof v.capacity === 'number') {
        dashboardData.capacity = v.capacity;
        console.log('Capacity updated from system.capacity to:', dashboardData.capacity);
      }

      // Total box weight from system (mirrored from MQTT weight_g, in grams)
      if (typeof v.weight_g === 'number' && v.weight_g >= 0) {
        dashboardData.weightKg = v.weight_g / 1000;  // Convert grams to kg for display
        console.log('Weight updated from system.weight_g to:', dashboardData.weightKg, 'kg');
      } else {
        // Reset to 0 if weight_g is missing or negative
        dashboardData.weightKg = 0;
      }

      // Vibration data from system (ESP32-S3 sends 0/1, format for display)
      if (typeof v.vibration === 'number') {
        // Format vibration state as "X.XX g" for display
        // If vibration = 1, show detected; if 0, show normal
        dashboardData.vibration.latest = v.vibration === 1 ? 'Detected' : 'Normal';
        // For maxToday, we could track max value, but for now just show current state
        dashboardData.vibration.maxToday = dashboardData.vibration.latest;
        console.log('Vibration updated from system.vibration to:', dashboardData.vibration.latest);
      }

      // Track current package resi for door unlock
      if (v.currentPackage && typeof v.currentPackage === 'string') {
        currentPackageResi = v.currentPackage;
        console.log('Current package resi set to:', currentPackageResi);
      }

      // Last motion/update based on lastUpdate timestamp (millis from ESP32)
      if (typeof v.lastUpdate === 'number') {
        const ts = v.lastUpdate;
        // Display raw timestamp or relative
        const dt = new Date(ts);
        dashboardData.lastMotion = isNaN(dt.getTime())
          ? 'Recently updated'
          : dt.toLocaleString();
        console.log('Last motion updated to:', dashboardData.lastMotion, '(raw:', ts, ')');
      } else {
        dashboardData.lastMotion = 'No updates yet';
      }

      hydrateDashboard();
    },
    (error) => {
      console.error('Failed to load system status', error);
    }
  );
}

// Init
showPage('landing', { skipScroll: true });
hydrateDashboard();
renderPackages();
startPackagesListener();
startSystemListener();

if (addPackageForm) {
  addPackageForm.addEventListener('submit', addPackageCard);
}

if (checkBtn) {
  checkBtn.addEventListener('click', () => openPinPrompt(checkBtn.dataset.target || 'dashboard'));
}

if (openSmartboxBtn) {
  openSmartboxBtn.addEventListener('click', handleOpenSmartbox);
}

if (backToLandingBtn) {
  backToLandingBtn.addEventListener('click', () => showPage('landing'));
}

if (packageModal && modalClose) {
  modalClose.addEventListener('click', closePackageModal);
  packageModal.addEventListener('click', (e) => {
    if (e.target === packageModal) closePackageModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && packageModal.classList.contains('active')) {
      closePackageModal();
    }
  });
}

if (pinForm) {
  pinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const enteredPin = pinInput ? pinInput.value.trim() : '';
    if (!enteredPin) {
      showPinError('Please enter your PIN.');
      return;
    }

    hidePinError();
    setPinLoading(true);

    try {
      const expectedPin = await fetchExpectedPin();

      if (String(enteredPin) === String(expectedPin)) {
        closePinPrompt();
        showToast('PIN verified', 'Access granted to your packages.', 'success');
        showPage(nextPageAfterPin || 'dashboard');
      } else {
        showPinError('Incorrect PIN. Please try again.');
        showToast('PIN incorrect', 'The PIN you entered is not valid.', 'error');
      }
    } catch (err) {
      console.error('PIN validation error', err);
      showPinError('Unable to verify PIN right now. Please try again.');
      showToast('PIN unavailable', 'Could not fetch PIN from server.', 'error');
    } finally {
      setPinLoading(false);
    }
  });
}

if (pinCancel) {
  pinCancel.addEventListener('click', closePinPrompt);
}

if (pinModal && pinClose) {
  pinClose.addEventListener('click', closePinPrompt);
  pinModal.addEventListener('click', (e) => {
    if (e.target === pinModal) closePinPrompt();
  });
}

