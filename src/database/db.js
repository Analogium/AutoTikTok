import pg from 'pg';
import { db as dbConfig } from '../config.js';

const pool = new pg.Pool(dbConfig);

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id          SERIAL PRIMARY KEY,
      tiktok_id   TEXT UNIQUE NOT NULL,
      file_path   TEXT,
      source      TEXT NOT NULL DEFAULT 'tiktok',
      hashtag     TEXT,
      views       BIGINT DEFAULT 0,
      duration    INTEGER,
      title       TEXT,
      used        BOOLEAN NOT NULL DEFAULT FALSE,
      downloaded  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[DB] Tables initialisées.');
}

export async function videoExists(tiktokId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM videos WHERE tiktok_id = $1',
    [tiktokId]
  );
  return rows.length > 0;
}

export async function insertVideo({ tiktokId, hashtag, views, duration, title }) {
  const { rows } = await pool.query(`
    INSERT INTO videos (tiktok_id, hashtag, views, duration, title)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tiktok_id) DO NOTHING
    RETURNING id
  `, [tiktokId, hashtag, views, duration, title]);
  return rows[0]?.id ?? null;
}

export async function markDownloaded(tiktokId, filePath) {
  await pool.query(`
    UPDATE videos SET downloaded = TRUE, file_path = $1
    WHERE tiktok_id = $2
  `, [filePath, tiktokId]);
}

export async function getPendingVideos(limit = 10) {
  const { rows } = await pool.query(`
    SELECT * FROM videos
    WHERE downloaded = TRUE AND used = FALSE
    ORDER BY views DESC
    LIMIT $1
  `, [limit]);
  return rows;
}

export async function closePool() {
  await pool.end();
}
