require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function fixAdmin() {
  const client = await pool.connect();
  try {
    // Hash untuk "admin123" dengan bcrypt salt rounds 10
    const hash = '$2b$10$bnB7lHDQpoXCYuVVaIMGseqVoR7DGG8U1tfKiL9en4BYxBl6wS82.';
    
    await client.query(
      `INSERT INTO admins (username, password_hash)
       VALUES ('admin', $1)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [hash]
    );
    
    console.log('✓ Admin password updated successfully');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
    // Tambah pengumuman dummy
    await client.query(`
      INSERT INTO announcements (title, content, route_id, is_active, published_at)
      VALUES 
        ('Jadwal Operasional TMB Lebaran 2024', 'Selama libur Lebaran, TMB beroperasi pukul 05.00-22.00 WIB dengan frekuensi 15 menit sekali.', 1, true, NOW()),
        ('Peningkatan Layanan Koridor 2', 'Mulai 1 Juni 2024, TMB Koridor 2 menambah armada baru untuk meningkatkan kenyamanan penumpang.', 2, true, NOW()),
        ('Perbaikan Halte Dago', 'Halte Dago sedang dalam perbaikan. Penumpang dapat naik di halte terdekat.', NULL, true, NOW())
      ON CONFLICT DO NOTHING
    `);
    console.log('✓ Dummy announcements added');
    
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdmin().catch(console.error);
