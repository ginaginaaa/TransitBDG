/**
 * TransitBDG Admin — announcements.js
 * CRUD pengumuman: tabel, modal create/update, toggle aktif/nonaktif, hapus.
 * Requirements: 13.1, 13.2, 13.3, 13.4
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
  sessionStorage.setItem('justLoggedOut', 'true');
  window.location.href = '/admin/login.html';
}

/* ── State ────────────────────────────────────────────────── */

/** ID pengumuman yang sedang diedit (null = mode create) */
let editingAnnouncementId = null;

/* ── Helpers ──────────────────────────────────────────────── */

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

/* ── Error Banner ─────────────────────────────────────────── */

function showError(message) {
  const el = document.getElementById('announcements-error');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="alert-banner alert-banner-error" role="alert">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

function hideError() {
  const el = document.getElementById('announcements-error');
  if (el) el.style.display = 'none';
}

/* ── Fetch Routes for Dropdown ────────────────────────────── */

/**
 * Isi dropdown rute di modal pengumuman.
 */
async function populateRoutesDropdown() {
  const select = document.getElementById('ann-route');
  if (!select) return;

  try {
    const data = await apiFetch('/api/v1/routes');
    const routes = Array.isArray(data) ? data : (data.routes || []);
    const options = routes.map(
      (r) => `<option value="${r.id}">${escapeHtml(r.code)} — ${escapeHtml(r.name)}</option>`
    ).join('');
    select.innerHTML = `<option value="">Tidak ada rute terkait</option>${options}`;
  } catch (err) {
    console.error('[Admin Announcements] Gagal fetch rute untuk dropdown:', err);
  }
}

/* ── Fetch & Render Announcements ─────────────────────────── */

/**
 * Ambil semua pengumuman (aktif dan tidak aktif) dan render ke tabel.
 */
async function fetchAndRenderAnnouncements() {
  showLoading(true);
  hideError();
  try {
    const data = await apiFetch('/api/v1/admin/announcements');
    const announcements = Array.isArray(data) ? data : (data.announcements || []);
    renderAnnouncementsTable(announcements);
  } catch (err) {
    showError('Gagal memuat pengumuman. ' + (err.message || 'Silakan coba lagi.'));
    console.error('[Admin Announcements] Gagal fetch pengumuman:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Render baris tabel pengumuman.
 * @param {Array} announcements
 */
function renderAnnouncementsTable(announcements) {
  const tbody = document.getElementById('announcements-tbody');
  if (!tbody) return;

  if (!announcements || announcements.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state" role="status">
          Belum ada pengumuman.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = announcements.map((ann) => {
    const isActive = ann.is_active;
    const badgeClass = isActive ? 'badge-active' : 'badge-inactive';
    const badgeLabel = isActive ? 'Aktif' : 'Nonaktif';
    const toggleLabel = isActive ? 'Nonaktifkan' : 'Aktifkan';
    const toggleClass = isActive ? 'btn btn-sm btn-warning' : 'btn btn-sm btn-success';

    return `
      <tr>
        <td style="max-width:240px;">
          <span style="font-weight:600;color:var(--text-primary);">${escapeHtml(ann.title)}</span>
        </td>
        <td>${ann.route_id ? escapeHtml(String(ann.route_id)) : '<span class="text-muted">—</span>'}</td>
        <td style="white-space:nowrap;">${formatDate(ann.published_at)}</td>
        <td>
          <span class="badge ${badgeClass}">${badgeLabel}</span>
        </td>
        <td>
          <div style="display:flex;gap:0.375rem;flex-wrap:wrap;align-items:center;">
            <button
              class="${toggleClass}"
              onclick="toggleAnnouncement(${ann.id}, ${isActive})"
              aria-label="${toggleLabel} pengumuman: ${escapeHtml(ann.title)}"
            >${toggleLabel}</button>
            <button
              class="btn btn-sm btn-secondary"
              onclick="openAnnouncementModal(${ann.id})"
              aria-label="Edit pengumuman: ${escapeHtml(ann.title)}"
            >Edit</button>
            <button
              class="btn btn-sm btn-danger"
              onclick="deleteAnnouncement(${ann.id}, '${escapeHtml(ann.title)}')"
              aria-label="Hapus pengumuman: ${escapeHtml(ann.title)}"
            >Hapus</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ── Toggle Active ────────────────────────────────────────── */

/**
 * Toggle status aktif/nonaktif pengumuman tanpa menghapus.
 * @param {number} announcementId
 * @param {boolean} currentlyActive
 */
async function toggleAnnouncement(announcementId, currentlyActive) {
  try {
    await apiFetch(`/api/v1/admin/announcements/${announcementId}/toggle`, {
      method: 'PATCH',
    });
    const newStatus = currentlyActive ? 'dinonaktifkan' : 'diaktifkan';
    showToast(`Pengumuman berhasil ${newStatus}.`, 'success');
    await fetchAndRenderAnnouncements();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal mengubah status pengumuman.';
    showToast(msg, 'error');
    console.error('[Admin Announcements] Gagal toggle pengumuman:', err);
  }
}

/* ── Announcement Modal ───────────────────────────────────── */

/**
 * Buka modal create/edit pengumuman.
 * @param {number|null} announcementId - null untuk create
 */
async function openAnnouncementModal(announcementId = null) {
  editingAnnouncementId = announcementId;
  const modal = document.getElementById('announcement-modal');
  const title = document.getElementById('announcement-modal-title');
  if (!modal) return;

  clearAnnouncementForm();
  await populateRoutesDropdown();

  if (announcementId) {
    if (title) title.textContent = 'Edit Pengumuman';
    // Ambil data pengumuman yang ada
    try {
      // Ambil dari daftar semua pengumuman (tidak ada endpoint GET by ID di admin)
      const data = await apiFetch('/api/v1/admin/announcements');
      const announcements = Array.isArray(data) ? data : (data.announcements || []);
      const ann = announcements.find((a) => a.id === announcementId);
      if (ann) {
        document.getElementById('ann-title').value   = ann.title   || '';
        document.getElementById('ann-content').value = ann.content || '';
        if (ann.route_id) {
          const routeSelect = document.getElementById('ann-route');
          if (routeSelect) routeSelect.value = String(ann.route_id);
        }
      }
    } catch (err) {
      console.error('[Admin Announcements] Gagal fetch detail pengumuman:', err);
    }
  } else {
    if (title) title.textContent = 'Tambah Pengumuman';
  }

  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('ann-title')?.focus();
}

/**
 * Tutup modal pengumuman.
 */
function closeAnnouncementModal() {
  const modal = document.getElementById('announcement-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
  editingAnnouncementId = null;
  clearAnnouncementForm();
}

/**
 * Reset semua field dan error di form pengumuman.
 */
function clearAnnouncementForm() {
  ['ann-title', 'ann-content'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  const routeEl = document.getElementById('ann-route');
  if (routeEl) routeEl.value = '';

  ['ann-title-error', 'ann-content-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });

  const modalErr = document.getElementById('ann-modal-error');
  if (modalErr) modalErr.style.display = 'none';
}

/**
 * Validasi form pengumuman. Kembalikan true jika valid.
 * @returns {boolean}
 */
function validateAnnouncementForm() {
  let valid = true;

  const titleEl  = document.getElementById('ann-title');
  const titleErr = document.getElementById('ann-title-error');
  if (titleEl && titleErr) {
    if (!titleEl.value.trim()) {
      titleEl.classList.add('error');
      titleErr.textContent = 'Judul pengumuman wajib diisi.';
      titleErr.style.display = 'block';
      valid = false;
    } else {
      titleEl.classList.remove('error');
      titleErr.style.display = 'none';
    }
  }

  const contentEl  = document.getElementById('ann-content');
  const contentErr = document.getElementById('ann-content-error');
  if (contentEl && contentErr) {
    if (!contentEl.value.trim()) {
      contentEl.classList.add('error');
      contentErr.textContent = 'Isi pengumuman wajib diisi.';
      contentErr.style.display = 'block';
      valid = false;
    } else {
      contentEl.classList.remove('error');
      contentErr.style.display = 'none';
    }
  }

  return valid;
}

/**
 * Simpan pengumuman (create atau update).
 */
async function saveAnnouncement() {
  if (!validateAnnouncementForm()) return;

  const routeVal = document.getElementById('ann-route')?.value;
  const payload = {
    title:    document.getElementById('ann-title').value.trim(),
    content:  document.getElementById('ann-content').value.trim(),
    route_id: routeVal ? parseInt(routeVal, 10) : null,
  };

  const modalErr = document.getElementById('ann-modal-error');

  try {
    if (editingAnnouncementId) {
      await apiFetch(`/api/v1/admin/announcements/${editingAnnouncementId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Pengumuman berhasil diperbarui.', 'success');
    } else {
      await apiFetch('/api/v1/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Pengumuman baru berhasil ditambahkan.', 'success');
    }
    closeAnnouncementModal();
    await fetchAndRenderAnnouncements();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menyimpan pengumuman.';
    if (modalErr) {
      modalErr.style.display = 'block';
      modalErr.innerHTML = `
        <div class="alert-banner alert-banner-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>${escapeHtml(msg)}</span>
        </div>`;
    }
    console.error('[Admin Announcements] Gagal simpan pengumuman:', err);
  }
}

/* ── Delete Announcement ──────────────────────────────────── */

/**
 * Hapus pengumuman setelah konfirmasi.
 * @param {number} announcementId
 * @param {string} announcementTitle
 */
async function deleteAnnouncement(announcementId, announcementTitle) {
  const confirmed = window.confirm(
    `Hapus pengumuman "${announcementTitle}"?\n\nTindakan ini tidak dapat dibatalkan.`
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/api/v1/admin/announcements/${announcementId}`, { method: 'DELETE' });
    showToast(`Pengumuman "${announcementTitle}" berhasil dihapus.`, 'success');
    await fetchAndRenderAnnouncements();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menghapus pengumuman.';
    showToast(msg, 'error');
    console.error('[Admin Announcements] Gagal hapus pengumuman:', err);
  }
}

/* ── Event Listeners ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderAnnouncements();

  // Tombol tambah pengumuman
  document.getElementById('add-announcement-btn')?.addEventListener('click', () =>
    openAnnouncementModal(null)
  );

  // Tombol simpan pengumuman di modal
  document.getElementById('save-announcement-btn')?.addEventListener('click', saveAnnouncement);

  // Tutup modal saat klik overlay
  document.getElementById('announcement-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('announcement-modal')) {
      closeAnnouncementModal();
    }
  });

  // Tutup modal dengan Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAnnouncementModal();
  });
});
