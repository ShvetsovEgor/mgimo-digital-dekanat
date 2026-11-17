// Подпись документов и публичная проверка: HMAC-SHA256 по содержимому токена.
// QR ведёт на ${PUBLIC_URL}/verify/<token>; в токене PII нет — только номер и дата.
import crypto from 'node:crypto';
import { config } from '../config.js';

/** `payload = base64url({n, t})`, `mac = base64url(HMAC-SHA256(payload))`, токен = `${payload}.${mac}`. */
export function signDocumentToken(number: string, issuedAtUnix = Math.floor(Date.now() / 1000)): string {
  const payload = Buffer.from(JSON.stringify({ n: number, t: issuedAtUnix })).toString('base64url');
  return `${payload}.${hmac(payload)}`;
}

function hmac(payload: string): string {
  return crypto.createHmac('sha256', config.docSecret).update(payload).digest('base64url');
}

export interface VerifiedDocument {
  verified: boolean;
  number?: string;
  issuedAt?: string;
}

/** Проверка токена за постоянное время. Наружу — только факт подлинности, номер и дата. */
export function verifyDocumentToken(token: string): VerifiedDocument {
  const parts = token.split('.');
  if (parts.length !== 2) return { verified: false };
  const [payload, mac] = parts;
  if (!payload || !mac) return { verified: false };
  const expected = Buffer.from(hmac(payload));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length) return { verified: false };
  if (!crypto.timingSafeEqual(expected, actual)) return { verified: false };
  let data: { n?: unknown; t?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { n?: unknown; t?: unknown };
  } catch {
    return { verified: false };
  }
  const number = typeof data.n === 'string' ? data.n : null;
  const t = typeof data.t === 'number' ? data.t : null;
  if (!number || t === null || !Number.isFinite(t)) return { verified: false };
  return {
    verified: true,
    number: number.slice(0, 40),
    issuedAt: new Date(t * 1000).toISOString(),
  };
}

/** Ссылка для QR и для страницы проверки: ${base}/verify/<token>. */
export function verifyUrl(baseUrl: string, number: string, issuedAtUnix?: number): string {
  return `${baseUrl}/verify/${signDocumentToken(number, issuedAtUnix)}`;
}
