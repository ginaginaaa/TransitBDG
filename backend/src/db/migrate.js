/**
 * migrate.js — TransitBDG Database Migration & Seed Script
 *
 * Menjalankan migrasi schema dan seed data secara programatik.
 * Jalankan dari direktori backend: node src/db/migrate.js
 *
 * Requirements: 17.2
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Muat variabel environment sebelum mengimpor pool
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { pool } = require('../config/db');

// Lokasi file SQL
const MIGRATION_FILE = path.join(__dirname, 'migrations', '001_initial_schema.sql');
const SEED_FILE      = path.join(__dirname, 'seeds', '001_tmb_routes.sql');

/**
 * Baca file SQL dari disk.
 * @param {string} filePath - Path absolut ke file SQL
 * @returns {string} Isi file SQL
 */
function readSqlFile(filePath) {
  console.log(`  Membaca file: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Jalankan satu blok SQL menggunakan client.
 * @param {import('pg').PoolClient} client
 * @param {string} sql
 * @param {string} label - Label untuk logging
 */
async function executeSql(client, sql, label) {
  console.log(`  Menjalankan ${label}...`);
  await client.query(sql);
  console.log(`  ✓ ${label} selesai.`);
}

/**
 * Fungsi utama: jalankan migrasi lalu seed.
 */
async function migrate() {
  console.log('=== TransitBDG — Database Migration & Seed ===\n');

  let client;
  try {
    // Ambil client dari pool agar seluruh proses berjalan dalam satu koneksi
    client = await pool.connect();

    // ── Langkah 1: Migrasi schema ──────────────────────────────────────────
    console.log('[1/2] Migrasi schema database...');
    const migrationSql = readSqlFile(MIGRATION_FILE);
    await executeSql(client, migrationSql, '001_initial_schema.sql');

    // ── Langkah 2: Seed data awal ──────────────────────────────────────────
    console.log('\n[2/2] Seed data awal...');
    const seedSql = readSqlFile(SEED_FILE);
    await executeSql(client, seedSql, '001_tmb_routes.sql');

    console.log('\n✓ Migrasi dan seed berhasil diselesaikan.');
  } catch (err) {
    console.error('\n✗ Terjadi kesalahan saat migrasi/seed:');
    console.error(err.message || err);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    // Tutup pool agar proses Node.js dapat keluar dengan bersih
    await pool.end();
  }
}

migrate();
