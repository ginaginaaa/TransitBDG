-- Migration: 001_initial_schema.sql
-- TransitBDG — Initial Database Schema
-- Requirements: 1.5, 2.9, 3.1, 7.2, 8.3, 9.6

-- ============================================================
-- Tabel: routes
-- Menyimpan data rute transportasi publik (TMB dan angkot)
-- ============================================================
CREATE TABLE routes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('TMB', 'angkot')),
    origin      VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    path_coords JSONB        NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabel: stops
-- Menyimpan halte-halte yang terkait dengan setiap rute
-- ============================================================
CREATE TABLE stops (
    id         SERIAL PRIMARY KEY,
    route_id   INTEGER       NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    name       VARCHAR(255)  NOT NULL,
    lat        DECIMAL(10,7) NOT NULL,
    lng        DECIMAL(10,7) NOT NULL,
    sequence   INTEGER       NOT NULL,
    status     VARCHAR(50)   NOT NULL DEFAULT 'aktif',
    created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabel: reports
-- Menyimpan laporan gangguan dari masyarakat
-- ============================================================
CREATE TABLE reports (
    id                SERIAL PRIMARY KEY,
    report_code       VARCHAR(30)   NOT NULL UNIQUE,
    category          VARCHAR(50)   NOT NULL CHECK (category IN ('Kemacetan','Kecelakaan','Kendaraan Rusak','Angkot Ngetem','Halte Rusak')),
    description       VARCHAR(500)  NOT NULL,
    location_text     VARCHAR(255),
    location_lat      DECIMAL(10,7),
    location_lng      DECIMAL(10,7),
    route_id          INTEGER       REFERENCES routes(id) ON DELETE SET NULL,
    photo_url         TEXT,
    status            VARCHAR(20)   NOT NULL DEFAULT 'Diterima' CHECK (status IN ('Diterima','Diproses','Selesai','Ditolak')),
    admin_note        TEXT,
    status_changed_at TIMESTAMPTZ,
    submitted_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabel: ratings
-- Menyimpan penilaian pengguna terhadap rute
-- ============================================================
CREATE TABLE ratings (
    id           SERIAL PRIMARY KEY,
    route_id     INTEGER      NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    score        SMALLINT     NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment      VARCHAR(200),
    submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabel: announcements
-- Menyimpan pengumuman resmi terkait layanan transportasi
-- ============================================================
CREATE TABLE announcements (
    id           SERIAL PRIMARY KEY,
    title        VARCHAR(255) NOT NULL,
    content      TEXT         NOT NULL,
    route_id     INTEGER      REFERENCES routes(id) ON DELETE SET NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    published_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabel: admins
-- Menyimpan akun administrator sistem
-- ============================================================
CREATE TABLE admins (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- Mempercepat query yang sering digunakan pada tabel reports
-- ============================================================

-- Index untuk filter dan sort berdasarkan status laporan
CREATE INDEX idx_reports_status ON reports(status);

-- Index untuk sort dan filter berdasarkan waktu pengiriman
CREATE INDEX idx_reports_submitted_at ON reports(submitted_at DESC);

-- Index untuk filter laporan berdasarkan rute
CREATE INDEX idx_reports_route_id ON reports(route_id);

-- Index untuk filter laporan berdasarkan kategori
CREATE INDEX idx_reports_category ON reports(category);
