import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Request } from 'express';

const LOG_DIR = process.env.LOG_DIR || '/home/reloj/log';

function ensureLogDir() {
  mkdirSync(LOG_DIR, { recursive: true });
}

function writeLog(fileName: string, content: string) {
  try {
    ensureLogDir();
    appendFileSync(join(LOG_DIR, fileName), content, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No se pudo escribir el log ${fileName}: ${message}`);
  }
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0];
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function logAccess(details: {
  ipAddress: string;
  method: string;
  path: string;
  statusCode: number;
  userAgent?: string;
  durationMs: number;
}) {
  const line =
    `[${new Date().toISOString()}] ` +
    `ip=${details.ipAddress} method=${details.method} path="${details.path}" ` +
    `status=${details.statusCode} duration_ms=${details.durationMs} ` +
    `user_agent="${details.userAgent || '-'}"\n`;

  writeLog('access.log', line);
}

export function logAttendance(details: {
  ipAddress: string;
  serialNumber: string;
  table: string;
  method: string;
  path: string;
  body: string;
}) {
  const header =
    `[${new Date().toISOString()}] ` +
    `ip=${details.ipAddress} sn=${details.serialNumber || '-'} ` +
    `table=${details.table || '-'} method=${details.method} path="${details.path}"`;
  const payload = details.body?.trim() || '(sin body)';

  writeLog('asistencias_reloj.log', `${header}\n${payload}\n---\n`);
}

export function logSecurity(details: {
  event: string;
  message: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  serialNumber?: string | null;
}) {
  const line =
    `[${new Date().toISOString()}] ` +
    `event=${details.event} ip=${details.ipAddress || '-'} ` +
    `method=${details.method || '-'} path="${details.path || '-'}" ` +
    `sn=${details.serialNumber || '-'} message="${details.message}"\n`;

  writeLog('security.log', line);
}

export function logError(details: {
  message: string;
  stack?: string;
  ipAddress?: string;
  method?: string;
  path?: string;
  statusCode?: number;
}) {
  const header =
    `[${new Date().toISOString()}] ` +
    `status=${details.statusCode || 500} ` +
    `ip=${details.ipAddress || '-'} ` +
    `method=${details.method || '-'} ` +
    `path="${details.path || '-'}" ` +
    `message="${details.message}"`;
  const stack = details.stack ? `${details.stack}\n` : '';

  writeLog('error.log', `${header}\n${stack}---\n`);
}
