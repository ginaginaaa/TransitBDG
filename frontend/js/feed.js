/**
 * TransitBDG — feed.js
 * Feed laporan publik dengan filter kategori + rute, polling 30 detik,
 * dan alert kemacetan otomatis.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.4
 */

/* ── Konstanta ────────────────────────────────────────────── */

const POLL_INTERVAL_MS = 30_000; // 30 detik

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

/* ── Format Tanggal ───────────────────────────────────────── */

/**
 * Format string ISO ke tanggal lokal Indonesia.
 * @param {string} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/* ── Badge Helpers ────────────────────────────────────────── */

/**
 * Kembalikan CSS class badge untuk kategori laporan.
 * @param {string} category
 * @returns {string}
 */
function getCategoryBadgeClass(category) {
  const map = {
    'Kemacetan':      'badge badge-kemacetan',
    'Kecelakaan':     'badge badge-kecelakaan',
    'Kendaraan Rusak':'badge badge-kendaraan-rusak',
    'Angkot Ngetem':  'badge badge-angkot-ngetem',
    'Halte Rusak':    'badge badge-halte-rusak',
  };
  return map[category] || 'badge';
}

/**
 * Kembalikan CSS class badge untuk status laporan.
 * @param {string} status
 * @returns {string}
 */
function getStatusBadgeClass(status) {
  const map = {
    'Diterima': 'badge badge-diterima',
    'Diproses': 'badge badge-diproses',
    'Selesai':  'badge badge-selesai',
    'Ditolak':  'badge badge-ditolak',
  };
  return map[status] || 'badge';
}

/* ── Render Helpers ───────────────────────────────────────── */

/**
 * Potong teks ke panjang maksimal, tambahkan "…" jika dipotong.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(text, maxLen = 150) {
  if (!text) return '';
  const str = String(text);
  return str.length > maxLen ? str.slice(0, maxLen).trimEnd() + '…' : str;
}

/**
 * Render satu kartu laporan sebagai string HTML.
 * @param {Object} report
 * @returns {string}
 */
function renderReportCard(report) {
  const categoryBadge = `<span class="${escapeHtml(getCategoryBadgeClass(report.category))}"
    aria-label="Kategori: ${escapeHtml(report.category)}">${escapeHtml(report.category)}</span>`;

  const statusBadge = `<span class="${escapeHtml(getStatusBadgeClass(report.status))}"
    aria-label="Status: ${escapeHtml(report.status)}">${escapeHtml(report.status)}</span>`;

  const description = escapeHtml(truncate(report.description, 150));

  const locationHtml = report.location_text
    ? `<span class="feed-card-meta-item" aria-label="Lokasi">
         <span aria-hidden="true">📍</span>
         <span>${escapeHtml(report.location_text)}</span>
       </span>`
    : '';

  const routeHtml = report.route_name
    ? `<span class="feed-card-meta-item" aria-label="Rute terkait">
         <span aria-hidden="true">🚌</span>
         <span>${escapeHtml(report.route_name)}</span>
       </span>`
    : '';

  const timeHtml = `<span class="feed-card-meta-item" aria-label="Waktu pengiriman">
    <span aria-hidden="true">🕐</span>
    <time datetime="${escapeHtml(report.submitted_at || '')}">${formatDate(report.submitted_at)}</time>
  </span>`;

  const photoHtml = report.photo_url
    ? `<img
         src="${escapeHtml(report.photo_url)}"
         alt="Foto laporan kategori ${escapeHtml(report.category)}"
         class="feed-card-photo"
         loading="lazy"
       />`
    : '';

  return `
    <article class="feed-card" aria-label="Laporan ${escapeHtml(report.category)}">
      <div class="feed-card-header">
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
          ${categoryBadge}
          ${statusBadge}
        </div>
      </div>
      <p class="feed-card-description">${description}</p>
      <div class="feed-card-meta">
        ${locationHtml}
        ${routeHtml}
        ${timeHtml}
      </div>
      ${photoHtml}
    </article>`;
}

/**
 * Render daftar laporan ke dalam #feed-list.
 * @param {Array} reports
 * @param {string} activeCategory - Filter kategori aktif (untuk pesan kosong)
 * @param {string} activeRouteId  - Filter rute aktif (untuk pesan kosong)
 */
function renderFeed(reports, activeCategory, activeRouteId) {
  const listEl = document.getElementById('feed-list');
  if (!listEl) return;

  if (!reports || reports.length === 0) {
    const hasFilter = activeCategory || activeRouteId;
    const emptyMsg = hasFilter
      ? 'Tidak ada laporan aktif yang sesuai dengan filter yang dipilih. Coba ubah atau hapus filter.'
      : 'Belum ada laporan aktif saat ini. Jadilah yang pertama melaporkan kondisi transportasi!';

    listEl.innerHTML = `
      <p class="empty-state" role="status" aria-live="polite">
        ${escapeHtml(emptyMsg)}
      </p>`;
    return;
  }

  listEl.innerHTML = reports.map(renderReportCard).join('');
}

/**
 * Render alert kemacetan ke dalam #alerts-section.
 * @param {Array} alerts
 */
function renderAlerts(alerts) {
  const sectionEl = document.getElementById('alerts-section');
  if (!sectionEl) return;

  if (!alerts || alerts.length === 0) {
    sectionEl.innerHTML = '';
    return;
  }

  sectionEl.innerHTML = alerts
    .map(
      (alert) => `
      <div class="alert-banner alert-banner-warning mb-2" role="alert"
           aria-label="Alert kemacetan rute ${escapeHtml(alert.name)}">
        <span aria-hidden="true">🚦</span>
        <div>
          <strong>Alert Kemacetan — ${escapeHtml(alert.name)}</strong>
          <span class="text-muted" style="font-size:0.8125rem;margin-left:0.5rem;">
            ${escapeHtml(String(alert.congestion_count))} laporan kemacetan aktif dalam 1 jam terakhir
          </span>
        </div>
      </div>`
    )
    .join('');
}

/* ── Error Banner ─────────────────────────────────────────── */

/**
 * Tampilkan atau sembunyikan banner error feed.
 * @param {string|null} message - null untuk menyembunyikan
 */
function setFeedError(message) {
  const errorEl = document.getElementById('feed-error');
  if (!errorEl) return;

  if (message) {
    errorEl.innerHTML = `
      <div class="alert-banner alert-banner-error">
        <span aria-hidden="true">⚠️</span>
        <span>${escapeHtml(message)}</span>
      </div>`;
    errorEl.style.display = 'block';
  } else {
    errorEl.style.display = 'none';
    errorEl.innerHTML = '';
  }
}

/* ── Fetch Rute untuk Dropdown ────────────────────────────── */

/**
 * Fetch daftar rute dari API dan isi dropdown filter rute.
 */
async function fetchAndPopulateRoutes() {
  try {
    const data = await apiFetch('/api/v1/routes');
    const routes = Array.isArray(data) ? data : (data.routes || []);

    const select = document.getElementById('filter-route');
    if (!select) return;

    routes.forEach((route) => {
      const option = document.createElement('option');
      option.value = route.id;
      option.textContent = `${route.code} — ${route.name}`;
      select.appendChild(option);
    });
  } catch (err) {
    // Dropdown rute gagal dimuat — tidak kritis, filter tetap bisa digunakan tanpa rute
    console.warn('[Feed] Gagal fetch rute untuk dropdown filter:', err);
  }
}

/* ── Fetch Feed ───────────────────────────────────────────── */

/**
 * Baca nilai filter aktif dari dropdown.
 * @returns {{ category: string, routeId: string }}
 */
function getActiveFilters() {
  const category = document.getElementById('filter-category')?.value || '';
  const routeId  = document.getElementById('filter-route')?.value || '';
  return { category, routeId };
}

/**
 * Fetch laporan dari /api/v1/reports/feed dengan filter aktif,
 * lalu render ke #feed-list.
 * @param {boolean} [showSpinner=false] - Tampilkan loading spinner
 */
async function fetchFeed(showSpinner = false) {
  const { category, routeId } = getActiveFilters();

  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (routeId)  params.set('route_id', routeId);

  const queryString = params.toString();
  const path = `/api/v1/reports/feed${queryString ? `?${queryString}` : ''}`;

  if (showSpinner) showLoading(true);

  try {
    const data = await apiFetch(path);
    const reports = Array.isArray(data) ? data : (data.reports || []);

    // Sembunyikan error banner jika sebelumnya ada
    setFeedError(null);

    renderFeed(reports, category, routeId);
  } catch (err) {
    console.error('[Feed] Gagal fetch laporan:', err);
    setFeedError('Gagal memuat laporan. Silakan coba lagi nanti.');
  } finally {
    if (showSpinner) showLoading(false);
  }
}

/* ── Fetch Alert Kemacetan ────────────────────────────────── */

/**
 * Fetch alert kemacetan dari /api/v1/alerts/congestion,
 * lalu render ke #alerts-section.
 */
async function fetchAlerts() {
  try {
    const data = await apiFetch('/api/v1/alerts/congestion');
    renderAlerts(Array.isArray(data) ? data : (data.alerts || []));
  } catch (err) {
    // Alert kemacetan gagal dimuat — tidak crash halaman, cukup log
    console.warn('[Feed] Gagal fetch alert kemacetan:', err);
  }
}

/* ── Refresh Semua ────────────────────────────────────────── */

/**
 * Refresh feed laporan DAN alert kemacetan secara bersamaan.
 * Dipanggil oleh polling interval.
 */
async function refreshAll() {
  await Promise.all([fetchFeed(), fetchAlerts()]);
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  // Tampilkan loading spinner saat inisialisasi awal
  showLoading(true);

  try {
    // Isi dropdown rute dan muat feed + alert secara paralel
    await Promise.all([
      fetchAndPopulateRoutes(),
      fetchFeed(),
      fetchAlerts(),
    ]);
  } finally {
    showLoading(false);
  }

  // Tombol "Terapkan Filter"
  const applyBtn = document.getElementById('apply-filter-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      fetchFeed(true);
    });
  }

  // Polling setiap 30 detik: refresh feed + alert kemacetan
  setInterval(refreshAll, POLL_INTERVAL_MS);
});
