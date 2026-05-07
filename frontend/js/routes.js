/**
 * TransitBDG — routes.js
 * Halaman daftar rute, peta Leaflet, dan pencarian rute.
 * Requirements: 1.1, 1.3, 1.4, 1.7, 6.1, 6.2, 6.3, 6.4, 6.5
 */

/* ── Konstanta ────────────────────────────────────────────── */

/** Koordinat pusat Kota Bandung */
const BANDUNG_CENTER = [-6.9175, 107.6191];
const DEFAULT_ZOOM   = 13;

/** Warna polyline per rute (berulang jika lebih dari 8 rute) */
const ROUTE_COLORS = [
  '#007AFF', '#34C759', '#FF9F0A', '#FF3B30',
  '#AF52DE', '#5AC8FA', '#FF2D55', '#30B0C7',
];

/* ── State ────────────────────────────────────────────────── */

let map = null;
let routesData = [];

/* ── Escape HTML ──────────────────────────────────────────── */

/**
 * Escape HTML untuk mencegah XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Render Daftar Rute ───────────────────────────────────── */

/**
 * Render kartu rute ke dalam #routes-list.
 * @param {Array} routes
 */
function renderRouteList(routes) {
  const listEl = document.getElementById('routes-list');
  if (!listEl) return;

  if (!routes || routes.length === 0) {
    listEl.innerHTML = `
      <p class="empty-state" role="status">
        Tidak ada rute yang tersedia saat ini.
      </p>`;
    return;
  }

  listEl.innerHTML = routes
    .map(
      (route) => `
      <a
        href="route-detail.html?id=${encodeURIComponent(route.id)}"
        class="route-card mb-3"
        aria-label="Rute ${escapeHtml(route.name)}"
      >
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <span class="route-type-badge ${route.type === 'TMB' ? 'route-type-tmb' : 'route-type-angkot'}">
              ${escapeHtml(route.type)}
            </span>
            <span style="font-size:0.75rem;color:var(--text-tertiary);margin-left:0.5rem;">
              ${escapeHtml(route.code)}
            </span>
          </div>
        </div>
        <h3 style="font-size:1rem;font-weight:600;color:var(--text-primary);margin:0.375rem 0 0.25rem;">
          ${escapeHtml(route.name)}
        </h3>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin:0;">
          ${escapeHtml(route.origin)} → ${escapeHtml(route.destination)}
        </p>
      </a>`
    )
    .join('');
}

/* ── Peta Leaflet ─────────────────────────────────────────── */

/**
 * Inisialisasi peta Leaflet.js.
 */
function initMap() {
  if (map) return; // sudah diinisialisasi

  map = L.map('map').setView(BANDUNG_CENTER, DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
}

/**
 * Render polyline jalur rute dan marker halte ke peta.
 * @param {Array} routes - Array data rute dari API
 */
function renderRoutesOnMap(routes) {
  if (!map || !routes || routes.length === 0) return;

  routes.forEach((route, index) => {
    const color = ROUTE_COLORS[index % ROUTE_COLORS.length];

    // Gambar polyline dari path_coords jika tersedia
    if (Array.isArray(route.path_coords) && route.path_coords.length >= 2) {
      try {
        // path_coords bisa berupa array [lat, lng] atau [{lat, lng}]
        const latlngs = route.path_coords.map((coord) => {
          if (Array.isArray(coord)) return [coord[0], coord[1]];
          if (coord.lat !== undefined && coord.lng !== undefined) return [coord.lat, coord.lng];
          return null;
        }).filter(Boolean);

        if (latlngs.length >= 2) {
          L.polyline(latlngs, {
            color,
            weight: 4,
            opacity: 0.8,
          })
            .bindTooltip(escapeHtml(route.name), { sticky: true })
            .addTo(map);
        }
      } catch (err) {
        console.warn(`[Map] Gagal render polyline rute ${route.code}:`, err);
      }
    }

    // Tambahkan marker untuk setiap halte
    if (Array.isArray(route.stops)) {
      route.stops.forEach((stop) => {
        if (stop.lat == null || stop.lng == null) return;

        try {
          const marker = L.circleMarker([parseFloat(stop.lat), parseFloat(stop.lng)], {
            radius: 6,
            fillColor: color,
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          });

          marker.bindPopup(`
            <div style="min-width:160px;">
              <strong style="font-size:0.875rem;">${escapeHtml(stop.name)}</strong><br/>
              <span style="font-size:0.75rem;color:#6e6e73;">Rute: ${escapeHtml(route.name)}</span><br/>
              <span style="font-size:0.75rem;color:#6e6e73;">Status: ${escapeHtml(stop.status || 'aktif')}</span>
            </div>
          `);

          marker.addTo(map);
        } catch (err) {
          console.warn(`[Map] Gagal render marker halte ${stop.name}:`, err);
        }
      });
    }
  });
}

/* ── Autocomplete ─────────────────────────────────────────── */

/** Debounce timer untuk autocomplete */
let originDebounceTimer   = null;
let destinationDebounceTimer = null;

/**
 * Tampilkan dropdown autocomplete.
 * @param {string} dropdownId - ID elemen dropdown
 * @param {Array<string>} suggestions - Daftar saran nama halte
 * @param {HTMLInputElement} inputEl - Elemen input terkait
 */
function showAutocompleteDropdown(dropdownId, suggestions, inputEl) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  if (!suggestions || suggestions.length === 0) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  dropdown.innerHTML = suggestions
    .map(
      (name) =>
        `<div class="autocomplete-item" role="option" tabindex="0" data-value="${escapeHtml(name)}">
          ${escapeHtml(name)}
        </div>`
    )
    .join('');

  dropdown.style.display = 'block';

  // Klik pada item dropdown
  dropdown.querySelectorAll('.autocomplete-item').forEach((item) => {
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Cegah blur pada input
      inputEl.value = item.dataset.value;
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputEl.value = item.dataset.value;
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
        inputEl.focus();
      }
    });
  });
}

/**
 * Fetch saran autocomplete dari API.
 * @param {string} query - Teks yang diketik pengguna
 * @param {string} dropdownId - ID dropdown yang akan diisi
 * @param {HTMLInputElement} inputEl - Elemen input terkait
 */
async function fetchAutocomplete(query, dropdownId, inputEl) {
  if (!query || query.trim().length === 0) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
    }
    return;
  }

  try {
    const data = await apiFetch(`/api/v1/stops/autocomplete?q=${encodeURIComponent(query.trim())}`);
    const suggestions = Array.isArray(data) ? data : (data.stops || []);
    // Normalisasi: ambil nama string dari objek jika perlu
    const names = suggestions.map((s) => (typeof s === 'string' ? s : s.name)).filter(Boolean);
    showAutocompleteDropdown(dropdownId, names, inputEl);
  } catch (err) {
    console.warn('[Autocomplete] Gagal fetch saran:', err);
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }
}

/**
 * Setup event listener autocomplete pada input.
 * @param {string} inputId
 * @param {string} dropdownId
 */
function setupAutocomplete(inputId, dropdownId) {
  const inputEl = document.getElementById(inputId);
  if (!inputEl) return;

  let debounceTimer = null;

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchAutocomplete(inputEl.value, dropdownId, inputEl);
    }, 300);
  });

  // Tutup dropdown saat blur (dengan delay agar klik item sempat diproses)
  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    }, 200);
  });

  // Buka kembali dropdown saat focus jika ada teks
  inputEl.addEventListener('focus', () => {
    if (inputEl.value.trim().length > 0) {
      fetchAutocomplete(inputEl.value, dropdownId, inputEl);
    }
  });
}

/* ── Pencarian Rute ───────────────────────────────────────── */

/**
 * Tampilkan pesan validasi pencarian.
 * @param {string} message
 */
function showSearchValidation(message) {
  const el = document.getElementById('search-validation');
  if (!el) return;
  el.innerHTML = `
    <div class="alert-banner alert-banner-warning">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
  el.style.display = 'block';
}

/**
 * Sembunyikan pesan validasi pencarian.
 */
function hideSearchValidation() {
  const el = document.getElementById('search-validation');
  if (el) el.style.display = 'none';
}

/**
 * Render hasil pencarian rute.
 * @param {Array} results
 * @param {string} origin
 * @param {string} destination
 */
function renderSearchResults(results, origin, destination) {
  const el = document.getElementById('search-results');
  if (!el) return;

  if (!results || results.length === 0) {
    el.innerHTML = `
      <div class="alert-banner alert-banner-info" role="status">
        <span aria-hidden="true">ℹ️</span>
        <span>Tidak ditemukan rute langsung dari <strong>${escapeHtml(origin)}</strong> ke <strong>${escapeHtml(destination)}</strong>.</span>
      </div>`;
    return;
  }

  const cardsHTML = results
    .map(
      (route) => `
      <div class="search-result-card">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
          <span class="route-type-badge ${route.type === 'TMB' ? 'route-type-tmb' : 'route-type-angkot'}">
            ${escapeHtml(route.type)}
          </span>
          <span style="font-size:0.75rem;color:var(--text-tertiary);">${escapeHtml(route.code)}</span>
        </div>
        <p style="font-weight:600;font-size:0.9375rem;color:var(--text-primary);margin:0.25rem 0;">
          ${escapeHtml(route.name)}
        </p>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin:0;">
          ${escapeHtml(route.origin)} → ${escapeHtml(route.destination)}
        </p>
        <a href="route-detail.html?id=${encodeURIComponent(route.id)}"
           class="btn btn-secondary"
           style="margin-top:0.625rem;font-size:0.8125rem;"
           aria-label="Lihat detail rute ${escapeHtml(route.name)}">
          Lihat Detail
        </a>
      </div>`
    )
    .join('');

  el.innerHTML = `
    <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:0.5rem;">
      Ditemukan <strong>${results.length}</strong> rute dari <strong>${escapeHtml(origin)}</strong> ke <strong>${escapeHtml(destination)}</strong>:
    </p>
    ${cardsHTML}`;
}

/**
 * Handler tombol cari rute.
 */
async function handleSearch() {
  const originInput      = document.getElementById('origin-input');
  const destinationInput = document.getElementById('destination-input');
  const resultsEl        = document.getElementById('search-results');

  const origin      = originInput ? originInput.value.trim() : '';
  const destination = destinationInput ? destinationInput.value.trim() : '';

  // Validasi client-side — tidak kirim request jika kosong
  if (!origin && !destination) {
    showSearchValidation('Harap isi halte asal dan halte tujuan.');
    return;
  }
  if (!origin) {
    showSearchValidation('Harap isi halte asal.');
    return;
  }
  if (!destination) {
    showSearchValidation('Harap isi halte tujuan.');
    return;
  }

  hideSearchValidation();
  if (resultsEl) resultsEl.innerHTML = '';

  try {
    showLoading(true);
    const data = await apiFetch(
      `/api/v1/stops/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    );
    const results = Array.isArray(data) ? data : (data.routes || []);
    renderSearchResults(results, origin, destination);
  } catch (err) {
    const el = document.getElementById('search-results');
    if (el) {
      el.innerHTML = `
        <div class="alert-banner alert-banner-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>Gagal melakukan pencarian. Silakan coba lagi nanti.</span>
        </div>`;
    }
    console.error('[Search] Gagal fetch pencarian rute:', err);
  } finally {
    showLoading(false);
  }
}

/* ── Fetch Semua Rute ─────────────────────────────────────── */

/**
 * Fetch semua rute dari API dan render ke halaman.
 */
async function fetchAndRenderRoutes() {
  try {
    showLoading(true);
    const data = await apiFetch('/api/v1/routes');
    routesData = Array.isArray(data) ? data : (data.routes || []);

    renderRouteList(routesData);
    renderRoutesOnMap(routesData);
  } catch (err) {
    // Tampilkan pesan error informatif — halaman tetap berfungsi
    const listEl = document.getElementById('routes-list');
    if (listEl) {
      listEl.innerHTML = `
        <div class="alert-banner alert-banner-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>Gagal memuat data rute. Silakan periksa koneksi internet Anda dan coba lagi nanti.</span>
        </div>`;
    }
    console.error('[Routes] Gagal fetch rute:', err);
  } finally {
    showLoading(false);
  }
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  // Inisialisasi peta Leaflet
  initMap();

  // Setup autocomplete untuk kedua input
  setupAutocomplete('origin-input', 'origin-dropdown');
  setupAutocomplete('destination-input', 'destination-dropdown');

  // Setup tombol cari
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }

  // Izinkan Enter pada input untuk memicu pencarian
  ['origin-input', 'destination-input'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }
  });

  // Fetch dan render semua rute
  await fetchAndRenderRoutes();
});
