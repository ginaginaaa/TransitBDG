/**
 * TransitBDG — api.js
 * Wrapper fetch ke backend REST API.
 * Requirements: 9.4, 9.5
 */

// Di production (ECS/ALB), backend dan frontend ada di host yang sama
// ALB routing: /api/* → backend container, /* → frontend container
const API_BASE = '';

/**
 * Fetch wrapper yang secara otomatis:
 *  - Menambahkan base URL backend
 *  - Menambahkan header Content-Type: application/json (kecuali FormData)
 *  - Menambahkan header Authorization: Bearer <token> dari localStorage
 *  - Mengembalikan parsed JSON
 *  - Melempar error dengan body respons jika status tidak ok
 *
 * @param {string} path - Path API, contoh: '/api/v1/routes'
 * @param {RequestInit} [options={}] - Opsi fetch standar
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Parse body
  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

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
