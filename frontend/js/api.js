/**
 * TransitBDG — api.js
 * Wrapper fetch ke backend REST API.
 * Requirements: 9.4, 9.5
 */

const API_BASE = 'http://localhost:3000';

/**
 * Fetch wrapper yang secara otomatis:
 *  - Menambahkan base URL backend
 *  - Menambahkan header Content-Type: application/json (kecuali FormData)
 *  - Menambahkan header Authorization: Bearer <token> dari localStorage
 *  - Meng-handle respons 401 dengan redirect ke /admin/login.html
 *  - Mengembalikan parsed JSON
 *  - Melempar error dengan body respons jika status tidak ok
 *
 * @param {string} path - Path API, contoh: '/api/v1/routes'
 * @param {RequestInit} [options={}] - Opsi fetch standar
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  // Bangun headers
  const headers = { ...(options.headers || {}) };

  // Tambahkan Content-Type JSON kecuali body adalah FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Tambahkan Authorization header jika token tersedia di localStorage
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized — redirect ke halaman login admin
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/admin/login.html';
    // Kembalikan promise yang tidak pernah resolve agar kode pemanggil tidak lanjut
    return new Promise(() => {});
  }

  // Parse body sebagai JSON (atau teks jika bukan JSON)
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Lempar error jika respons tidak ok (4xx / 5xx)
  if (!response.ok) {
    const error = new Error(
      (data && data.error) ||
      (typeof data === 'string' ? data : null) ||
      `HTTP ${response.status}`
    );
    error.status = response.status;
    error.body = data;
    throw error;
  }

  return data;
}
