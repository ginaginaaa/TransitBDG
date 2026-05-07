/**
 * TransitBDG Admin — reports.js
 * Pengelolaan laporan: tabel, filter, ubah status, catatan internal, ekspor CSV.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 14.1, 14.2, 14.3, 14.4
 */

/* ── Auth Guard ───────────────────────────────────────────── */

(function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/admin/login.html';
  }
})();

/* ── Logout ───────────────────────────────────────────────── */

function adminLogout() {
  localStorage.removeItem('token');
  window.location.href = '/admin/login.html';
}

/* ── State ────────────────────────────────────────────────── */

/** ID laporan yang sedang dibuka di modal */
let currentReportId = null;

/* ── Helpers ──────────────────────────────────────────────── */

/**
 * Escape HTML untuk mencegah XSS.
 * @param {string|null|undefined} str
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

/**
 * Format tanggal ISO ke string lokal Indonesia.
 * @param {string|null|undefined} isoString
 * @returns {string}
 */
function formatDate(isoString) {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Kembalikan kelas badge CSS berdasarkan status laporan.
 * @param {string} status
 * @returns {string}
 */
function statusBadgeClass(status) {
  const map = {
    Diterima: 'badge-diterima',
    Diproses: 'badge-diproses',
    Selesai:  'badge-selesai',
    Ditolak:  'badge-ditolak',
  };
  return map[status] || '';
}

/**
 * Tentukan transisi status yang valid dari status saat ini.
 * Alur: Diterima → Diproses → Selesai, Diterima → Ditolak
 * @param {string} currentStatus
 * @returns {{ label: string, value: string }[]}
 */
function getValidTransitions(currentStatus) {
  const transitions = {
    Diterima: [
      { label: 'Proses',  value: 'Diproses' },
      { label: 'Tolak',   value: 'Ditolak'  },
    ],
    Diproses: [
      { label: 'Selesaikan', value: 'Selesai' },
    ],
    Selesai:  [],
    Ditolak:  [],
  };
  return transitions[currentStatus] || [];
}

/* ── Collect Active Filters ───────────────────────────────── */

/**
 * Kumpulkan nilai filter aktif dari form.
 * @returns {{ status: string, category: string, date_from: string, date_to: string }}
 */
function getActiveFilters() {
  return {
    status:    document.getElementById('filter-status')?.value    || '',
    category:  document.getElementById('filter-category')?.value  || '',
    date_from: document.getElementById('filter-date-from')?.value || '',
    date_to:   document.getElementById('filter-date-to')?.value   || '',
  };
}

/* ── Fetch & Render Reports ───────────────────────────────── */

/**
 * Ambil laporan dari API dengan filter aktif dan render ke tabel.
 */
async function fetchAndRenderReports() {
  const filters = getActiveFilters();
  const params = new URLSearchParams();
  if (filters.status)    params.set('status',    filters.status);
  if (filters.category)  params.set('category',  filters.category);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to)   params.set('date_to',   filters.date_to);

  const query = params.toString() ? `?${params.toString()}` : '';

  showLoading(true);
  hideError();

  try {
    const data = await apiFetch(`/api/v1/admin/reports${query}`);
    const reports = Array.isArray(data) ? data : (data.reports || []);
    renderReportsTable(reports);
  } catch (err) {
    showError('Gagal memuat laporan. ' + (err.message || 'Silakan coba lagi.'));
    console.error('[Admin Reports] Gagal fetch laporan:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Render baris tabel laporan.
 * @param {Array} reports
 */
function renderReportsTable(reports) {
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;

  if (!reports || reports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state" role="status">
          Tidak ada laporan yang sesuai filter.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = reports.map((r) => {
    const transitions = getValidTransitions(r.status);
    const actionBtns = transitions.map((t) => {
      let btnClass = 'btn btn-sm btn-secondary';
      if (t.value === 'Diproses') btnClass = 'btn btn-sm btn-warning';
      if (t.value === 'Selesai')  btnClass = 'btn btn-sm btn-success';
      if (t.value === 'Ditolak')  btnClass = 'btn btn-sm btn-danger';
      return `
        <button
          class="${btnClass}"
          onclick="changeStatus(${r.id}, '${escapeHtml(t.value)}')"
          aria-label="${escapeHtml(t.label)} laporan ${escapeHtml(r.report_code)}"
        >${escapeHtml(t.label)}</button>`;
    }).join('');

    return `
      <tr>
        <td>
          <code style="font-size:0.8125rem;color:var(--accent);">${escapeHtml(r.report_code)}</code>
        </td>
        <td>${escapeHtml(r.category)}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${escapeHtml(r.location_text || '-')}
        </td>
        <td style="white-space:nowrap;">${formatDate(r.submitted_at)}</td>
        <td>
          <span class="badge ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>
        </td>
        <td>
          <div style="display:flex;gap:0.375rem;flex-wrap:wrap;align-items:center;">
            ${actionBtns}
            <button
              class="btn btn-sm btn-secondary"
              onclick="openReportModal(${r.id})"
              aria-label="Lihat detail laporan ${escapeHtml(r.report_code)}"
            >Detail</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ── Change Status ────────────────────────────────────────── */

/**
 * Ubah status laporan ke status baru yang valid.
 * @param {number} reportId
 * @param {string} newStatus
 */
async function changeStatus(reportId, newStatus) {
  try {
    await apiFetch(`/api/v1/admin/reports/${reportId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    });
    showToast(`Status laporan diubah ke "${newStatus}".`, 'success');
    await fetchAndRenderReports();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal mengubah status.';
    showToast(msg, 'error');
    console.error('[Admin Reports] Gagal ubah status:', err);
  }
}

/* ── Modal Detail ─────────────────────────────────────────── */

/**
 * Buka modal detail laporan dan muat data lengkap.
 * @param {number} reportId
 */
async function openReportModal(reportId) {
  currentReportId = reportId;
  const modal = document.getElementById('report-modal');
  const body  = document.getElementById('modal-body');
  if (!modal || !body) return;

  body.innerHTML = `<p class="text-muted" style="text-align:center;">Memuat detail...</p>`;
  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');

  try {
    const r = await apiFetch(`/api/v1/admin/reports/${reportId}`);
    renderModalBody(r);
  } catch (err) {
    body.innerHTML = `
      <div class="alert-banner alert-banner-error" role="alert">
        <span aria-hidden="true">⚠️</span>
        <span>Gagal memuat detail laporan. ${escapeHtml(err.message || '')}</span>
      </div>`;
    console.error('[Admin Reports] Gagal fetch detail laporan:', err);
  }
}

/**
 * Render isi modal dengan data laporan lengkap.
 * @param {Object} r - Data laporan dari API
 */
function renderModalBody(r) {
  const body = document.getElementById('modal-body');
  if (!body) return;

  const photoHtml = r.photo_url
    ? `<div class="detail-row">
         <span class="detail-label">Foto</span>
         <img
           src="${escapeHtml(r.photo_url)}"
           alt="Foto laporan ${escapeHtml(r.report_code)}"
           class="report-photo"
           loading="lazy"
         />
       </div>`
    : '';

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
      <div class="detail-row">
        <span class="detail-label">Kode Laporan</span>
        <span class="detail-value">
          <code style="color:var(--accent);">${escapeHtml(r.report_code)}</code>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value">
          <span class="badge ${statusBadgeClass(r.status)}">${escapeHtml(r.status)}</span>
        </span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Kategori</span>
        <span class="detail-value">${escapeHtml(r.category)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Waktu Pengiriman</span>
        <span class="detail-value">${formatDate(r.submitted_at)}</span>
      </div>
    </div>

    <div class="detail-row">
      <span class="detail-label">Lokasi</span>
      <span class="detail-value">${escapeHtml(r.location_text || '-')}</span>
    </div>

    <div class="detail-row">
      <span class="detail-label">Deskripsi</span>
      <span class="detail-value" style="white-space:pre-wrap;">${escapeHtml(r.description)}</span>
    </div>

    ${r.route_id ? `
    <div class="detail-row">
      <span class="detail-label">Rute Terkait</span>
      <span class="detail-value">${escapeHtml(String(r.route_id))}</span>
    </div>` : ''}

    ${r.status_changed_at ? `
    <div class="detail-row">
      <span class="detail-label">Waktu Perubahan Status</span>
      <span class="detail-value">${formatDate(r.status_changed_at)}</span>
    </div>` : ''}

    ${photoHtml}

    <div class="detail-row">
      <label for="admin-note-input" class="detail-label">Catatan Internal Admin</label>
      <textarea
        id="admin-note-input"
        class="form-textarea"
        placeholder="Tambahkan catatan internal (tidak terlihat oleh publik)..."
        aria-label="Catatan internal admin"
        rows="3"
      >${escapeHtml(r.admin_note || '')}</textarea>
    </div>
  `;
}

/**
 * Tutup modal detail laporan.
 */
function closeReportModal() {
  const modal = document.getElementById('report-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
  currentReportId = null;
}

/**
 * Simpan catatan internal admin untuk laporan yang sedang dibuka.
 */
async function saveAdminNote() {
  if (!currentReportId) return;
  const noteInput = document.getElementById('admin-note-input');
  const note = noteInput ? noteInput.value : '';

  try {
    await apiFetch(`/api/v1/admin/reports/${currentReportId}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ admin_note: note }),
    });
    showToast('Catatan internal berhasil disimpan.', 'success');
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menyimpan catatan.';
    showToast(msg, 'error');
    console.error('[Admin Reports] Gagal simpan catatan:', err);
  }
}

/* ── CSV Export ───────────────────────────────────────────── */

/**
 * Ekspor laporan ke CSV dengan filter aktif, lalu trigger download.
 */
async function exportCsv() {
  const filters = getActiveFilters();
  const params = new URLSearchParams();
  if (filters.status)    params.set('status',    filters.status);
  if (filters.category)  params.set('category',  filters.category);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to)   params.set('date_to',   filters.date_to);

  const query = params.toString() ? `?${params.toString()}` : '';

  showLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `/api/v1/admin/reports/export/csv${query}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (response.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/admin/login.html';
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `laporan-transitbdg-${today}.csv`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('Ekspor CSV berhasil diunduh.', 'success');
  } catch (err) {
    showToast('Gagal mengekspor CSV. ' + (err.message || ''), 'error');
    console.error('[Admin Reports] Gagal ekspor CSV:', err);
  } finally {
    showLoading(false);
  }
}

/* ── Error Banner ─────────────────────────────────────────── */

function showError(message) {
  const el = document.getElementById('reports-error');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="alert-banner alert-banner-error" role="alert">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

function hideError() {
  const el = document.getElementById('reports-error');
  if (el) el.style.display = 'none';
}

/* ── Event Listeners ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Terapkan dark mode (sudah dilakukan oleh app.js, tapi pastikan)
  // Fetch laporan awal
  fetchAndRenderReports();

  // Tombol terapkan filter
  document.getElementById('apply-filter-btn')?.addEventListener('click', fetchAndRenderReports);

  // Tombol reset filter
  document.getElementById('reset-filter-btn')?.addEventListener('click', () => {
    const statusEl   = document.getElementById('filter-status');
    const categoryEl = document.getElementById('filter-category');
    const dateFromEl = document.getElementById('filter-date-from');
    const dateToEl   = document.getElementById('filter-date-to');
    if (statusEl)   statusEl.value   = '';
    if (categoryEl) categoryEl.value = '';
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl)   dateToEl.value   = '';
    fetchAndRenderReports();
  });

  // Tombol ekspor CSV
  document.getElementById('export-csv-btn')?.addEventListener('click', exportCsv);

  // Tombol simpan catatan di modal
  document.getElementById('save-note-btn')?.addEventListener('click', saveAdminNote);

  // Tutup modal saat klik overlay
  document.getElementById('report-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('report-modal')) {
      closeReportModal();
    }
  });

  // Tutup modal dengan Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeReportModal();
  });
});
