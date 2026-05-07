/**
 * TransitBDG — route-detail.js
 * Halaman detail rute: info rute, daftar halte, dan rating bintang.
 * Requirements: 1.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */

/* ── State ────────────────────────────────────────────────── */

let currentRouteId  = null;
let selectedScore   = 0;

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

/* ── URL Params ───────────────────────────────────────────── */

/**
 * Ambil route ID dari query param `?id=`.
 * @returns {string|null}
 */
function getRouteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/* ── Render Info Rute ─────────────────────────────────────── */

/**
 * Render informasi utama rute ke dalam #route-info.
 * @param {Object} route
 */
function renderRouteInfo(route) {
  const el = document.getElementById('route-info');
  if (!el) return;

  // Update judul halaman
  document.title = `TransitBDG — ${route.name}`;

  el.innerHTML = `
    <div class="card mb-6" aria-label="Informasi rute ${escapeHtml(route.name)}">
      <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem;flex-wrap:wrap;">
        <span class="route-type-badge ${route.type === 'TMB' ? 'route-type-tmb' : 'route-type-angkot'}">
          ${escapeHtml(route.type)}
        </span>
        <span style="font-size:0.8125rem;color:var(--text-tertiary);font-weight:500;">
          ${escapeHtml(route.code)}
        </span>
      </div>
      <h1 style="font-size:1.375rem;font-weight:700;color:var(--text-primary);letter-spacing:-0.02em;margin-bottom:0.5rem;">
        ${escapeHtml(route.name)}
      </h1>
      <div style="display:flex;align-items:center;gap:0.5rem;font-size:0.9375rem;color:var(--text-secondary);">
        <span>${escapeHtml(route.origin)}</span>
        <span aria-hidden="true" style="color:var(--accent);">→</span>
        <span>${escapeHtml(route.destination)}</span>
      </div>
    </div>`;
}

/* ── Render Daftar Halte ──────────────────────────────────── */

/**
 * Render daftar halte ke dalam #stops-list.
 * @param {Array} stops
 */
function renderStopsList(stops) {
  const el = document.getElementById('stops-list');
  if (!el) return;

  if (!stops || stops.length === 0) {
    el.innerHTML = `
      <p class="empty-state" role="status">
        Tidak ada data halte untuk rute ini.
      </p>`;
    return;
  }

  // Urutkan berdasarkan sequence
  const sorted = [...stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  el.innerHTML = sorted
    .map(
      (stop) => `
      <div class="stop-item" aria-label="Halte ${escapeHtml(stop.name)}">
        <div class="stop-sequence" aria-hidden="true">${stop.sequence || '-'}</div>
        <div style="flex:1;">
          <span style="font-size:0.9375rem;font-weight:500;color:var(--text-primary);">
            ${escapeHtml(stop.name)}
          </span>
        </div>
        <span class="stop-status-badge ${stop.status === 'nonaktif' ? 'stop-status-nonaktif' : 'stop-status-aktif'}">
          ${escapeHtml(stop.status || 'aktif')}
        </span>
      </div>`
    )
    .join('');
}

/* ── Render Rating ────────────────────────────────────────── */

/**
 * Render bintang tampilan (read-only) berdasarkan nilai rata-rata.
 * @param {number} avg - Rata-rata rating (0–5)
 * @returns {string} HTML string bintang
 */
function renderStarsDisplay(avg) {
  const rounded = Math.round(avg);
  let html = '<span class="stars-display" aria-hidden="true">';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= rounded ? 'star-filled' : 'star-empty'}">★</span>`;
  }
  html += '</span>';
  return html;
}

/**
 * Render section rating ke dalam #rating-section.
 * @param {Object} ratingData - { average, total }
 * @param {number} routeId
 */
function renderRatingSection(ratingData, routeId) {
  const el = document.getElementById('rating-section');
  if (!el) return;

  const avg   = parseFloat(ratingData.average || 0).toFixed(1);
  const total = parseInt(ratingData.total || 0, 10);

  el.innerHTML = `
    <!-- Tampilan rata-rata rating -->
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-size:1rem;font-weight:600;margin-bottom:0.75rem;color:var(--text-primary);">
        ⭐ Rating Layanan
      </h2>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        ${renderStarsDisplay(parseFloat(avg))}
        <span style="font-size:1.5rem;font-weight:700;color:var(--text-primary);">${avg}</span>
        <span style="font-size:0.875rem;color:var(--text-secondary);">
          dari ${total.toLocaleString('id-ID')} penilaian
        </span>
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin-bottom:1.5rem;" />

    <!-- Form rating interaktif -->
    <div>
      <h3 style="font-size:0.9375rem;font-weight:600;margin-bottom:0.75rem;color:var(--text-primary);">
        Berikan Penilaian Anda
      </h3>

      <!-- Bintang interaktif -->
      <div
        id="star-input"
        class="star-rating"
        role="radiogroup"
        aria-label="Pilih rating 1 sampai 5 bintang"
        style="margin-bottom:1rem;"
      >
        ${[1, 2, 3, 4, 5]
          .map(
            (n) => `
          <button
            class="star-btn"
            data-score="${n}"
            role="radio"
            aria-checked="false"
            aria-label="${n} bintang"
            title="${n} bintang"
          >★</button>`
          )
          .join('')}
      </div>

      <!-- Komentar opsional -->
      <div style="margin-bottom:1rem;">
        <label for="rating-comment" style="font-size:0.8125rem;font-weight:500;color:var(--text-secondary);display:block;margin-bottom:0.375rem;">
          Komentar (opsional, maks. 200 karakter)
        </label>
        <textarea
          id="rating-comment"
          maxlength="200"
          rows="3"
          placeholder="Tulis komentar Anda tentang layanan rute ini..."
          aria-label="Komentar rating"
          style="width:100%;padding:0.625rem 0.875rem;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-secondary);color:var(--text-primary);font-size:0.875rem;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s ease;"
          onfocus="this.style.borderColor='var(--accent)'"
          onblur="this.style.borderColor='var(--border)'"
        ></textarea>
        <div id="comment-counter" style="font-size:0.75rem;color:var(--text-tertiary);text-align:right;margin-top:0.25rem;">0 / 200</div>
      </div>

      <!-- Validasi -->
      <div id="rating-validation" role="alert" aria-live="polite" style="display:none;margin-bottom:0.75rem;"></div>

      <!-- Tombol submit -->
      <button
        id="submit-rating-btn"
        class="btn btn-primary"
        aria-label="Kirim penilaian"
      >
        ⭐ Kirim Penilaian
      </button>
    </div>`;

  // Setup interaksi bintang
  setupStarInput(routeId);

  // Counter karakter komentar
  const commentEl = document.getElementById('rating-comment');
  const counterEl = document.getElementById('comment-counter');
  if (commentEl && counterEl) {
    commentEl.addEventListener('input', () => {
      counterEl.textContent = `${commentEl.value.length} / 200`;
    });
  }
}

/* ── Interaksi Bintang ────────────────────────────────────── */

/**
 * Setup event listener untuk bintang interaktif dan tombol submit.
 * @param {number} routeId
 */
function setupStarInput(routeId) {
  const starContainer = document.getElementById('star-input');
  if (!starContainer) return;

  const starBtns = starContainer.querySelectorAll('.star-btn');

  /**
   * Update tampilan bintang berdasarkan skor yang dipilih.
   * @param {number} score - 0 berarti tidak ada yang dipilih
   */
  function updateStarDisplay(score) {
    starBtns.forEach((btn) => {
      const btnScore = parseInt(btn.dataset.score, 10);
      const isSelected = btnScore <= score;
      btn.classList.toggle('selected', isSelected);
      btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    });
  }

  // Hover: preview bintang
  starBtns.forEach((btn) => {
    btn.addEventListener('mouseenter', () => {
      const hoverScore = parseInt(btn.dataset.score, 10);
      updateStarDisplay(hoverScore);
    });

    btn.addEventListener('mouseleave', () => {
      updateStarDisplay(selectedScore);
    });

    // Klik: pilih bintang
    btn.addEventListener('click', () => {
      selectedScore = parseInt(btn.dataset.score, 10);
      updateStarDisplay(selectedScore);
    });

    // Keyboard: Enter / Space untuk memilih
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectedScore = parseInt(btn.dataset.score, 10);
        updateStarDisplay(selectedScore);
      }
    });
  });

  // Setup tombol submit
  const submitBtn = document.getElementById('submit-rating-btn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => submitRating(routeId));
  }
}

/* ── Submit Rating ────────────────────────────────────────── */

/**
 * Tampilkan pesan validasi rating.
 * @param {string} message
 */
function showRatingValidation(message) {
  const el = document.getElementById('rating-validation');
  if (!el) return;
  el.innerHTML = `
    <div class="alert-banner alert-banner-warning">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
  el.style.display = 'block';
}

/**
 * Sembunyikan pesan validasi rating.
 */
function hideRatingValidation() {
  const el = document.getElementById('rating-validation');
  if (el) el.style.display = 'none';
}

/**
 * Submit rating ke API.
 * @param {number} routeId
 */
async function submitRating(routeId) {
  // Validasi: score harus 1–5
  if (!selectedScore || selectedScore < 1 || selectedScore > 5) {
    showRatingValidation('Harap pilih rating bintang (1–5) sebelum mengirim.');
    return;
  }

  hideRatingValidation();

  const commentEl = document.getElementById('rating-comment');
  const comment   = commentEl ? commentEl.value.trim() : '';

  const submitBtn = document.getElementById('submit-rating-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';
  }

  try {
    await apiFetch('/api/v1/ratings', {
      method: 'POST',
      body: JSON.stringify({
        route_id: routeId,
        score:    selectedScore,
        comment:  comment || undefined,
      }),
    });

    showToast('Penilaian berhasil dikirim! Terima kasih.', 'success');

    // Reset form
    selectedScore = 0;
    const starBtns = document.querySelectorAll('#star-input .star-btn');
    starBtns.forEach((btn) => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-checked', 'false');
    });
    if (commentEl) commentEl.value = '';
    const counterEl = document.getElementById('comment-counter');
    if (counterEl) counterEl.textContent = '0 / 200';

    // Refresh tampilan rating
    await fetchAndRenderRating(routeId);
  } catch (err) {
    if (err.status === 400) {
      showRatingValidation(
        (err.body && err.body.error) || 'Nilai rating tidak valid. Harap pilih antara 1–5 bintang.'
      );
    } else {
      showToast('Gagal mengirim penilaian. Silakan coba lagi nanti.', 'error');
      console.error('[Rating] Gagal submit rating:', err);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '⭐ Kirim Penilaian';
    }
  }
}

/* ── Fetch Rating ─────────────────────────────────────────── */

/**
 * Fetch dan render data rating untuk rute.
 * @param {number} routeId
 */
async function fetchAndRenderRating(routeId) {
  try {
    const data = await apiFetch(`/api/v1/ratings/${routeId}`);
    renderRatingSection(data, routeId);
  } catch (err) {
    const el = document.getElementById('rating-section');
    if (el) {
      el.innerHTML = `
        <div class="alert-banner alert-banner-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>Gagal memuat data rating. Silakan coba lagi nanti.</span>
        </div>`;
    }
    console.error('[Rating] Gagal fetch rating:', err);
  }
}

/* ── Fetch Detail Rute ────────────────────────────────────── */

/**
 * Fetch detail rute dari API dan render ke halaman.
 * @param {number} routeId
 */
async function fetchAndRenderRouteDetail(routeId) {
  try {
    showLoading(true);
    const route = await apiFetch(`/api/v1/routes/${routeId}`);

    renderRouteInfo(route);
    renderStopsList(route.stops || []);
  } catch (err) {
    if (err.status === 404) {
      // Rute tidak ditemukan — tampilkan pesan 404 yang ramah
      const routeInfoEl = document.getElementById('route-info');
      if (routeInfoEl) {
        routeInfoEl.innerHTML = `
          <div class="card mb-6" role="alert">
            <div style="text-align:center;padding:2rem 1rem;">
              <p style="font-size:2rem;margin-bottom:0.5rem;">🚌</p>
              <h2 style="font-size:1.125rem;font-weight:600;color:var(--text-primary);margin-bottom:0.5rem;">
                Rute Tidak Ditemukan
              </h2>
              <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;">
                Rute yang Anda cari tidak tersedia atau telah dihapus.
              </p>
              <a href="routes.html" class="btn btn-primary">Kembali ke Daftar Rute</a>
            </div>
          </div>`;
      }

      const stopsEl = document.getElementById('stops-list');
      if (stopsEl) stopsEl.innerHTML = '';

      const ratingEl = document.getElementById('rating-section');
      if (ratingEl) ratingEl.innerHTML = '';
    } else {
      // Error lain — tampilkan pesan error informatif
      const routeInfoEl = document.getElementById('route-info');
      if (routeInfoEl) {
        routeInfoEl.innerHTML = `
          <div class="alert-banner alert-banner-error mb-6" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>Gagal memuat detail rute. Silakan periksa koneksi internet Anda dan coba lagi nanti.</span>
          </div>`;
      }
      console.error('[RouteDetail] Gagal fetch detail rute:', err);
    }
  } finally {
    showLoading(false);
  }
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  const routeId = getRouteIdFromUrl();

  if (!routeId) {
    // Tidak ada ID di URL — redirect ke daftar rute
    const routeInfoEl = document.getElementById('route-info');
    if (routeInfoEl) {
      routeInfoEl.innerHTML = `
        <div class="card mb-6" role="alert">
          <div style="text-align:center;padding:2rem 1rem;">
            <p style="font-size:2rem;margin-bottom:0.5rem;">🚌</p>
            <h2 style="font-size:1.125rem;font-weight:600;color:var(--text-primary);margin-bottom:0.5rem;">
              ID Rute Tidak Ditemukan
            </h2>
            <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;">
              Harap pilih rute dari daftar rute.
            </p>
            <a href="routes.html" class="btn btn-primary">Lihat Daftar Rute</a>
          </div>
        </div>`;
    }
    return;
  }

  currentRouteId = routeId;

  // Fetch detail rute dan rating secara paralel
  await Promise.all([
    fetchAndRenderRouteDetail(routeId),
    fetchAndRenderRating(routeId),
  ]);
});
