/**
 * TransitBDG — js/admin/auth.js
 * Autentikasi admin: login form handling dan logout.
 * Requirements: 9.1, 9.2, 9.3
 */

/* ── Redirect jika sudah login ────────────────────────────── */

/**
 * Jika token sudah ada di localStorage, langsung redirect ke dashboard.
 * Dipanggil sebelum DOMContentLoaded agar tidak ada flash halaman login.
 * Hanya redirect jika token ada DAN kita tidak sedang dalam proses logout.
 */
(function checkExistingSession() {
  const token = localStorage.getItem('token');
  // Cek flag logout untuk mencegah redirect loop
  const justLoggedOut = sessionStorage.getItem('justLoggedOut');
  if (justLoggedOut) {
    sessionStorage.removeItem('justLoggedOut');
    return;
  }
  if (token) {
    window.location.href = '/admin/dashboard.html';
  }
})();

/* ── Login Form Handler ───────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Sembunyikan error sebelumnya
    hideError();

    // Validasi client-side dasar
    if (!username || !password) {
      showError('Username atau password salah');
      return;
    }

    // Tampilkan state loading
    setLoading(true);

    try {
      const data = await apiFetch('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      // Simpan JWT ke localStorage
      if (data && data.token) {
        localStorage.setItem('token', data.token);
      }

      // Redirect ke dashboard
      window.location.href = '/admin/dashboard.html';

    } catch (err) {
      // Tampilkan pesan error generik — tidak mengungkapkan detail kegagalan
      showError('Username atau password salah');
      console.error('[Auth] Login gagal:', err);
    } finally {
      setLoading(false);
    }
  });

  /**
   * Tampilkan pesan error di area error.
   * @param {string} message
   */
  function showError(message) {
    if (!errorEl) return;
    const textEl = document.getElementById('login-error-text');
    if (textEl) textEl.textContent = message;
    errorEl.classList.add('visible');
  }

  /**
   * Sembunyikan area error.
   */
  function hideError() {
    if (!errorEl) return;
    errorEl.classList.remove('visible');
  }

  /**
   * Set state loading pada tombol submit.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    if (!loginBtn) return;
    if (loading) {
      loginBtn.classList.add('loading');
      loginBtn.disabled = true;
    } else {
      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;
    }
  }
});

/* ── Logout ───────────────────────────────────────────────── */

/**
 * Hapus token dari localStorage dan redirect ke halaman login.
 * Dipanggil dari tombol logout di halaman admin manapun.
 */
function logout() {
  localStorage.removeItem('token');
  // Set flag agar halaman login tidak redirect balik ke dashboard
  sessionStorage.setItem('justLoggedOut', 'true');
  window.location.href = '/admin/login.html';
}
