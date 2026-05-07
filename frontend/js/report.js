/**
 * TransitBDG — report.js
 * Formulir laporan masyarakat dengan peta Leaflet, validasi client-side,
 * dan submit multipart/form-data ke API.
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 2.7, 2.8
 */

/* ── Konstanta ────────────────────────────────────────────── */

/** Koordinat pusat Kota Bandung */
const BANDUNG_CENTER = [-6.9175, 107.6191];
const DEFAULT_ZOOM   = 13;

/** Kategori laporan yang valid */
const VALID_CATEGORIES = [
  'Kemacetan',
  'Kecelakaan',
  'Kendaraan Rusak',
  'Angkot Ngetem',
  'Halte Rusak',
];

/* ── State ────────────────────────────────────────────────── */

let map        = null;
let marker     = null;
let markerLat  = null;
let markerLng  = null;

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

/* ── Peta Leaflet ─────────────────────────────────────────── */

/**
 * Inisialisasi peta Leaflet untuk pemilihan lokasi.
 * Klik pada peta menempatkan marker dan mengisi location_text.
 */
function initMap() {
  if (map) return;

  map = L.map('location-map').setView(BANDUNG_CENTER, DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Klik pada peta untuk menempatkan marker
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    placeMarker(lat, lng);
  });
}

/**
 * Tempatkan atau pindahkan marker pada koordinat yang diberikan.
 * Auto-fill kolom location_text dengan koordinat.
 * @param {number} lat
 * @param {number} lng
 */
function placeMarker(lat, lng) {
  markerLat = lat;
  markerLng = lng;

  if (marker) {
    marker.setLatLng([lat, lng]);
  } else {
    marker = L.marker([lat, lng], {
      title: 'Lokasi laporan',
      alt: 'Penanda lokasi laporan',
    }).addTo(map);
  }

  // Auto-fill location_text dengan koordinat
  const locationInput = document.getElementById('location_text');
  if (locationInput && !locationInput.dataset.manuallyEdited) {
    locationInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    // Hapus error lokasi jika ada
    clearFieldError('location_text', 'location-error');
  }
}

/* ── Fetch Rute untuk Dropdown ────────────────────────────── */

/**
 * Fetch daftar rute dari API dan isi dropdown route_id.
 */
async function fetchRoutes() {
  try {
    const data = await apiFetch('/api/v1/routes');
    const routes = Array.isArray(data) ? data : (data.routes || []);

    const select = document.getElementById('route_id');
    if (!select) return;

    routes.forEach((route) => {
      const option = document.createElement('option');
      option.value = route.id;
      option.textContent = `${escapeHtml(route.code)} — ${escapeHtml(route.name)}`;
      select.appendChild(option);
    });
  } catch (err) {
    // Dropdown rute gagal dimuat — tidak kritis, form tetap bisa digunakan
    console.warn('[Report] Gagal fetch rute untuk dropdown:', err);
  }
}

/* ── Character Counter ────────────────────────────────────── */

/**
 * Setup character counter untuk textarea deskripsi.
 */
function setupCharCounter() {
  const textarea = document.getElementById('description');
  const counter  = document.getElementById('description-counter');
  if (!textarea || !counter) return;

  function updateCounter() {
    const len = textarea.value.length;
    counter.textContent = `${len} / 500`;
    counter.className = 'char-counter';
    if (len >= 500) {
      counter.classList.add('at-limit');
    } else if (len >= 450) {
      counter.classList.add('near-limit');
    }
  }

  textarea.addEventListener('input', updateCounter);
  updateCounter(); // inisialisasi
}

/* ── Validasi ─────────────────────────────────────────────── */

/**
 * Tampilkan pesan error pada field tertentu.
 * @param {string} fieldId - ID elemen input/select/textarea
 * @param {string} errorId - ID elemen error message
 * @param {string} message - Pesan error
 */
function showFieldError(fieldId, errorId, message) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (field) field.classList.add('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
}

/**
 * Hapus pesan error pada field tertentu.
 * @param {string} fieldId
 * @param {string} errorId
 */
function clearFieldError(fieldId, errorId) {
  const field = document.getElementById(fieldId);
  const errorEl = document.getElementById(errorId);

  if (field) field.classList.remove('error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }
}

/**
 * Validasi semua field form sebelum submit.
 * @returns {boolean} true jika valid, false jika ada error
 */
function validateForm() {
  let isValid = true;

  // Reset semua error
  clearFieldError('category', 'category-error');
  clearFieldError('description', 'description-error');
  clearFieldError('location_text', 'location-error');
  clearFieldError('photo', 'photo-error');

  // Validasi kategori
  const category = document.getElementById('category')?.value || '';
  if (!category) {
    showFieldError('category', 'category-error', 'Kategori laporan wajib dipilih.');
    isValid = false;
  } else if (!VALID_CATEGORIES.includes(category)) {
    showFieldError('category', 'category-error', 'Pilih kategori yang valid.');
    isValid = false;
  }

  // Validasi deskripsi
  const description = document.getElementById('description')?.value?.trim() || '';
  if (!description) {
    showFieldError('description', 'description-error', 'Deskripsi laporan wajib diisi.');
    isValid = false;
  } else if (description.length > 500) {
    showFieldError('description', 'description-error', 'Deskripsi tidak boleh lebih dari 500 karakter.');
    isValid = false;
  }

  // Validasi lokasi: harus ada location_text ATAU marker di peta
  const locationText = document.getElementById('location_text')?.value?.trim() || '';
  if (!locationText && markerLat === null) {
    showFieldError('location_text', 'location-error', 'Lokasi wajib diisi. Klik peta atau isi kolom lokasi.');
    isValid = false;
  }

  // Validasi foto (opsional, tapi jika ada harus JPEG/PNG dan ≤ 5 MB)
  const photoInput = document.getElementById('photo');
  if (photoInput && photoInput.files && photoInput.files.length > 0) {
    const file = photoInput.files[0];
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showFieldError('photo', 'photo-error', 'Format foto harus JPEG atau PNG.');
      isValid = false;
    } else if (file.size > 5 * 1024 * 1024) {
      showFieldError('photo', 'photo-error', 'Ukuran foto tidak boleh lebih dari 5 MB.');
      isValid = false;
    }
  }

  return isValid;
}

/* ── Submit Form ──────────────────────────────────────────── */

/**
 * Handle submit form laporan.
 * @param {Event} e
 */
async function handleSubmit(e) {
  e.preventDefault();

  // Sembunyikan API error sebelumnya
  const apiErrorEl = document.getElementById('api-error');
  if (apiErrorEl) apiErrorEl.style.display = 'none';

  // Validasi client-side
  if (!validateForm()) {
    // Scroll ke error pertama
    const firstError = document.querySelector('.field-error.visible');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Bangun FormData
  const formData = new FormData();

  const category    = document.getElementById('category').value;
  const description = document.getElementById('description').value.trim();
  const locationText = document.getElementById('location_text').value.trim();
  const routeId     = document.getElementById('route_id').value;
  const photoInput  = document.getElementById('photo');

  formData.append('category', category);
  formData.append('description', description);

  // Lokasi: gunakan teks manual atau koordinat dari marker
  if (locationText) {
    formData.append('location_text', locationText);
  } else if (markerLat !== null) {
    formData.append('location_text', `${markerLat.toFixed(6)}, ${markerLng.toFixed(6)}`);
  }

  if (markerLat !== null) {
    formData.append('location_lat', markerLat.toFixed(7));
    formData.append('location_lng', markerLng.toFixed(7));
  }

  if (routeId) {
    formData.append('route_id', routeId);
  }

  if (photoInput && photoInput.files && photoInput.files.length > 0) {
    formData.append('photo', photoInput.files[0]);
  }

  // Submit ke API
  const submitBtn = document.getElementById('submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
  }

  showLoading(true);

  try {
    const result = await apiFetch('/api/v1/reports', {
      method: 'POST',
      body: formData,
    });

    // Berhasil — tampilkan konfirmasi
    const reportCode = result.report_code || result.reportCode || '—';
    showConfirmation(reportCode);
  } catch (err) {
    // Tampilkan error API
    let errorMessage = 'Gagal mengirim laporan. Silakan coba lagi.';

    if (err.body) {
      // Error validasi per-field dari server
      if (err.body.errors && typeof err.body.errors === 'object') {
        const serverErrors = err.body.errors;
        if (serverErrors.category)    showFieldError('category', 'category-error', serverErrors.category);
        if (serverErrors.description) showFieldError('description', 'description-error', serverErrors.description);
        if (serverErrors.location)    showFieldError('location_text', 'location-error', serverErrors.location);
        errorMessage = 'Periksa kembali isian formulir Anda.';
      } else if (err.body.error) {
        errorMessage = err.body.error;
      }
    }

    if (apiErrorEl) {
      apiErrorEl.innerHTML = `
        <div class="alert-banner alert-banner-error">
          <span aria-hidden="true">⚠️</span>
          <span>${escapeHtml(errorMessage)}</span>
        </div>`;
      apiErrorEl.style.display = 'block';
    }

    console.error('[Report] Gagal submit laporan:', err);
  } finally {
    showLoading(false);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 Kirim Laporan';
    }
  }
}

/* ── Konfirmasi ───────────────────────────────────────────── */

/**
 * Sembunyikan form dan tampilkan section konfirmasi dengan kode laporan.
 * @param {string} reportCode
 */
function showConfirmation(reportCode) {
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirmation-section');
  const codeDisplay = document.getElementById('report-code-display');

  if (formSection) formSection.style.display = 'none';
  if (confirmSection) confirmSection.style.display = 'block';
  if (codeDisplay) codeDisplay.textContent = reportCode;

  // Scroll ke atas
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Reset form dan tampilkan kembali form untuk laporan baru.
 */
function resetForm() {
  const formSection = document.getElementById('form-section');
  const confirmSection = document.getElementById('confirmation-section');
  const form = document.getElementById('report-form');

  if (confirmSection) confirmSection.style.display = 'none';
  if (formSection) formSection.style.display = 'block';
  if (form) form.reset();

  // Reset state marker
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  markerLat = null;
  markerLng = null;

  // Reset char counter
  const counter = document.getElementById('description-counter');
  if (counter) {
    counter.textContent = '0 / 500';
    counter.className = 'char-counter';
  }

  // Reset photo label
  const photoLabelText = document.getElementById('photo-label-text');
  if (photoLabelText) photoLabelText.textContent = 'Pilih foto (JPEG / PNG)';

  // Reset manual edit flag
  const locationInput = document.getElementById('location_text');
  if (locationInput) delete locationInput.dataset.manuallyEdited;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  // Inisialisasi peta Leaflet
  initMap();

  // Setup character counter
  setupCharCounter();

  // Fetch rute untuk dropdown
  await fetchRoutes();

  // Setup form submit
  const form = document.getElementById('report-form');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Setup tombol laporan baru
  const newReportBtn = document.getElementById('new-report-btn');
  if (newReportBtn) {
    newReportBtn.addEventListener('click', resetForm);
  }

  // Tandai location_text sebagai diedit manual jika pengguna mengetik sendiri
  const locationInput = document.getElementById('location_text');
  if (locationInput) {
    locationInput.addEventListener('input', () => {
      if (locationInput.value.trim()) {
        locationInput.dataset.manuallyEdited = 'true';
      } else {
        delete locationInput.dataset.manuallyEdited;
      }
      // Hapus error lokasi saat pengguna mulai mengetik
      clearFieldError('location_text', 'location-error');
    });
  }

  // Update label file input saat file dipilih
  const photoInput = document.getElementById('photo');
  const photoLabelText = document.getElementById('photo-label-text');
  if (photoInput && photoLabelText) {
    photoInput.addEventListener('change', () => {
      if (photoInput.files && photoInput.files.length > 0) {
        photoLabelText.textContent = photoInput.files[0].name;
        clearFieldError('photo', 'photo-error');
      } else {
        photoLabelText.textContent = 'Pilih foto (JPEG / PNG)';
      }
    });
  }

  // Hapus error kategori saat berubah
  const categorySelect = document.getElementById('category');
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      clearFieldError('category', 'category-error');
    });
  }

  // Hapus error deskripsi saat mengetik
  const descriptionTextarea = document.getElementById('description');
  if (descriptionTextarea) {
    descriptionTextarea.addEventListener('input', () => {
      clearFieldError('description', 'description-error');
    });
  }
});
