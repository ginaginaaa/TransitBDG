/**
 * TransitBDG — app.js
 * Inisialisasi global: dark mode, navbar, toast, loading spinner,
 * dan registrasi service worker.
 * Requirements: 15.1, 15.3, 15.4, 15.5, 18.4
 */

/* ── Dark Mode ────────────────────────────────────────────────
   Dibaca dari localStorage SEBELUM DOMContentLoaded agar tidak
   terjadi flash of unstyled content (FOUC).
   ─────────────────────────────────────────────────────────── */

/**
 * Terapkan preferensi dark mode dari localStorage ke <html>.
 * Dipanggil segera (sebelum DOM siap) untuk mencegah FOUC.
 */
function initDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Toggle dark mode: tambah/hapus kelas .dark pada <html>
 * dan simpan preferensi ke localStorage.
 */
function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
}

// Terapkan dark mode SEGERA — sebelum DOM siap — untuk mencegah FOUC
initDarkMode();

/* ── Navbar ───────────────────────────────────────────────── */

/**
 * Render navbar ke dalam elemen <nav id="navbar">.
 * Menandai link aktif berdasarkan pathname saat ini.
 */
function renderNavbar() {
  const navEl = document.getElementById('navbar');
  if (!navEl) return;

  const currentPath = window.location.pathname;

  const links = [
    { href: '/',            label: 'Beranda' },
    { href: '/routes.html', label: 'Rute' },
    { href: '/report.html', label: 'Laporan' },
    { href: '/feed.html',   label: 'Feed' },
  ];

  /**
   * Tentukan apakah link aktif.
   * Beranda hanya aktif jika path persis '/' atau '/index.html'.
   */
  function isActive(href) {
    if (href === '/') {
      return currentPath === '/' || currentPath === '/index.html';
    }
    return currentPath === href || currentPath.endsWith(href);
  }

  const linksHTML = links
    .map(
      ({ href, label }) =>
        `<a href="${href}" class="navbar-link${isActive(href) ? ' active' : ''}"
            aria-current="${isActive(href) ? 'page' : 'false'}">${label}</a>`
    )
    .join('');

  navEl.innerHTML = `
    <span class="navbar-brand">🚌 TransitBDG</span>
    <nav class="navbar-links" aria-label="Navigasi utama">
      ${linksHTML}
    </nav>
    <div class="navbar-actions">
      <button
        class="btn-icon"
        id="dark-mode-toggle"
        onclick="toggleDarkMode()"
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        <span class="dark-mode-icon-light" aria-hidden="true">🌙</span>
        <span class="dark-mode-icon-dark"  aria-hidden="true">☀️</span>
      </button>
    </div>
  `;
}

/* ── Toast Notifications ──────────────────────────────────── */

// Buat container toast jika belum ada
function _getToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Tampilkan toast notification.
 * @param {string} message - Pesan yang ditampilkan
 * @param {'success'|'error'|'info'|'warning'} [type='info'] - Tipe toast
 * @param {number} [duration=3500] - Durasi tampil dalam ms
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = _getToastContainer();

  const icons = {
    success: '✅',
    error:   '❌',
    info:    'ℹ️',
    warning: '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span aria-hidden="true">${icons[type] || icons.info}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ── Loading Spinner ──────────────────────────────────────── */

// Buat overlay loading jika belum ada
function _getLoadingOverlay() {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-label', 'Memuat...');
    overlay.innerHTML = '<div class="spinner" aria-hidden="true"></div>';
    document.body.appendChild(overlay);
  }
  return overlay;
}

/**
 * Tampilkan atau sembunyikan loading spinner.
 * @param {boolean} show - true untuk tampilkan, false untuk sembunyikan
 */
function showLoading(show) {
  const overlay = _getLoadingOverlay();
  if (show) {
    overlay.classList.add('visible');
  } else {
    overlay.classList.remove('visible');
  }
}

/* ── Service Worker Registration ──────────────────────────── */

function _registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[SW] Registered, scope:', registration.scope);
        })
        .catch((err) => {
          console.warn('[SW] Registration failed:', err);
        });
    });
  }
}

_registerServiceWorker();

/* ── DOMContentLoaded ─────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
});
