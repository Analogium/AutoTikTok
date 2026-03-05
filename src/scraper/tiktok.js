import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import { scraper as scraperConfig } from '../config.js';
import { videoExists, insertVideo, markDownloaded } from '../database/db.js';

// ---------------------------------------------------------------------------
// Helpers yt-dlp
// ---------------------------------------------------------------------------

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
    });
  });
}

/**
 * Extrait la liste des vidéos d'un hashtag TikTok sans télécharger.
 * Utilise --flat-playlist -J pour obtenir le JSON en une seule passe.
 */
async function extractVideosFromHashtag(hashtag) {
  const url = `https://www.tiktok.com/tag/${hashtag}`;
  console.log(`[SCRAPER] Extraction #${hashtag} → ${url}`);

  let raw;
  try {
    raw = await runYtDlp([
      '--flat-playlist',
      '--playlist-end', String(scraperConfig.maxVideosPerHashtag),
      '--no-warnings',
      '-J',
      url,
    ]);
  } catch (err) {
    console.error(`[SCRAPER] Erreur extraction #${hashtag} :`, err.message);
    return [];
  }

  let info;
  try {
    info = JSON.parse(raw);
  } catch {
    console.error('[SCRAPER] Impossible de parser le JSON yt-dlp');
    return [];
  }

  return (info.entries ?? [])
    .filter(Boolean)
    .map((entry) => ({
      id:       entry.id ?? '',
      url:      entry.url ?? entry.webpage_url ?? '',
      title:    entry.title ?? '',
      views:    entry.view_count ?? 0,
      duration: entry.duration ?? 0,
    }));
}

/**
 * Télécharge une vidéo et retourne son chemin local.
 */
async function downloadVideo(videoUrl, tiktokId) {
  mkdirSync(scraperConfig.downloadsDir, { recursive: true });

  const outputTemplate = path.join(scraperConfig.downloadsDir, `${tiktokId}.%(ext)s`);

  try {
    await runYtDlp([
      '-o', outputTemplate,
      '-f', 'mp4/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--no-warnings',
      videoUrl,
    ]);
  } catch (err) {
    console.error(`[SCRAPER] Erreur download ${tiktokId} :`, err.message);
    return null;
  }

  // Retrouver le fichier téléchargé (extension peut varier)
  const files = readdirSync(scraperConfig.downloadsDir).filter((f) => f.startsWith(tiktokId));
  return files.length > 0 ? path.join(scraperConfig.downloadsDir, files[0]) : null;
}

// ---------------------------------------------------------------------------
// Scraping principal
// ---------------------------------------------------------------------------

export async function scrapeHashtag(hashtag) {
  const videos = await extractVideosFromHashtag(hashtag);
  console.log(`[SCRAPER] #${hashtag} → ${videos.length} vidéos trouvées`);

  const stats = { found: videos.length, skipped: 0, downloaded: 0, errors: 0 };

  for (const video of videos) {
    if (!video.id) {
      stats.errors++;
      continue;
    }

    // Filtre vues (ignoré si TikTok ne retourne pas la donnée)
    if (video.views > 0 && video.views < scraperConfig.minViews) {
      console.log(`[SCRAPER] Skip ${video.id} (${video.views.toLocaleString()} vues)`);
      stats.skipped++;
      continue;
    }

    if (await videoExists(video.id)) {
      console.log(`[SCRAPER] Déjà en base : ${video.id}`);
      stats.skipped++;
      continue;
    }

    await insertVideo({
      tiktokId: video.id,
      hashtag,
      views:    video.views,
      duration: video.duration,
      title:    video.title,
    });

    console.log(`[SCRAPER] Téléchargement ${video.id} (${video.views.toLocaleString()} vues)…`);
    const filePath = await downloadVideo(video.url, video.id);

    if (filePath) {
      await markDownloaded(video.id, filePath);
      console.log(`[SCRAPER] OK → ${filePath}`);
      stats.downloaded++;
    } else {
      stats.errors++;
    }
  }

  return stats;
}

export async function scrapeHashtags(hashtags) {
  const total = { found: 0, skipped: 0, downloaded: 0, errors: 0 };

  for (const hashtag of hashtags) {
    const stats = await scrapeHashtag(hashtag);
    for (const key of Object.keys(total)) total[key] += stats[key];
  }

  console.log('\n[SCRAPER] Résumé :', total);
  return total;
}
