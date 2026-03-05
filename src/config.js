import 'dotenv/config';

export const db = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'autotiktok',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

export const scraper = {
  minViews:             parseInt(process.env.MIN_VIEWS                || '100000'),
  maxVideosPerHashtag:  parseInt(process.env.MAX_VIDEOS_PER_HASHTAG  || '30'),
  hashtags:             (process.env.HASHTAGS || 'funny,fun,drole').split(',').map(h => h.trim()),
  downloadsDir:         '/app/downloads',
};
