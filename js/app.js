/**
 * DIV2 Map Maker – app.js
 *
 * Mobile-first web app for placing and sharing map pins on a stylised
 * dark version of the Division 2 Washington DC map.
 *
 * Features
 * ────────
 *  • Leaflet map with CartoDB Dark-Matter tiles (white/grey streets, black BG)
 *  • Division 2 named-zone labels floating over the map
 *  • Click-to-place pins (max 100 per map), optional label + category
 *  • Click a placed pin to remove it (with confirmation popup)
 *  • Sidebar pin list – click to fly to pin, × to delete
 *  • Name your map
 *  • 💾 Save  – downloads a JSON text file of all pin coordinates
 *  • 📂 Load  – restores a previously saved JSON file
 *  • 🔗 Share – encodes the map into a URL for sharing
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. CONSTANTS
═══════════════════════════════════════════════════════════════ */

const MAX_PINS = 100;

const MAP_DEFAULTS = {
  center: [38.8962, -77.0365],   // Near the White House
  zoom:   14,
  minZoom: 12,
  maxZoom: 18,
};

/** Division 2 named-zone labels with approximate real-DC coordinates */
const DIV2_ZONES = [
  { name: 'The White House',         lat: 38.8977, lng: -77.0365 },
  { name: 'Downtown West',           lat: 38.9001, lng: -77.0430 },
  { name: 'Downtown East',           lat: 38.8985, lng: -77.0255 },
  { name: 'Federal Triangle',        lat: 38.8935, lng: -77.0290 },
  { name: 'Constitution Hall',       lat: 38.8888, lng: -77.0443 },
  { name: 'Judiciary Square',        lat: 38.9005, lng: -77.0161 },
  { name: 'Penn Quarter',            lat: 38.8953, lng: -77.0218 },
  { name: 'Chinatown',               lat: 38.9018, lng: -77.0224 },
  { name: 'West Potomac Park',       lat: 38.8853, lng: -77.0466 },
  { name: 'East Mall',               lat: 38.8885, lng: -77.0192 },
  { name: 'Lincoln Memorial',        lat: 38.8893, lng: -77.0502 },
  { name: 'Foggy Bottom',            lat: 38.8995, lng: -77.0530 },
  { name: 'Georgetown',              lat: 38.9072, lng: -77.0634 },
  { name: 'Mount Vernon Triangle',   lat: 38.9042, lng: -77.0183 },
  { name: 'Southwest Waterfront',    lat: 38.8793, lng: -77.0256 },
  { name: 'National Mall',           lat: 38.8893, lng: -77.0348 },
  { name: 'Capitol Hill',            lat: 38.8897, lng: -77.0086 },
  { name: 'Roosevelt Island',        lat: 38.8963, lng: -77.0622 },
  { name: 'Columbia Heights',        lat: 38.9281, lng: -77.0353 },
  { name: 'Shaw',                    lat: 38.9120, lng: -77.0225 },
  { name: 'Stronghold: Capitol',     lat: 38.8898, lng: -77.0089 },
];

/** Pin categories – id, display name, colour, emoji */
const CATEGORIES = [
  { id: 'loot',      name: 'Loot',      color: '#f1c40f', emoji: '💰' },
  { id: 'enemy',     name: 'Enemy',     color: '#e74c3c', emoji: '⚔️' },
  { id: 'mission',   name: 'Mission',   color: '#3498db', emoji: '🎯' },
  { id: 'safehouse', name: 'Safe House',color: '#2ecc71', emoji: '🏠' },
  { id: 'landmark',  name: 'Landmark',  color: '#9b59b6', emoji: '🔎' },
  { id: 'custom',    name: 'Custom',    color: '#e8a020', emoji: '⭐' },
];

const catMap = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

/* ═══════════════════════════════════════════════════════════════
   2. STATE
═══════════════════════════════════════════════════════════════ */

let map = null;
let pins = [];              // { id, lat, lng, label, category }
let markers = {};           // id → Leaflet circleMarker
let selectedCat = CATEGORIES[0];
let pendingLatLng = null;   // latlng waiting for label modal confirm
let toastTimer = null;

/* ═══════════════════════════════════════════════════════════════
   3. INITIALISATION
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initMap();
  buildCategoryGrid();
  wireEvents();
  loadFromURL();
  renderPinList();
});

function initMap() {
  map = L.map('map', {
    center:  MAP_DEFAULTS.center,
    zoom:    MAP_DEFAULTS.zoom,
    minZoom: MAP_DEFAULTS.minZoom,
    maxZoom: MAP_DEFAULTS.maxZoom,
    zoomControl: true,
  });

  // Dark-matter tile layer – black background, white/grey streets & buildings
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' +
        ' contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }
  ).addTo(map);

  addZoneLabels();

  map.on('click', onMapClick);
}

function addZoneLabels() {
  DIV2_ZONES.forEach(zone => {
    // Invisible zero-size marker – just an anchor for the permanent tooltip
    const dummy = L.marker([zone.lat, zone.lng], {
      icon: L.divIcon({ html: '', className: '', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
    });
    dummy.addTo(map);
    dummy.bindTooltip(zone.name, {
      permanent: true,
      direction: 'center',
      className: 'zone-label',
      opacity: 1,
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. CATEGORY GRID
═══════════════════════════════════════════════════════════════ */

function buildCategoryGrid() {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (cat.id === selectedCat.id ? ' active' : '');
    btn.dataset.catId = cat.id;
    btn.setAttribute('title', cat.name);
    btn.innerHTML =
      `<span class="cat-dot" style="background:${cat.color}"></span>` +
      `${cat.emoji} ${cat.name}`;

    btn.addEventListener('click', () => {
      selectedCat = cat;
      grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    grid.appendChild(btn);
  });
}

/* ═══════════════════════════════════════════════════════════════
   5. EVENT WIRING
═══════════════════════════════════════════════════════════════ */

function wireEvents() {
  // Header toggle
  document.getElementById('toggle-panel').addEventListener('click', togglePanel);

  // Pin modal
  document.getElementById('btn-confirm-pin').addEventListener('click', confirmPin);
  document.getElementById('btn-cancel-pin').addEventListener('click', closePinModal);
  document.getElementById('pin-label').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmPin();
    if (e.key === 'Escape') closePinModal();
  });
  document.getElementById('pin-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePinModal();
  });

  // Actions
  document.getElementById('btn-save').addEventListener('click', saveMap);
  document.getElementById('btn-load').addEventListener('click', () =>
    document.getElementById('file-input').click()
  );
  document.getElementById('file-input').addEventListener('change', loadMap);
  document.getElementById('btn-share').addEventListener('click', openShareModal);
  document.getElementById('btn-clear').addEventListener('click', clearAll);

  // Share modal
  document.getElementById('btn-copy-url').addEventListener('click', copyURL);
  document.getElementById('btn-close-share').addEventListener('click', () =>
    document.getElementById('share-modal').classList.add('hidden')
  );
  document.getElementById('share-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget)
      document.getElementById('share-modal').classList.add('hidden');
  });
}

/* ═══════════════════════════════════════════════════════════════
   6. PANEL TOGGLE
═══════════════════════════════════════════════════════════════ */

function togglePanel() {
  const panel = document.getElementById('side-panel');
  const isOpen = panel.classList.toggle('panel-open');
  // Invalidate map size after CSS transition (300 ms)
  setTimeout(() => map.invalidateSize(), 320);
  // Update toggle button label for accessibility
  document.getElementById('toggle-panel').setAttribute(
    'aria-expanded', isOpen ? 'true' : 'false'
  );
}

/* ═══════════════════════════════════════════════════════════════
   7. MAP CLICK → ADD PIN
═══════════════════════════════════════════════════════════════ */

function onMapClick(e) {
  if (pins.length >= MAX_PINS) {
    toast(`Maximum ${MAX_PINS} pins per map reached.`);
    return;
  }
  pendingLatLng = e.latlng;
  openPinModal(e.latlng);
}

function openPinModal(latlng) {
  document.getElementById('pin-label').value = '';
  document.getElementById('modal-coords').textContent =
    `Coordinates: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
  document.getElementById('pin-modal').classList.remove('hidden');
  // Small delay before focusing so mobile keyboards don't glitch
  setTimeout(() => document.getElementById('pin-label').focus(), 120);
}

function closePinModal() {
  document.getElementById('pin-modal').classList.add('hidden');
  pendingLatLng = null;
}

function confirmPin() {
  if (!pendingLatLng) return;
  const label = document.getElementById('pin-label').value.trim().slice(0, 50) || null;
  placePin({ lat: pendingLatLng.lat, lng: pendingLatLng.lng, label, category: selectedCat.id });
  closePinModal();
}

/* ═══════════════════════════════════════════════════════════════
   8. PIN CRUD
═══════════════════════════════════════════════════════════════ */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/**
 * Add a pin to the map and state.
 * @param {{ lat: number, lng: number, label?: string|null, category?: string }} data
 */
function placePin(data) {
  const cat = catMap[data.category] || CATEGORIES[0];
  const id = generateId();
  const pin = {
    id,
    lat:      data.lat,
    lng:      data.lng,
    label:    data.label || null,
    category: cat.id,
  };
  pins.push(pin);

  const marker = L.circleMarker([pin.lat, pin.lng], {
    radius:      9,
    fillColor:   cat.color,
    color:       '#ffffff',
    weight:      2,
    opacity:     1,
    fillOpacity: 0.88,
  }).addTo(map);

  // Popup with name + delete button
  const popupContent = buildPinPopup(pin, cat);
  marker.bindPopup(popupContent, { maxWidth: 220 });

  // Opening the popup wires up the delete button inside it
  marker.on('popupopen', () => {
    const delBtn = document.getElementById(`del-popup-${pin.id}`);
    if (delBtn) delBtn.addEventListener('click', () => removePin(pin.id));
  });

  markers[pin.id] = marker;
  renderPinList();
}

function buildPinPopup(pin, cat) {
  const title = pin.label ? pin.label : `${cat.emoji} ${cat.name}`;
  return `<div style="min-width:140px">
    <strong style="color:${cat.color}">${escHtml(title)}</strong><br>
    <small style="color:#888">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</small><br>
    <button id="del-popup-${pin.id}"
      style="margin-top:0.4rem;padding:0.3rem 0.6rem;cursor:pointer;
             border:1px solid #c0392b;background:#1e1e1e;color:#e74c3c;
             border-radius:3px;font-size:0.78rem;">
      Remove Pin
    </button>
  </div>`;
}

function removePin(id) {
  if (markers[id]) {
    map.removeLayer(markers[id]);
    delete markers[id];
  }
  pins = pins.filter(p => p.id !== id);
  renderPinList();
}

function clearAll() {
  if (pins.length === 0) return;
  if (!window.confirm(`Remove all ${pins.length} pin(s)?`)) return;
  pins.forEach(p => { if (markers[p.id]) map.removeLayer(markers[p.id]); });
  pins = [];
  markers = {};
  renderPinList();
}

/* ═══════════════════════════════════════════════════════════════
   9. SIDEBAR PIN LIST
═══════════════════════════════════════════════════════════════ */

function renderPinList() {
  document.getElementById('pin-count').textContent = pins.length;

  const list = document.getElementById('pin-list');
  if (pins.length === 0) {
    list.innerHTML = '<p class="empty-hint">Tap the map to add pins.</p>';
    return;
  }

  list.innerHTML = '';
  pins.forEach((pin, idx) => {
    const cat = catMap[pin.category] || CATEGORIES[0];
    const row = document.createElement('div');
    row.className = 'pin-row';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', `Pin ${idx + 1}: ${pin.label || cat.name}`);

    row.innerHTML =
      `<span class="pin-row-dot" style="background:${cat.color}"></span>` +
      `<div class="pin-row-info">
         <div class="pin-row-name">${escHtml(pin.label || `${cat.emoji} ${cat.name} #${idx + 1}`)}</div>
         <div class="pin-row-coords">${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}</div>
       </div>` +
      `<button class="pin-row-del" title="Remove pin" aria-label="Remove pin ${idx + 1}">&times;</button>`;

    // Fly to pin on row click
    row.addEventListener('click', e => {
      if (e.target.classList.contains('pin-row-del')) return;
      map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
      if (markers[pin.id]) markers[pin.id].openPopup();
    });
    row.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') row.click();
    });

    row.querySelector('.pin-row-del').addEventListener('click', e => {
      e.stopPropagation();
      removePin(pin.id);
    });

    list.appendChild(row);
  });
}

/* ═══════════════════════════════════════════════════════════════
   10. SAVE  (download JSON text file)
═══════════════════════════════════════════════════════════════ */

function getMapName() {
  return document.getElementById('map-name').value.trim() || 'My Division 2 Map';
}

function saveMap() {
  const mapName = getMapName();
  const payload = {
    version:   1,
    name:      mapName,
    savedAt:   new Date().toISOString(),
    pinCount:  pins.length,
    pins:      pins.map(p => ({
      lat:      parseFloat(p.lat.toFixed(6)),
      lng:      parseFloat(p.lng.toFixed(6)),
      label:    p.label || '',
      category: p.category,
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href     = url;
  anchor.download = sanitiseFilename(mapName) + '.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  toast(`Map "${mapName}" saved (${pins.length} pins).`);
}

/* ═══════════════════════════════════════════════════════════════
   11. LOAD  (restore from JSON file)
═══════════════════════════════════════════════════════════════ */

function loadMap(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);

      if (!Array.isArray(data.pins)) throw new Error('Missing pins array');

      // Clear current state
      pins.forEach(p => { if (markers[p.id]) map.removeLayer(markers[p.id]); });
      pins = [];
      markers = {};

      // Restore map name
      if (data.name) document.getElementById('map-name').value = data.name;

      // Restore pins (capped at MAX_PINS)
      const toLoad = data.pins.slice(0, MAX_PINS);
      toLoad.forEach(p => {
        if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
        placePin({
          lat:      p.lat,
          lng:      p.lng,
          label:    p.label || null,
          category: p.category || 'custom',
        });
      });

      if (toLoad.length > 0) {
        // Fit map to loaded pins
        const latlngs = toLoad.map(p => [p.lat, p.lng]);
        map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
      }

      toast(`Loaded "${data.name || 'map'}" – ${toLoad.length} pin(s).`);
    } catch {
      toast('Error: file is not a valid DIV2 map JSON.');
    }
  };

  reader.readAsText(file);
  // Reset so the same file can be re-loaded
  e.target.value = '';
}

/* ═══════════════════════════════════════════════════════════════
   12. SHARE  (encode map in URL)
═══════════════════════════════════════════════════════════════ */

function openShareModal() {
  const mapName = getMapName();
  const compact = {
    n: mapName,
    p: pins.map(p => [
      parseFloat(p.lat.toFixed(5)),
      parseFloat(p.lng.toFixed(5)),
      p.label || '',
      p.category,
    ]),
  };

  let encoded;
  try {
    encoded = btoa(unescape(encodeURIComponent(JSON.stringify(compact))));
  } catch {
    toast('Share URL could not be generated.');
    return;
  }

  const url = `${location.origin}${location.pathname}?map=${encoded}`;

  if (url.length > 12000) {
    toast('Too many pins to encode in a URL – save and send the file instead.');
    return;
  }

  document.getElementById('share-url').value = url;
  document.getElementById('share-modal').classList.remove('hidden');
}

function copyURL() {
  const input = document.getElementById('share-url');
  input.select();
  input.setSelectionRange(0, 99999); // mobile

  const text = input.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => toast('Link copied to clipboard!'))
      .catch(() => legacyCopy(input));
  } else {
    legacyCopy(input);
  }
}

function legacyCopy(input) {
  try {
    document.execCommand('copy');
    toast('Link copied!');
  } catch {
    toast('Please copy the link manually.');
  }
}

/* ═══════════════════════════════════════════════════════════════
   13. LOAD FROM URL  (restore shared map on page load)
═══════════════════════════════════════════════════════════════ */

function loadFromURL() {
  const params = new URLSearchParams(location.search);
  const raw = params.get('map');
  if (!raw) return;

  try {
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json);

    if (data.n) document.getElementById('map-name').value = data.n;

    if (Array.isArray(data.p) && data.p.length > 0) {
      const toLoad = data.p.slice(0, MAX_PINS);
      toLoad.forEach(p => {
        if (!Array.isArray(p) || p.length < 2) return;
        const [lat, lng, label, category] = p;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;
        placePin({ lat, lng, label: label || null, category: category || 'custom' });
      });

      const latlngs = toLoad.map(p => [p[0], p[1]]);
      map.fitBounds(L.latLngBounds(latlngs).pad(0.15));
      toast(`Loaded shared map "${data.n || 'map'}" – ${toLoad.length} pin(s).`);
    }
  } catch {
    // Invalid or corrupt URL parameter – silently ignore
  }
}

/* ═══════════════════════════════════════════════════════════════
   14. UTILITIES
═══════════════════════════════════════════════════════════════ */

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitiseFilename(name) {
  return name.replace(/[^a-z0-9_\- ]/gi, '_').replace(/\s+/g, '_').slice(0, 60) || 'div2_map';
}
