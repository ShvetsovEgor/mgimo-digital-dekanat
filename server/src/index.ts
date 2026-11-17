// Точка входа: миграции, seed при пустой БД, HTTP-сервер, graceful shutdown, чистка сессий.
import http from 'node:http';
import { config } from './config.js';
import { db } from './db.js';
import { createApp } from './app.js';
import { log } from './http.js';
import { purgeExpiredSessions } from './lib/auth.js';

export function start(): http.Server {
  const app = createApp();
  const server = app.listen(config.port, () => {
    log('info', 'server', { msg: 'listening', port: config.port, env: config.isProd ? 'production' : 'development' });
  });

  // Раз в час удаляем просроченные сессии.
  const cleanup = setInterval(() => {
    try {
      const removed = purgeExpiredSessions();
      if (removed > 0) log('info', 'sessions', { msg: 'purged', removed });
    } catch (err) {
      log('error', 'sessions', { msg: 'purge failed', error: err instanceof Error ? err.message : 'unknown' });
    }
  }, 60 * 60 * 1000);
  cleanup.unref();

  const shutdown = (signal: string) => {
    log('info', 'server', { msg: 'shutdown', signal });
    clearInterval(cleanup);
    server.close(() => {
      try {
        db.close();
      } catch {
        /* уже закрыта */
      }
      process.exit(0);
    });
    // Страховка: если соединения не закрылись за 5 с — выходим.
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    log('error', 'process', { msg: 'unhandledRejection', reason: reason instanceof Error ? reason.message : 'unknown' });
  });
  return server;
}

start();
