/**
 * TransitBDG — js/admin/dashboard.js
 * Dasbor admin: ringkasan statistik dan grafik Chart.js.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

/* ── Auth Guard ───────────────────────────────────────────── */

(function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.replace('/admin/login.html');
  }
})();

/* ── Chart Instances ──────────────────────────────────────── */

/** @type {Chart|null} */
let categoryChart = null;

/** @type {Chart|null} */
let trendChart = null;

/* ── Helpers ──────────────────────────────────────────────── */

/**
 * Tampilkan atau sembunyikan banner error statistik.
 * @param {boolean} visible
 * @param {string} [message]
 */
function setStatsError(visible, message) {
  const errorEl = document.getElementById('stats-error');
  if (!errorEl) return;
  if (visible) {
    const textEl = document.getElementById('stats-error-text');
    if (textEl && message) textEl.textContent = message;
    errorEl.classList.add('visible');
  } else {
    errorEl.classList.remove('visible');
  }
}

/**
 * Perbarui nilai kartu ringkasan.
 * @param {string} id - ID elemen
 * @param {number|string} value - Nilai yang ditampilkan
 */
function setSummaryValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value != null ? String(value) : '—';
}

/**
 * Warna-warna untuk kategori laporan.
 */
const CATEGORY_COLORS = {
  'Kemacetan':      { bg: 'rgba(255, 159, 10, 0.75)',  border: '#ff9f0a' },
  'Kecelakaan':     { bg: 'rgba(255, 59, 48, 0.75)',   border: '#ff3b30' },
  'Kendaraan Rusak':{ bg: 'rgba(88, 86, 214, 0.75)',   border: '#5856d6' },
  'Angkot Ngetem':  { bg: 'rgba(52, 199, 89, 0.75)',   border: '#34c759' },
  'Halte Rusak':    { bg: 'rgba(0, 122, 255, 0.75)',   border: '#007aff' },
};

/**
 * Dapatkan warna untuk kategori tertentu (fallback ke abu-abu).
 * @param {string} category
 * @returns {{ bg: string, border: string }}
 */
function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || { bg: 'rgba(110, 110, 115, 0.75)', border: '#6e6e73' };
}

/* ── Fetch & Render: Summary ──────────────────────────────── */

/**
 * Ambil data ringkasan dari API dan tampilkan di kartu.
 * @returns {Promise<void>}
 */
async function fetchAndRenderSummary() {
  try {
    const data = await apiFetch('/api/v1/admin/stats/summary');

    setSummaryValue('stat-today',  data.today ?? data.total_today ?? 0);
    setSummaryValue('stat-active', data.active ?? data.total_active ?? 0);
    setSummaryValue('stat-done',   data.done ?? data.total_done ?? data.total_selesai ?? 0);
    setSummaryValue('stat-routes', data.routes ?? data.total_routes ?? 0);

  } catch (err) {
    console.error('[Dashboard] Gagal fetch summary:', err);
    // Set nilai fallback agar skeleton hilang
    ['stat-today', 'stat-active', 'stat-done', 'stat-routes'].forEach((id) =>
      setSummaryValue(id, '—')
    );
    throw err;
  }
}

/* ── Fetch & Render: Pie Chart (per Kategori) ─────────────── */

/**
 * Ambil data distribusi per kategori dan render pie chart.
 * @returns {Promise<void>}
 */
async function fetchAndRenderCategoryChart() {
  const canvas = document.getElementById('category-chart');
  if (!canvas) return;

  try {
    const data = await apiFetch('/api/v1/admin/stats/reports-by-category');

    // data bisa berupa array [{ category, count }] atau objek { data: [...] }
    const items = Array.isArray(data) ? data : (data.data || []);

    const labels = items.map((item) => item.category || item.label || '');
    const counts = items.map((item) => Number(item.count || item.value || 0));
    const bgColors = labels.map((cat) => getCategoryColor(cat).bg);
    const borderColors = labels.map((cat) => getCategoryColor(cat).border);

    // Hancurkan chart lama jika ada
    if (categoryChart) {
      categoryChart.destroy();
      categoryChart = null;
    }

    categoryChart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text-primary').trim() || '#1d1d1f',
              font: { family: 'Inter, sans-serif', size: 12 },
              padding: 16,
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} laporan`,
            },
          },
        },
      },
    });

  } catch (err) {
    console.error('[Dashboard] Gagal fetch category chart:', err);
    // Tampilkan pesan di dalam canvas area
    const container = canvas.parentElement;
    if (container) {
      canvas.style.display = 'none';
      const msg = document.createElement('p');
      msg.className = 'text-muted';
      msg.style.cssText = 'text-align:center;padding:2rem 0;font-size:0.875rem;';
      msg.textContent = 'Gagal memuat data grafik kategori.';
      container.appendChild(msg);
    }
    throw err;
  }
}

/* ── Fetch & Render: Line Chart (Tren Harian) ─────────────── */

/**
 * Ambil data tren harian dan render line chart.
 * @returns {Promise<void>}
 */
async function fetchAndRenderTrendChart() {
  const canvas = document.getElementById('trend-chart');
  if (!canvas) return;

  try {
    const data = await apiFetch('/api/v1/admin/stats/daily-trend');

    // data bisa berupa array [{ date, count }] atau objek { data: [...] }
    const items = Array.isArray(data) ? data : (data.data || []);

    const labels = items.map((item) => {
      const dateStr = item.date || item.day || '';
      if (!dateStr) return '';
      try {
        return new Date(dateStr).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        });
      } catch {
        return dateStr;
      }
    });

    const counts = items.map((item) => Number(item.count || item.value || 0));

    // Hancurkan chart lama jika ada
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }

    trendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Jumlah Laporan',
            data: counts,
            borderColor: '#007aff',
            backgroundColor: 'rgba(0, 122, 255, 0.12)',
            borderWidth: 2,
            pointBackgroundColor: '#007aff',
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} laporan`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(110, 110, 115, 0.15)' },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text-secondary').trim() || '#6e6e73',
              font: { family: 'Inter, sans-serif', size: 11 },
              maxTicksLimit: 10,
              maxRotation: 45,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(110, 110, 115, 0.15)' },
            ticks: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text-secondary').trim() || '#6e6e73',
              font: { family: 'Inter, sans-serif', size: 11 },
              precision: 0,
            },
          },
        },
      },
    });

  } catch (err) {
    console.error('[Dashboard] Gagal fetch trend chart:', err);
    // Tampilkan pesan di dalam canvas area
    const container = canvas.parentElement;
    if (container) {
      canvas.style.display = 'none';
      const msg = document.createElement('p');
      msg.className = 'text-muted';
      msg.style.cssText = 'text-align:center;padding:2rem 0;font-size:0.875rem;';
      msg.textContent = 'Gagal memuat data grafik tren harian.';
      container.appendChild(msg);
    }
    throw err;
  }
}

/* ── Inisialisasi ─────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
  showLoading(true);

  // Sembunyikan error sebelumnya
  setStatsError(false);

  // Jalankan semua fetch secara paralel untuk memenuhi target ≤ 3 detik
  const results = await Promise.allSettled([
    fetchAndRenderSummary(),
    fetchAndRenderCategoryChart(),
    fetchAndRenderTrendChart(),
  ]);

  showLoading(false);

  // Periksa apakah ada yang gagal
  const anyFailed = results.some((r) => r.status === 'rejected');
  if (anyFailed) {
    const failedCount = results.filter((r) => r.status === 'rejected').length;
    if (failedCount === results.length) {
      // Semua gagal
      setStatsError(true, 'Gagal memuat data statistik. Pastikan Anda terhubung ke server dan coba muat ulang halaman.');
    } else {
      // Sebagian gagal
      setStatsError(true, 'Beberapa data statistik gagal dimuat. Data yang tersedia tetap ditampilkan.');
    }
  }
});
