# Мультистейдж-сборка всего монорепозитория
FROM node:24-bookworm-slim AS build
WORKDIR /app

# Инструменты для native-модуля better-sqlite3 (на случай отсутствия prebuilt-бинаря)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund
# Lockfile мог быть создан на другой платформе — гарантируем сборку native-зависимости под Linux.
RUN npm rebuild better-sqlite3 --build-from-source --no-audit --no-fund \
    || npm rebuild better-sqlite3 || true

COPY server server
COPY web web
RUN npm run build

# Оставляем только прод-зависимости сервера
RUN npm prune --omit=dev --no-audit --no-fund -w server
RUN node -e "const D=require('better-sqlite3');const d=new D(':memory:');console.log('sqlite',d.prepare('select sqlite_version() v').get().v)"

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    TZ=Europe/Moscow \
    PORT=8080 \
    DATA_DIR=/var/lib/deadline
WORKDIR /app
RUN groupadd -r app && useradd -r -g app app && mkdir -p /var/lib/deadline && chown app:app /var/lib/deadline
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/assets ./server/assets
COPY --from=build /app/web/dist ./web/dist
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/dist/index.js"]
