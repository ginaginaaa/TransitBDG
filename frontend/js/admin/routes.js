/**
 * TransitBDG Admin — routes.js
 * CRUD rute dan halte: tabel, modal create/update, hapus dengan konfirmasi, stops CRUD.
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
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

/** ID rute yang sedang diedit (null = mode create) */
let editingRouteId = null;

/** ID halte yang sedang diedit (null = mode create) */
let editingStopId = null;

/** ID rute yang sedang dikelola haltnya */
let currentStopRouteId = null;

/** Set berisi route_id yang sedang ditampilkan stops-nya */
const expandedRoutes = new Set();

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

/* ── Error Banner ─────────────────────────────────────────── */

function showError(message) {
  const el = document.getElementById('routes-error');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `
    <div class="alert-banner alert-banner-error" role="alert">
      <span aria-hidden="true">⚠️</span>
      <span>${escapeHtml(message)}</span>
    </div>`;
}

function hideError() {
  const el = document.getElementById('routes-error');
  if (el) el.style.display = 'none';
}

/* ── Fetch & Render Routes ────────────────────────────────── */

/**
 * Ambil semua rute dari API dan render ke tabel.
 */
async function fetchAndRenderRoutes() {
  showLoading(true);
  hideError();
  try {
    const data = await apiFetch('/api/v1/routes');
    const routes = Array.isArray(data) ? data : (data.routes || []);
    renderRoutesTable(routes);
  } catch (err) {
    showError('Gagal memuat rute. ' + (err.message || 'Silakan coba lagi.'));
    console.error('[Admin Routes] Gagal fetch rute:', err);
  } finally {
    showLoading(false);
  }
}

/**
 * Render baris tabel rute.
 * @param {Array} routes
 */
function renderRoutesTable(routes) {
  const tbody = document.getElementById('routes-tbody');
  if (!tbody) return;

  if (!routes || routes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state" role="status">
          Belum ada rute yang terdaftar.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = routes.map((r) => {
    const isExpanded = expandedRoutes.has(r.id);
    return `
      <tr id="route-row-${r.id}">
        <td><code style="font-size:0.8125rem;color:var(--accent);">${escapeHtml(r.code)}</code></td>
        <td>${escapeHtml(r.name)}</td>
        <td>
          <span class="badge" style="background:var(--accent-light);color:var(--accent);">
            ${escapeHtml(r.type)}
          </span>
        </td>
        <td>${escapeHtml(r.origin)}</td>
        <td>${escapeHtml(r.destination)}</td>
        <td>
          <div style="display:flex;gap:0.375rem;flex-wrap:wrap;align-items:center;">
            <button
              class="expand-btn"
              onclick="toggleStops(${r.id})"
              aria-expanded="${isExpanded}"
              aria-controls="stops-section-${r.id}"
              aria-label="${isExpanded ? 'Sembunyikan' : 'Tampilkan'} halte rute ${escapeHtml(r.code)}"
            >${isExpanded ? '▲ Halte' : '▼ Halte'}</button>
            <button
              class="btn btn-sm btn-secondary"
              onclick="openRouteModal(${r.id})"
              aria-label="Edit rute ${escapeHtml(r.code)}"
            >Edit</button>
            <button
              class="btn btn-sm btn-danger"
              onclick="deleteRoute(${r.id}, '${escapeHtml(r.name)}')"
              aria-label="Hapus rute ${escapeHtml(r.code)}"
            >Hapus</button>
          </div>
        </td>
      </tr>
      <tr id="stops-row-${r.id}" style="${isExpanded ? '' : 'display:none;'}">
        <td colspan="6" class="stops-section" id="stops-section-${r.id}">
          <!-- Diisi oleh toggleStops / renderStops -->
        </td>
      </tr>`;
  }).join('');

  // Re-render stops untuk yang sudah di-expand
  expandedRoutes.forEach((routeId) => {
    fetchAndRenderStops(routeId);
  });
}

/* ── Toggle & Render Stops ────────────────────────────────── */

/**
 * Toggle tampilan sub-tabel halte untuk rute tertentu.
 * @param {number} routeId
 */
async function toggleStops(routeId) {
  const stopsRow = document.getElementById(`stops-row-${routeId}`);
  const expandBtn = document.querySelector(`#route-row-${routeId} .expand-btn`);
  if (!stopsRow) return;

  if (expandedRoutes.has(routeId)) {
    expandedRoutes.delete(routeId);
    stopsRow.style.display = 'none';
    if (expandBtn) {
      expandBtn.textContent = '▼ Halte';
      expandBtn.setAttribute('aria-expanded', 'false');
    }
  } else {
    expandedRoutes.add(routeId);
    stopsRow.style.display = '';
    if (expandBtn) {
      expandBtn.textContent = '▲ Halte';
      expandBtn.setAttribute('aria-expanded', 'true');
    }
    await fetchAndRenderStops(routeId);
  }
}

/**
 * Ambil dan render halte untuk rute tertentu.
 * @param {number} routeId
 */
async function fetchAndRenderStops(routeId) {
  const section = document.getElementById(`stops-section-${routeId}`);
  if (!section) return;

  section.innerHTML = `<p class="text-muted" style="font-size:0.8125rem;">Memuat halte...</p>`;

  try {
    const data = await apiFetch(`/api/v1/routes/${routeId}`);
    const stops = data.stops || [];
    renderStops(routeId, stops);
  } catch (err) {
    section.innerHTML = `
      <p style="font-size:0.8125rem;color:#ff3b30;">
        Gagal memuat halte. ${escapeHtml(err.message || '')}
      </p>`;
    console.error(`[Admin Routes] Gagal fetch stops rute ${routeId}:`, err);
  }
}

/**
 * Render sub-tabel halte.
 * @param {number} routeId
 * @param {Array} stops
 */
function renderStops(routeId, stops) {
  const section = document.getElementById(`stops-section-${routeId}`);
  if (!section) return;

  const stopsRows = stops.length === 0
    ? `<tr><td colspan="5" class="empty-state" style="font-size:0.8125rem;">Belum ada halte.</td></tr>`
    : stops.map((s) => `
        <tr>
          <td>${escapeHtml(String(s.sequence || '-'))}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${s.lat != null ? escapeHtml(String(s.lat)) : '-'}</td>
          <td>${s.lng != null ? escapeHtml(String(s.lng)) : '-'}</td>
          <td>
            <div style="display:flex;gap:0.375rem;">
              <button
                class="btn btn-sm btn-secondary"
                onclick="openStopModal(${routeId}, ${s.id})"
                aria-label="Edit halte ${escapeHtml(s.name)}"
              >Edit</button>
              <button
                class="btn btn-sm btn-danger"
                onclick="deleteStop(${s.id}, '${escapeHtml(s.name)}', ${routeId})"
                aria-label="Hapus halte ${escapeHtml(s.name)}"
              >Hapus</button>
            </div>
          </td>
        </tr>`).join('');

  section.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem;">
      <span style="font-size:0.8125rem;font-weight:600;color:var(--text-secondary);">
        Halte (${stops.length})
      </span>
      <button
        class="btn btn-sm btn-primary"
        onclick="openStopModal(${routeId}, null)"
        aria-label="Tambah halte baru untuk rute ini"
      >+ Tambah Halte</button>
    </div>
    <div style="overflow-x:auto;">
      <table class="stops-table" aria-label="Daftar halte rute">
        <thead>
          <tr>
            <th scope="col">Urutan</th>
            <th scope="col">Nama Halte</th>
            <th scope="col">Lat</th>
            <th scope="col">Lng</th>
            <th scope="col">Aksi</th>
          </tr>
        </thead>
        <tbody>${stopsRows}</tbody>
      </table>
    </div>`;
}

/* ── Route Modal ──────────────────────────────────────────── */

/**
 * Buka modal create/edit rute.
 * @param {number|null} routeId - null untuk create, ID untuk edit
 */
async function openRouteModal(routeId = null) {
  editingRouteId = routeId;
  const modal = document.getElementById('route-modal');
  const title = document.getElementById('route-modal-title');
  if (!modal) return;

  // Reset form
  clearRouteForm();

  if (routeId) {
    if (title) title.textContent = 'Edit Rute';
    // Isi form dengan data rute yang ada
    try {
      const data = await apiFetch(`/api/v1/routes/${routeId}`);
      document.getElementById('route-name').value        = data.name        || '';
      document.getElementById('route-code').value        = data.code        || '';
      document.getElementById('route-type').value        = data.type        || '';
      document.getElementById('route-origin').value      = data.origin      || '';
      document.getElementById('route-destination').value = data.destination || '';
    } catch (err) {
      console.error('[Admin Routes] Gagal fetch detail rute:', err);
    }
  } else {
    if (title) title.textContent = 'Tambah Rute';
  }

  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('route-name')?.focus();
}

/**
 * Tutup modal rute.
 */
function closeRouteModal() {
  const modal = document.getElementById('route-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
  editingRouteId = null;
  clearRouteForm();
}

/**
 * Reset semua field dan error di form rute.
 */
function clearRouteForm() {
  ['route-name', 'route-code', 'route-origin', 'route-destination'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  const typeEl = document.getElementById('route-type');
  if (typeEl) { typeEl.value = ''; typeEl.classList.remove('error'); }

  ['route-name-error', 'route-code-error', 'route-type-error',
   'route-origin-error', 'route-destination-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });

  const modalErr = document.getElementById('route-modal-error');
  if (modalErr) modalErr.style.display = 'none';
}

/**
 * Validasi form rute. Kembalikan true jika valid.
 * @returns {boolean}
 */
function validateRouteForm() {
  let valid = true;

  const fields = [
    { id: 'route-name',        errId: 'route-name-error',        label: 'Nama rute wajib diisi.' },
    { id: 'route-code',        errId: 'route-code-error',        label: 'Kode rute wajib diisi.' },
    { id: 'route-origin',      errId: 'route-origin-error',      label: 'Titik asal wajib diisi.' },
    { id: 'route-destination', errId: 'route-destination-error', label: 'Titik tujuan wajib diisi.' },
  ];

  fields.forEach(({ id, errId, label }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    if (!el || !err) return;
    if (!el.value.trim()) {
      el.classList.add('error');
      err.textContent = label;
      err.style.display = 'block';
      valid = false;
    } else {
      el.classList.remove('error');
      err.style.display = 'none';
    }
  });

  // Validasi tipe: harus TMB atau angkot
  const typeEl  = document.getElementById('route-type');
  const typeErr = document.getElementById('route-type-error');
  if (typeEl && typeErr) {
    if (!typeEl.value || !['TMB', 'angkot'].includes(typeEl.value)) {
      typeEl.classList.add('error');
      typeErr.textContent = 'Tipe kendaraan harus TMB atau angkot.';
      typeErr.style.display = 'block';
      valid = false;
    } else {
      typeEl.classList.remove('error');
      typeErr.style.display = 'none';
    }
  }

  return valid;
}

/**
 * Simpan rute (create atau update).
 */
async function saveRoute() {
  if (!validateRouteForm()) return;

  const payload = {
    name:        document.getElementById('route-name').value.trim(),
    code:        document.getElementById('route-code').value.trim(),
    type:        document.getElementById('route-type').value,
    origin:      document.getElementById('route-origin').value.trim(),
    destination: document.getElementById('route-destination').value.trim(),
  };

  const modalErr = document.getElementById('route-modal-error');

  try {
    if (editingRouteId) {
      await apiFetch(`/api/v1/admin/routes/${editingRouteId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Rute berhasil diperbarui.', 'success');
    } else {
      await apiFetch('/api/v1/admin/routes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Rute baru berhasil ditambahkan.', 'success');
    }
    closeRouteModal();
    await fetchAndRenderRoutes();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menyimpan rute.';
    // Tampilkan error duplikasi kode rute (409)
    if (err.status === 409) {
      const codeErr = document.getElementById('route-code-error');
      const codeEl  = document.getElementById('route-code');
      if (codeErr && codeEl) {
        codeEl.classList.add('error');
        codeErr.textContent = 'Kode rute sudah digunakan. Gunakan kode yang berbeda.';
        codeErr.style.display = 'block';
      }
    } else {
      if (modalErr) {
        modalErr.style.display = 'block';
        modalErr.innerHTML = `
          <div class="alert-banner alert-banner-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>${escapeHtml(msg)}</span>
          </div>`;
      }
    }
    console.error('[Admin Routes] Gagal simpan rute:', err);
  }
}

/* ── Delete Route ─────────────────────────────────────────── */

/**
 * Hapus rute setelah konfirmasi dialog.
 * @param {number} routeId
 * @param {string} routeName
 */
async function deleteRoute(routeId, routeName) {
  const confirmed = window.confirm(
    `Hapus rute "${routeName}"?\n\nSemua halte yang terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`
  );
  if (!confirmed) return;

  try {
    await apiFetch(`/api/v1/admin/routes/${routeId}`, { method: 'DELETE' });
    showToast(`Rute "${routeName}" berhasil dihapus.`, 'success');
    expandedRoutes.delete(routeId);
    await fetchAndRenderRoutes();
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menghapus rute.';
    showToast(msg, 'error');
    console.error('[Admin Routes] Gagal hapus rute:', err);
  }
}

/* ── Stop Modal ───────────────────────────────────────────── */

/**
 * Buka modal create/edit halte.
 * @param {number} routeId
 * @param {number|null} stopId - null untuk create
 */
async function openStopModal(routeId, stopId = null) {
  currentStopRouteId = routeId;
  editingStopId = stopId;

  const modal = document.getElementById('stop-modal');
  const title = document.getElementById('stop-modal-title');
  if (!modal) return;

  clearStopForm();

  if (stopId) {
    if (title) title.textContent = 'Edit Halte';
    // Ambil data halte dari detail rute
    try {
      const data = await apiFetch(`/api/v1/routes/${routeId}`);
      const stop = (data.stops || []).find((s) => s.id === stopId);
      if (stop) {
        document.getElementById('stop-name').value     = stop.name     || '';
        document.getElementById('stop-lat').value      = stop.lat      != null ? stop.lat : '';
        document.getElementById('stop-lng').value      = stop.lng      != null ? stop.lng : '';
        document.getElementById('stop-sequence').value = stop.sequence != null ? stop.sequence : '';
      }
    } catch (err) {
      console.error('[Admin Routes] Gagal fetch detail halte:', err);
    }
  } else {
    if (title) title.textContent = 'Tambah Halte';
  }

  modal.classList.add('visible');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('stop-name')?.focus();
}

/**
 * Tutup modal halte.
 */
function closeStopModal() {
  const modal = document.getElementById('stop-modal');
  if (!modal) return;
  modal.classList.remove('visible');
  modal.setAttribute('aria-hidden', 'true');
  editingStopId = null;
  currentStopRouteId = null;
  clearStopForm();
}

/**
 * Reset form halte.
 */
function clearStopForm() {
  ['stop-name', 'stop-lat', 'stop-lng', 'stop-sequence'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  ['stop-name-error', 'stop-lat-error', 'stop-lng-error'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  });
  const modalErr = document.getElementById('stop-modal-error');
  if (modalErr) modalErr.style.display = 'none';
}

/**
 * Validasi form halte. Kembalikan true jika valid.
 * @returns {boolean}
 */
function validateStopForm() {
  let valid = true;

  const nameEl  = document.getElementById('stop-name');
  const nameErr = document.getElementById('stop-name-error');
  if (nameEl && nameErr) {
    if (!nameEl.value.trim()) {
      nameEl.classList.add('error');
      nameErr.textContent = 'Nama halte wajib diisi.';
      nameErr.style.display = 'block';
      valid = false;
    } else {
      nameEl.classList.remove('error');
      nameErr.style.display = 'none';
    }
  }

  const latEl  = document.getElementById('stop-lat');
  const latErr = document.getElementById('stop-lat-error');
  if (latEl && latErr) {
    if (latEl.value === '' || isNaN(parseFloat(latEl.value))) {
      latEl.classList.add('error');
      latErr.textContent = 'Latitude wajib diisi dengan angka valid.';
      latErr.style.display = 'block';
      valid = false;
    } else {
      latEl.classList.remove('error');
      latErr.style.display = 'none';
    }
  }

  const lngEl  = document.getElementById('stop-lng');
  const lngErr = document.getElementById('stop-lng-error');
  if (lngEl && lngErr) {
    if (lngEl.value === '' || isNaN(parseFloat(lngEl.value))) {
      lngEl.classList.add('error');
      lngErr.textContent = 'Longitude wajib diisi dengan angka valid.';
      lngErr.style.display = 'block';
      valid = false;
    } else {
      lngEl.classList.remove('error');
      lngErr.style.display = 'none';
    }
  }

  return valid;
}

/**
 * Simpan halte (create atau update).
 */
async function saveStop() {
  if (!validateStopForm()) return;

  const payload = {
    name:     document.getElementById('stop-name').value.trim(),
    lat:      parseFloat(document.getElementById('stop-lat').value),
    lng:      parseFloat(document.getElementById('stop-lng').value),
    sequence: parseInt(document.getElementById('stop-sequence').value, 10) || 1,
  };

  const modalErr = document.getElementById('stop-modal-error');

  try {
    if (editingStopId) {
      await apiFetch(`/api/v1/admin/routes/stops/${editingStopId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Halte berhasil diperbarui.', 'success');
    } else {
      await apiFetch(`/api/v1/admin/routes/${currentStopRouteId}/stops`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Halte baru berhasil ditambahkan.', 'success');
    }
    const routeId = currentStopRouteId;
    closeStopModal();
    await fetchAndRenderStops(routeId);
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menyimpan halte.';
    if (modalErr) {
      modalErr.style.display = 'block';
      modalErr.innerHTML = `
        <div class="alert-banner alert-banner-error" role="alert">
          <span aria-hidden="true">⚠️</span>
          <span>${escapeHtml(msg)}</span>
        </div>`;
    }
    console.error('[Admin Routes] Gagal simpan halte:', err);
  }
}

/* ── Delete Stop ──────────────────────────────────────────── */

/**
 * Hapus halte setelah konfirmasi.
 * @param {number} stopId
 * @param {string} stopName
 * @param {number} routeId
 */
async function deleteStop(stopId, stopName, routeId) {
  const confirmed = window.confirm(`Hapus halte "${stopName}"? Tindakan ini tidak dapat dibatalkan.`);
  if (!confirmed) return;

  try {
    await apiFetch(`/api/v1/admin/routes/stops/${stopId}`, { method: 'DELETE' });
    showToast(`Halte "${stopName}" berhasil dihapus.`, 'success');
    await fetchAndRenderStops(routeId);
  } catch (err) {
    const msg = (err.body && err.body.error) || err.message || 'Gagal menghapus halte.';
    showToast(msg, 'error');
    console.error('[Admin Routes] Gagal hapus halte:', err);
  }
}

/* ── Event Listeners ──────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderRoutes();

  // Tombol tambah rute
  document.getElementById('add-route-btn')?.addEventListener('click', () => openRouteModal(null));

  // Tombol simpan rute di modal
  document.getElementById('save-route-btn')?.addEventListener('click', saveRoute);

  // Tombol simpan halte di modal
  document.getElementById('save-stop-btn')?.addEventListener('click', saveStop);

  // Tutup modal rute saat klik overlay
  document.getElementById('route-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('route-modal')) closeRouteModal();
  });

  // Tutup modal halte saat klik overlay
  document.getElementById('stop-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('stop-modal')) closeStopModal();
  });

  // Tutup modal dengan Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeRouteModal();
      closeStopModal();
    }
  });
});
