#!/usr/bin/env node
/**
 * AutoTikTok — CLI
 *
 * Usage:
 *   node src/index.js init-db
 *   node src/index.js scrape
 *   node src/index.js scrape --hashtag funny
 */
import { initDb, closePool } from './database/db.js';
import { scrapeHashtag, scrapeHashtags } from './scraper/tiktok.js';
import { scraper as scraperConfig } from './config.js';

const [,, command, ...rest] = process.argv;

async function main() {
  switch (command) {
    case 'init-db': {
      await initDb();
      break;
    }

    case 'scrape': {
      const hashtagFlag = rest.indexOf('--hashtag');
      if (hashtagFlag !== -1 && rest[hashtagFlag + 1]) {
        await scrapeHashtag(rest[hashtagFlag + 1]);
      } else {
        await scrapeHashtags(scraperConfig.hashtags);
      }
      break;
    }

    default: {
      console.log(`
AutoTikTok — Pipeline automatisé TikTok

Commandes :
  init-db                    Initialise la base de données PostgreSQL
  scrape                     Scrape tous les hashtags configurés (.env HASHTAGS)
  scrape --hashtag <tag>     Scrape un hashtag spécifique (sans #)

Exemples :
  node src/index.js init-db
  node src/index.js scrape --hashtag funny
  node src/index.js scrape
      `);
      process.exit(1);
    }
  }

  await closePool();
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
