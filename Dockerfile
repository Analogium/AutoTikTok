FROM node:24-slim

# yt-dlp + ffmpeg (nécessaire pour merger les streams vidéo/audio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
  && chmod a+rx /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY src/ ./src/

# Les volumes downloads/ et generated_videos/ sont montés depuis le host
VOLUME ["/app/downloads", "/app/generated_videos"]

CMD ["node", "src/index.js"]
