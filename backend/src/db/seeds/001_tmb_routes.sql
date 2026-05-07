-- Seed: 001_tmb_routes.sql
-- TransitBDG — Data Awal Rute TMB dan Akun Admin
-- Requirements: 1.6, 9.6
--
-- File ini bersifat idempotent: menggunakan ON CONFLICT DO NOTHING
-- sehingga aman dijalankan berulang kali tanpa duplikasi data.

-- ============================================================
-- Rute TMB (Trans Metro Bandung)
-- ============================================================

INSERT INTO routes (id, name, code, type, origin, destination, path_coords, created_at, updated_at)
VALUES
    (
        1,
        'TMB Koridor 1',
        'TMB-1',
        'TMB',
        'Leuwipanjang',
        'Dago',
        '[
            {"lat": -6.9607, "lng": 107.5952},
            {"lat": -6.9530, "lng": 107.5980},
            {"lat": -6.9450, "lng": 107.6010},
            {"lat": -6.9370, "lng": 107.6050},
            {"lat": -6.9290, "lng": 107.6100},
            {"lat": -6.9210, "lng": 107.6150},
            {"lat": -6.9130, "lng": 107.6180},
            {"lat": -6.9050, "lng": 107.6200},
            {"lat": -6.8970, "lng": 107.6220},
            {"lat": -6.8890, "lng": 107.6170}
        ]'::jsonb,
        NOW(),
        NOW()
    ),
    (
        2,
        'TMB Koridor 2',
        'TMB-2',
        'TMB',
        'Cicaheum',
        'Cibeureum',
        '[
            {"lat": -6.9020, "lng": 107.6620},
            {"lat": -6.9030, "lng": 107.6540},
            {"lat": -6.9040, "lng": 107.6450},
            {"lat": -6.9050, "lng": 107.6360},
            {"lat": -6.9060, "lng": 107.6270},
            {"lat": -6.9070, "lng": 107.6180},
            {"lat": -6.9080, "lng": 107.6090},
            {"lat": -6.9090, "lng": 107.6000},
            {"lat": -6.9100, "lng": 107.5910},
            {"lat": -6.9110, "lng": 107.5820}
        ]'::jsonb,
        NOW(),
        NOW()
    ),
    (
        3,
        'TMB Koridor 3',
        'TMB-3',
        'TMB',
        'Cicaheum',
        'Sarijadi',
        '[
            {"lat": -6.9020, "lng": 107.6620},
            {"lat": -6.9000, "lng": 107.6540},
            {"lat": -6.8980, "lng": 107.6450},
            {"lat": -6.8960, "lng": 107.6360},
            {"lat": -6.8940, "lng": 107.6270},
            {"lat": -6.8920, "lng": 107.6180},
            {"lat": -6.8900, "lng": 107.6090},
            {"lat": -6.8880, "lng": 107.6000},
            {"lat": -6.8860, "lng": 107.5910},
            {"lat": -6.8840, "lng": 107.5820}
        ]'::jsonb,
        NOW(),
        NOW()
    ),
    (
        4,
        'TMB Koridor 4',
        'TMB-4',
        'TMB',
        'Leuwipanjang',
        'Antapani',
        '[
            {"lat": -6.9607, "lng": 107.5952},
            {"lat": -6.9560, "lng": 107.6020},
            {"lat": -6.9510, "lng": 107.6090},
            {"lat": -6.9460, "lng": 107.6160},
            {"lat": -6.9410, "lng": 107.6230},
            {"lat": -6.9360, "lng": 107.6300},
            {"lat": -6.9310, "lng": 107.6370},
            {"lat": -6.9260, "lng": 107.6440},
            {"lat": -6.9210, "lng": 107.6510},
            {"lat": -6.9160, "lng": 107.6580}
        ]'::jsonb,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO NOTHING;

-- Reset sequence agar tidak bentrok dengan data yang di-insert manual
SELECT setval('routes_id_seq', (SELECT MAX(id) FROM routes));


-- ============================================================
-- Halte TMB
-- Gunakan INSERT ... WHERE NOT EXISTS agar idempotent,
-- karena tabel stops tidak memiliki unique constraint.
-- ============================================================

-- Koridor 1: Leuwipanjang – Dago
INSERT INTO stops (route_id, name, lat, lng, sequence, status)
SELECT v.route_id, v.name, v.lat, v.lng, v.sequence, v.status
FROM (VALUES
    (1, 'Terminal Leuwipanjang',    -6.9607::DECIMAL(10,7), 107.5952::DECIMAL(10,7), 1,  'aktif'),
    (1, 'Halte Pungkur',            -6.9530::DECIMAL(10,7), 107.5980::DECIMAL(10,7), 2,  'aktif'),
    (1, 'Halte Otista',             -6.9450::DECIMAL(10,7), 107.6010::DECIMAL(10,7), 3,  'aktif'),
    (1, 'Halte Alun-Alun Bandung',  -6.9218::DECIMAL(10,7), 107.6069::DECIMAL(10,7), 4,  'aktif'),
    (1, 'Halte Asia Afrika',        -6.9210::DECIMAL(10,7), 107.6090::DECIMAL(10,7), 5,  'aktif'),
    (1, 'Halte Braga',              -6.9170::DECIMAL(10,7), 107.6090::DECIMAL(10,7), 6,  'aktif'),
    (1, 'Halte Tamblong',           -6.9130::DECIMAL(10,7), 107.6100::DECIMAL(10,7), 7,  'aktif'),
    (1, 'Halte Aceh',               -6.9050::DECIMAL(10,7), 107.6150::DECIMAL(10,7), 8,  'aktif'),
    (1, 'Halte Riau',               -6.8980::DECIMAL(10,7), 107.6180::DECIMAL(10,7), 9,  'aktif'),
    (1, 'Halte Dago',               -6.8890::DECIMAL(10,7), 107.6170::DECIMAL(10,7), 10, 'aktif')
) AS v(route_id, name, lat, lng, sequence, status)
WHERE NOT EXISTS (
    SELECT 1 FROM stops WHERE route_id = v.route_id AND sequence = v.sequence
);

-- Koridor 2: Cicaheum – Cibeureum
INSERT INTO stops (route_id, name, lat, lng, sequence, status)
SELECT v.route_id, v.name, v.lat, v.lng, v.sequence, v.status
FROM (VALUES
    (2, 'Terminal Cicaheum',          -6.9020::DECIMAL(10,7), 107.6620::DECIMAL(10,7), 1,  'aktif'),
    (2, 'Halte Pasar Induk Gedebage', -6.9030::DECIMAL(10,7), 107.6540::DECIMAL(10,7), 2,  'aktif'),
    (2, 'Halte Soekarno-Hatta',       -6.9040::DECIMAL(10,7), 107.6450::DECIMAL(10,7), 3,  'aktif'),
    (2, 'Halte Kiaracondong',         -6.9050::DECIMAL(10,7), 107.6360::DECIMAL(10,7), 4,  'aktif'),
    (2, 'Halte Binong',               -6.9060::DECIMAL(10,7), 107.6270::DECIMAL(10,7), 5,  'aktif'),
    (2, 'Halte Alun-Alun Bandung',    -6.9218::DECIMAL(10,7), 107.6069::DECIMAL(10,7), 6,  'aktif'),
    (2, 'Halte Kebon Kawung',         -6.9080::DECIMAL(10,7), 107.6090::DECIMAL(10,7), 7,  'aktif'),
    (2, 'Halte Pasir Kaliki',         -6.9090::DECIMAL(10,7), 107.6000::DECIMAL(10,7), 8,  'aktif'),
    (2, 'Halte Ciroyom',              -6.9100::DECIMAL(10,7), 107.5910::DECIMAL(10,7), 9,  'aktif'),
    (2, 'Terminal Cibeureum',         -6.9110::DECIMAL(10,7), 107.5820::DECIMAL(10,7), 10, 'aktif')
) AS v(route_id, name, lat, lng, sequence, status)
WHERE NOT EXISTS (
    SELECT 1 FROM stops WHERE route_id = v.route_id AND sequence = v.sequence
);

-- Koridor 3: Cicaheum – Sarijadi
INSERT INTO stops (route_id, name, lat, lng, sequence, status)
SELECT v.route_id, v.name, v.lat, v.lng, v.sequence, v.status
FROM (VALUES
    (3, 'Terminal Cicaheum',  -6.9020::DECIMAL(10,7), 107.6620::DECIMAL(10,7), 1,  'aktif'),
    (3, 'Halte Surapati',     -6.9000::DECIMAL(10,7), 107.6540::DECIMAL(10,7), 2,  'aktif'),
    (3, 'Halte Dipatiukur',   -6.8980::DECIMAL(10,7), 107.6450::DECIMAL(10,7), 3,  'aktif'),
    (3, 'Halte Dago',         -6.8890::DECIMAL(10,7), 107.6170::DECIMAL(10,7), 4,  'aktif'),
    (3, 'Halte Setiabudi',    -6.8860::DECIMAL(10,7), 107.6090::DECIMAL(10,7), 5,  'aktif'),
    (3, 'Halte Pasteur',      -6.8840::DECIMAL(10,7), 107.6000::DECIMAL(10,7), 6,  'aktif'),
    (3, 'Halte Sukajadi',     -6.8820::DECIMAL(10,7), 107.5920::DECIMAL(10,7), 7,  'aktif'),
    (3, 'Halte Gegerkalong',  -6.8800::DECIMAL(10,7), 107.5840::DECIMAL(10,7), 8,  'aktif'),
    (3, 'Halte Isola',        -6.8780::DECIMAL(10,7), 107.5760::DECIMAL(10,7), 9,  'aktif'),
    (3, 'Halte Sarijadi',     -6.8760::DECIMAL(10,7), 107.5680::DECIMAL(10,7), 10, 'aktif')
) AS v(route_id, name, lat, lng, sequence, status)
WHERE NOT EXISTS (
    SELECT 1 FROM stops WHERE route_id = v.route_id AND sequence = v.sequence
);

-- Koridor 4: Leuwipanjang – Antapani
INSERT INTO stops (route_id, name, lat, lng, sequence, status)
SELECT v.route_id, v.name, v.lat, v.lng, v.sequence, v.status
FROM (VALUES
    (4, 'Terminal Leuwipanjang', -6.9607::DECIMAL(10,7), 107.5952::DECIMAL(10,7), 1,  'aktif'),
    (4, 'Halte Moh. Toha',       -6.9560::DECIMAL(10,7), 107.6020::DECIMAL(10,7), 2,  'aktif'),
    (4, 'Halte Peta',            -6.9510::DECIMAL(10,7), 107.6090::DECIMAL(10,7), 3,  'aktif'),
    (4, 'Halte Soekarno-Hatta',  -6.9460::DECIMAL(10,7), 107.6160::DECIMAL(10,7), 4,  'aktif'),
    (4, 'Halte Buah Batu',       -6.9410::DECIMAL(10,7), 107.6230::DECIMAL(10,7), 5,  'aktif'),
    (4, 'Halte Gatot Subroto',   -6.9360::DECIMAL(10,7), 107.6300::DECIMAL(10,7), 6,  'aktif'),
    (4, 'Halte Terusan Jakarta', -6.9310::DECIMAL(10,7), 107.6370::DECIMAL(10,7), 7,  'aktif'),
    (4, 'Halte Jakarta',         -6.9260::DECIMAL(10,7), 107.6440::DECIMAL(10,7), 8,  'aktif'),
    (4, 'Halte Padasuka',        -6.9210::DECIMAL(10,7), 107.6510::DECIMAL(10,7), 9,  'aktif'),
    (4, 'Halte Antapani',        -6.9160::DECIMAL(10,7), 107.6580::DECIMAL(10,7), 10, 'aktif')
) AS v(route_id, name, lat, lng, sequence, status)
WHERE NOT EXISTS (
    SELECT 1 FROM stops WHERE route_id = v.route_id AND sequence = v.sequence
);


-- ============================================================
-- Akun Admin Default
-- Username : admin
-- Password : admin123
-- Hash     : bcrypt, salt rounds 10
-- ============================================================
-- PENTING: Ganti password_hash ini sebelum deploy ke production!

INSERT INTO admins (username, password_hash)
VALUES (
    'admin',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
)
ON CONFLICT (username) DO NOTHING;
