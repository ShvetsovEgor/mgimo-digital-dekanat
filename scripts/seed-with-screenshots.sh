#!/usr/bin/env bash
# 1) Пересоздать демо-данные во временной БД; 2) снять скриншоты через headless Chrome;
# 3) сохранить снимки в каталог, который сервер отдаёт после истечения «срока жизни» демо-базы.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/server/seed-screens}"
TMP="$(mktemp -d)"
cd "$ROOT"
npm run build -w server >/dev/null
npm run build -w web >/dev/null
DB_FILE="$TMP/seed.db" DATA_DIR="$TMP" NODE_ENV=development node --import tsx server/src/seed/run.ts >/dev/null
PORT=8097 TZ=Europe/Moscow DB_FILE="$TMP/seed.db" DATA_DIR="$TMP" NODE_ENV=development node server/dist/index.js >"$TMP/server.log" 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true; rm -rf "$TMP"' EXIT
sleep 2
mkdir -p "$OUT"
node "$ROOT/.tools/screens.mjs" http://127.0.0.1:8097 "$OUT"
echo "Скриншоты сохранены в $OUT"
