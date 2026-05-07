/**
 * TransitBDG — track.js
 * Pelacakan laporan berdasarkan Kode Laporan.
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */

/* ── Konstanta ────────────────────────────────────────────── */

/**
 * Urutan tahap status laporan (untuk progress bar).
 * Ditolak ditangani secara terpisah.
 */
const STATUS_STAGES = ['Diterima', 'Diproses', 'Selesai'];

/**
 * Konfigurasi badge status: warna dan label.
 */
const STATUS_BADGE = {
  Diterima: { cssClass: 'badge-diterima', label: 'Diterima' },
  Diproses: { cssClass: 'badge-diproses', label: 'Diproses' },
  Selesai:  { cssClass: 'badge-selesai',  label: 'Selesai'  },
  Ditolak:  { cssClass: 'badge-ditolak',  label: 'Ditolak'  },
};

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
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

/* ── Render Status Progress ───────────────────────────────── */

/**
 * Render progress bar 4-tahap status laporan.
 * Untuk status Ditolak, tampilkan hanya Diterima → Ditolak.
 * @param {string} currentStatus
 * @returns {string} HTML string
 */
function renderStatusProgress(currentStatus) {
  if (currentStatus === 'Ditolak') {
    // Tampilkan alur Diterima → Ditolak
    return `
      <div class="status-progress" role="list" aria-label="Tahap status laporan">
        <div class="status-step done" role="listitem" aria-label="Diterima - selesai">
          <div class="status-step-dot" aria-hidden="true">✓</div>
          <span class="status-step-label">Diterima</span>
        </div>
        <div class="status-connector filled" aria-hidden="true"></div>
        <div class="status-step rejected" role="listitem" aria-label="Ditolak - status saat ini">
          <div class="status-step-dot" aria-hidden="true">✕</div>
          <span class="status-step-label">Ditolak</span>
        </div>
      </div>`;
  }

  // Alur normal: Diterima → Diproses → Selesai
  const currentIndex = STATUS_STAGES.indexOf(currentStatus);

  const stepsHTML = STATUS_STAGES.map((stage, index) => {
    let stepClass = '';
    let dotContent = index + 1;
    let ariaLabel = stage;

    if (index < currentIndex) {
      stepClass = 'done';
      dotContent = '✓';
      ariaLabel = `${stage} - selesai`;
    } else if (index === currentIndex) {
      stepClass = 'active';
      ariaLabel = `${stage} - status saat ini`;
    } else {
      ariaLabel = `${stage} - belum`;
    }

    const connector = index < STATUS_STAGES.length - 1
      ? `<div class="status-connector${index < currentIndex ? ' filled' : ''}" aria-hidden="true"></div>`
      : '';

    return `
      <div class="status-step ${stepClass}" role="listitem" aria-label="${escapeHtml(ariaLabel)}">
        <div class="status-step-dot" aria-hidden="true">${dotContent}</div>
        <span class="status-step-label">${escapeHtml(stage)}</span>
      </div>
      ${connector}`;
  }).join('');

  return `
    <div class="status-progress" role="list" aria-label="Tahap status laporan">
      ${stepsHTML}
    </div>`;
}

/* ── Render Detail Laporan ────────────────────────────────── */

/**
 * Render kartu detail laporan ke dalam #report-result.
 * @param {Object} report - Data laporan dari API
 */
function renderReportDetail(report) {
  const resultEl = document.getElementById('report-result');
  if (!resultEl) return;

  const status = report.status || 'Diterima';
  const badgeConfig = STATUS_BADGE[status] || STATUS_BADGE['Diterima'];

  const photoHTML = report.photo_url
    ? `<div class="detail-row">
         <span class="detail-label">Foto</span>
         <div class="detail-value">
           <img
             src="${escapeHtml(report.photo_url)}"
             alt="Foto laporan ${escapeHtml(report.report_code)}"
             class="report-photo"
             loading="lazy"
           />
         </div>
       </div>`
    : '';

  const routeHTML = report.route_name
    ? `<div class="detail-row">
         <span class="detail-label">Rute Terkait</span>
         <span class="detail-value">${escapeHtml(report.route_name)}</span>
       </div>`
    : '';

  const adminNoteHTML = report.admin_note
    ? `<div class="detail-row">
         <span class="detail-label">Catatan</span>
         <span class="detail-value">${escapeHtml(report.admin_note)}</span>
       </div>`
    : '';

  const statusChangedHTML = report.status_changed_at
    ? `<div class="detail-row">
         <span class="detail-label">Diperbarui</span>
         <time class="detail-value" datetime="${escapeHtml(report.status_changed_at)}">
           ${formatDate(report.status_changed_at)}
         </time>
       </div>`
    : '';

  resultEl.innerHTML = `
    <article class="card" aria-label="Detail laporan ${escapeHtml(report.report_code)}">

      <!-- Header: Kode + Badge Status -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
        <div>
          <p style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:0.125rem;">Kode Laporan</p>
          <p style="font-size:1.125rem;font-weight:700;color:var(--text-primary);font-family:monospace;letter-spacing:0.04em;">
            ${escapeHtml(report.report_code)}
          </p>
        </div>
        <span class="badge ${escapeHtml(badgeConfig.cssClass)}" aria-label="Status: ${escapeHtml(badgeConfig.label)}">
          ${escapeHtml(badgeConfig.label)}
        </span>
      </div>

      <!-- Progress Bar Status -->
      ${renderStatusProgress(status)}

      <!-- Detail Rows -->
      <div style="margin-top:1rem;">

        <div class="detail-row">
          <span class="detail-label">Kategori</span>
          <span class="detail-value">${escapeHtml(report.category)}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Deskripsi</span>
          <span class="detail-value">${escapeHtml(report.description)}</span>
        </div>

        <div class="detail-row">
          <span class="detail-label">Lokasi</span>
          <span class="detail-value">${escapeHtml(report.location_text || '-')}</span>
        </div>

        ${routeHTML}

        <div class="detail-row">
          <span class="detail-label">Dikirim</span>
          <time class="detail-value" datetime="${escapeHtml(report.submitted_at || '')}">
            ${formatDate(report.submitted_at)}
          </time>
        </div>

        ${statusChangedHTML}
        ${adminNoteHTML}
        ${photoHTML}

      </div>
    </article>`;
}

/* ── Render Pesan Tidak Ditemukan ─────────────────────────── */

/**
 * Tampilkan pesan kode laporan tidak ditemukan.
 * @param {string} code - Kode yang dicari
 */
function renderNotFound(code) {
  const resultEl = document.getElementById('report-result');
  if (!resultEl) return;

  resultEl.innerHTML = `
    <div class="alert-banner alert-banner-warning" role="alert">
      <span aria-hidden="true">🔍</span>
      <div>
        <strong>Kode laporan tidak ditemukan</strong>
        <p style="font-size:0.875rem;margin-top:0.25rem;color:var(--text-secondary);">
          Kode <code style="font-family:monospace;background:var(--accent-light);padding:0.1rem 0.3rem;border-radius:4px;">${escapeHtml(code)}</code>
          tidak ditemukan dalam sistem. Pastikan kode yang Anda masukkan sudah benar.
        </p>
      </div>
    </div>`;
}

/* ── Render Error Umum ────────────────────────────────────── */

/**
 * Tampilkan pesan error umum.
 * @param {string} message
 */
function renderError(message) {
  const resultEl = document.getElementById('report-result');
  if (!resultEl) return;

  resultEl.innerHTML = `
    <div class="alert-banner alert-banner-error" role="alert">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

/* ── Fetch Laporan ────────────────────────────────────────── */

/**
 * Fetch dan tampilkan detail laporan berdasarkan kode.
 * @param {string} code - Kode laporan
 */
async function trackReport(code) {
  const trimmedCode = (code || '').trim().toUpperCase();

  if (!trimmedCode) {
    renderError('Masukkan kode laporan terlebih dahulu.');
    return;
  }

  // Bersihkan hasil sebelumnya
  const resultEl = document.getElementById('report-result');
  if (resultEl) resultEl.innerHTML = '';

  showLoading(true);

  try {
    const report = await apiFetch(`/api/v1/reports/track/${encodeURIComponent(trimmedCode)}`);
    renderReportDetail(report);
  } catch (err) {
    if (err.status === 404) {
      renderNotFound(trimmedCode);
    } else {
      renderError('Gagal mengambil data laporan. Silakan coba lagi nanti.');
      console.error('[Track] Gagal fetch laporan:', err);
    }
  } finally {
    showLoading(false);
  }
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const input   = document.getElementById('track-input');
  const trackBtn = document.getElementById('track-btn');

  // Tombol cari
  if (trackBtn) {
    trackBtn.addEventListener('click', () => {
      trackReport(input ? input.value : '');
    });
  }

  // Enter key pada input
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        trackReport(input.value);
      }
    });
  }

  // Jika ada query param ?code= di URL, langsung cari
  const params = new URLSearchParams(window.location.search);
  const codeParam = params.get('code');
  if (codeParam) {
    if (input) input.value = codeParam;
    trackReport(codeParam);
  }
});
