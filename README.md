# TransitBDG

Platform informasi dan pelaporan transportasi publik Kota Bandung berbasis web.

## 🚀 Fitur Utama

### Fitur Publik
- **Informasi Rute**: Daftar rute TMB dan angkot dengan peta interaktif
- **Pencarian Rute**: Cari rute berdasarkan halte asal dan tujuan
- **Laporan Masyarakat**: Kirim laporan masalah transportasi (kemacetan, kecelakaan, dll)
- **Pelacakan Laporan**: Lacak status laporan dengan kode unik
- **Feed Laporan**: Lihat laporan aktif dari masyarakat
- **Rating Rute**: Beri rating dan komentar untuk rute
- **Pengumuman**: Informasi resmi dari pengelola
- **Alert Kemacetan**: Notifikasi real-time untuk kemacetan

### Fitur Admin
- **Dashboard Statistik**: Visualisasi data laporan dengan Chart.js
- **Pengelolaan Laporan**: Ubah status, tambah catatan, ekspor CSV
- **CRUD Rute & Halte**: Kelola data rute dan halte
- **CRUD Pengumuman**: Buat dan kelola pengumuman
- **Autentikasi JWT**: Login aman dengan token

### Fitur Teknis
- **PWA (Progressive Web App)**: Dapat diinstall dan bekerja offline
- **Dark Mode**: Mode gelap otomatis
- **Responsive Design**: Optimal di mobile, tablet, dan desktop
- **Aksesibilitas**: WCAG AA compliant dengan ARIA labels
- **Real-time Updates**: Polling otomatis untuk feed dan alert

## 🛠️ Stack Teknologi

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer + AWS S3
- **CDN**: Amazon CloudFront

### Frontend
- **HTML5** + **Vanilla JavaScript**
- **CSS**: Tailwind CSS (CDN)
- **Maps**: Leaflet.js
- **Charts**: Chart.js
- **PWA**: Service Worker + Manifest

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Amazon ECS (Fargate)
- **Load Balancer**: Application Load Balancer (ALB)
- **CI/CD**: GitHub Actions
- **Registry**: Amazon ECR

## 📁 Struktur Project

```
transit-bdg/
├── backend/                    # Backend API (Node.js/Express)
│   ├── src/
│   │   ├── config/            # Database connection
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── public/        # Public endpoints
│   │   │   └── admin/         # Admin endpoints (protected)
│   │   ├── utils/             # Helper functions
│   │   ├── db/
│   │   │   ├── migrations/    # SQL schema
│   │   │   └── seeds/         # Initial data
│   │   └── index.js           # Express app entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Frontend (HTML/CSS/JS)
│   ├── index.html             # Beranda
│   ├── routes.html            # Daftar rute + peta
│   ├── route-detail.html      # Detail rute + rating
│   ├── report.html            # Formulir laporan
│   ├── track.html             # Pelacakan laporan
│   ├── feed.html              # Feed laporan publik
│   ├── offline.html           # Halaman offline (PWA)
│   ├── admin/                 # Halaman admin
│   │   ├── login.html
│   │   ├── dashboard.html
│   │   ├── reports.html
│   │   ├── routes.html
│   │   └── announcements.html
│   ├── css/
│   │   └── app.css            # Global styles + dark mode
│   ├── js/
│   │   ├── api.js             # API wrapper
│   │   ├── app.js             # Global functions
│   │   └── admin/             # Admin scripts
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # PWA service worker
│   ├── Dockerfile
│   └── nginx.conf
│
├── infra/                      # Infrastructure as Code
│   ├── docker-compose.yml     # Local development
│   └── ecs-task-definition.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD pipeline
│
└── .env.example               # Environment variables template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker & Docker Compose (optional)

### 1. Clone Repository
```bash
git clone <repository-url>
cd transit-bdg
```

### 2. Setup Environment Variables
```bash
cp .env.example backend/.env
# Edit backend/.env dengan konfigurasi Anda
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Setup Database
```bash
# Jalankan migrasi dan seed
npm run migrate
```

### 5. Run Development Server
```bash
# Backend (port 3000)
npm run dev

# Frontend (buka di browser)
# Gunakan Live Server atau serve frontend/ folder
```

## 🐳 Docker Development

### Menggunakan Docker Compose
```bash
# Build dan jalankan semua services
docker-compose -f infra/docker-compose.yml up --build

# Backend: http://localhost:3000
# Frontend: http://localhost:80
# Database: localhost:5432
```

### Stop Services
```bash
docker-compose -f infra/docker-compose.yml down
```

## 📝 Environment Variables

Lihat `.env.example` untuk daftar lengkap. Variabel penting:

```env
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:80

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/transitbdg

# Authentication
JWT_SECRET=your_secret_key_here

# AWS S3 (untuk upload foto)
S3_BUCKET=transitbdg-uploads
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# CloudFront
CLOUDFRONT_URL=https://your-distribution.cloudfront.net
```

## 🔐 Admin Default

Setelah menjalankan seed data:
- **Username**: `admin`
- **Password**: `admin123`

⚠️ **PENTING**: Ganti password default di production!

## 📊 API Endpoints

### Public Endpoints
```
GET    /api/v1/routes                    # Daftar rute
GET    /api/v1/routes/:id                # Detail rute
GET    /api/v1/stops/search              # Pencarian rute
GET    /api/v1/stops/autocomplete        # Autocomplete halte
POST   /api/v1/reports                   # Kirim laporan
GET    /api/v1/reports/track/:code       # Lacak laporan
GET    /api/v1/reports/feed              # Feed laporan
POST   /api/v1/ratings                   # Kirim rating
GET    /api/v1/ratings/:route_id         # Rating rute
GET    /api/v1/announcements             # Pengumuman aktif
GET    /api/v1/alerts/congestion         # Alert kemacetan
```

### Admin Endpoints (Requires JWT)
```
POST   /api/v1/admin/auth/login          # Login admin
GET    /api/v1/admin/reports             # Daftar laporan
PATCH  /api/v1/admin/reports/:id/status  # Ubah status
GET    /api/v1/admin/reports/export/csv  # Ekspor CSV
POST   /api/v1/admin/routes              # Buat rute
PUT    /api/v1/admin/routes/:id          # Update rute
DELETE /api/v1/admin/routes/:id          # Hapus rute
GET    /api/v1/admin/stats/summary       # Statistik dashboard
```

## 🧪 Testing

```bash
# Unit tests (jika ada)
npm test

# Property-based tests (opsional)
npm run test:pbt
```

## 🚢 Deployment

### AWS ECS Deployment

1. **Setup AWS Resources**
   - RDS PostgreSQL instance
   - S3 bucket untuk foto
   - CloudFront distribution
   - ECR repositories (backend & frontend)
   - ECS cluster dengan Fargate
   - Application Load Balancer

2. **Configure Secrets**
   ```bash
   # Simpan secrets di AWS Systems Manager Parameter Store
   aws ssm put-parameter --name /transitbdg/DATABASE_URL --value "..." --type SecureString
   aws ssm put-parameter --name /transitbdg/JWT_SECRET --value "..." --type SecureString
   ```

3. **Deploy via GitHub Actions**
   ```bash
   # Push ke branch main akan trigger deployment otomatis
   git push origin main
   ```

### Manual Deployment
```bash
# Build images
docker build -t transitbdg-backend ./backend
docker build -t transitbdg-frontend ./frontend

# Tag dan push ke ECR
docker tag transitbdg-backend:latest <ecr-url>/transitbdg-backend:latest
docker push <ecr-url>/transitbdg-backend:latest

# Update ECS service
aws ecs update-service --cluster transitbdg-cluster --service transitbdg-backend --force-new-deployment
```

## 🎨 Design System

Project ini menggunakan **Apple Design Language** dengan:
- **Glassmorphism**: Navbar dan cards dengan backdrop blur
- **SF Pro Font**: Inter sebagai fallback
- **Color Palette**: iOS-inspired colors
- **Dark Mode**: Automatic dengan localStorage persistence
- **Accessibility**: WCAG AA compliant

## 📱 PWA Features

- **Installable**: Dapat diinstall sebagai app di mobile/desktop
- **Offline Support**: Service worker cache untuk aset statis
- **Fast Loading**: Cache-first strategy
- **App-like Experience**: Fullscreen mode tanpa browser chrome

## 🔒 Security

- **JWT Authentication**: Token-based auth untuk admin
- **Password Hashing**: bcrypt dengan salt rounds 10
- **Input Validation**: Server-side validation untuk semua input
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Whitelist origins
- **File Upload Validation**: MIME type dan size checks

## 📈 Performance

- **CDN**: CloudFront untuk aset statis dan foto
- **Database Indexing**: Index pada kolom yang sering di-query
- **Lazy Loading**: Images dan components
- **Minification**: Production builds
- **Caching**: Browser cache + service worker

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

[Specify your license here]

## 👥 Team

[Add team members and contributors]

## 📞 Support

Untuk pertanyaan atau dukungan, hubungi:
- Email: [your-email]
- Issues: [GitHub Issues URL]

---

**TransitBDG** - Platform Transportasi Publik Kota Bandung 🚌
