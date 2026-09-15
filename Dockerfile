FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=10000
ENV PGCONNECT_TIMEOUT=5
ENV PGOPTIONS="-c statement_timeout=8000"

EXPOSE 10000

CMD ["node", "server/recovery-boot.mjs"]
