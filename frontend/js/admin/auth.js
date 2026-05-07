/**
 * TransitBDG — js/admin/auth.js
 * Autentikasi admin: login form handling dan logout.
 * Requirements: 9.1, 9.2, 9.3
 */

/* ── Login Form Handler ───────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (!form) return; // Bukan halaman login, skip

  const errorEl = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    hideError();

    if (!username || !password) {
      showError('Username atau password salah');
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch('/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (data && data.token) {
        localStorage.setItem('token', data.token);
      }

      window.location.href = '/admin/dashboard.html';

    } catch (err) {
      showError('Username atau password salah');
      console.error('[Auth] Login gagal:', err);
    } finally {
      setLoading(false);
    }
  });

  function showError(message) {
    if (!errorEl) return;
    const textEl = document.getElementById('login-error-text');
    if (textEl) textEl.textContent = message;
    errorEl.classList.add('visible');
  }

  function hideError() {
    if (!errorEl) return;
    errorEl.classList.remove('visible');
  }

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

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/admin/login.html';
}

function adminLogout() {
  localStorage.removeItem('token');
  window.location.href = '/admin/login.html';
}
