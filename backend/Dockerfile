FROM node:20-bookworm-slim

WORKDIR /app

# (на всякий) ставим openssl и ca-certificates
RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "./docker-entrypoint.sh"]
