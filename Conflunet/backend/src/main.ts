import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import helmet from 'helmet';
import { RequestHandler } from 'express';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './logging/http-error.filter';
import { getClientIp, logAccess, logError, logSecurity } from './logging/file-log.util';

interface RateLimitRule {
  name: string;
  method: string;
  path: string;
  windowMs: number;
  limit: number;
  admsCompatibleResponse?: boolean;
}

interface RateLimitEntry {
  resetAt: number;
  count: number;
}

function getEnvNumber(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePath(path: string): string {
  return path.split('?')[0].replace(/\/+$/, '') || '/';
}

function normalizeSerialNumber(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function createRateLimitMiddleware(rules: RateLimitRule[]): RequestHandler {
  const buckets = new Map<string, RateLimitEntry>();

  return (req, res, next) => {
    const requestPath = normalizePath(req.path || req.url || '/');
    const method = req.method.toUpperCase();
    const rule = rules.find(
      (candidate) => candidate.method === method && candidate.path === requestPath,
    );

    if (!rule) {
      next();
      return;
    }

    const now = Date.now();
    const serialNumber = normalizeSerialNumber(req.query.SN);
    const subject = serialNumber || getClientIp(req);
    const bucketKey = `${rule.name}:${subject}`;
    const current = buckets.get(bucketKey);
    const entry =
      current && current.resetAt > now
        ? current
        : {
            resetAt: now + rule.windowMs,
            count: 0,
          };

    entry.count += 1;
    buckets.set(bucketKey, entry);

    if (entry.count <= rule.limit) {
      next();
      return;
    }

    logSecurity({
      event: 'rate_limit_exceeded',
      message: `Límite excedido para ${rule.name}: ${entry.count}/${rule.limit}`,
      ipAddress: getClientIp(req),
      method,
      path: requestPath,
      serialNumber,
    });

    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));

    if (rule.admsCompatibleResponse) {
      res.status(200).type('text/plain').send('OK');
      return;
    }

    res.status(429).json({
      message: 'Demasiados intentos. Probá nuevamente en unos minutos.',
    });
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      logAccess({
        ipAddress: getClientIp(req),
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        userAgent: req.get('user-agent') || undefined,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  // CORS para el frontend Next.js
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  app.use(
    createRateLimitMiddleware([
      {
        name: 'auth_login',
        method: 'POST',
        path: '/auth/login',
        windowMs: getEnvNumber('LOGIN_RATE_LIMIT_WINDOW_MS', 60_000),
        limit: getEnvNumber('LOGIN_RATE_LIMIT_MAX', 10),
      },
      {
        name: 'adms_cdata_post',
        method: 'POST',
        path: '/iclock/cdata',
        windowMs: getEnvNumber('ADMS_CDATA_RATE_LIMIT_WINDOW_MS', 60_000),
        limit: getEnvNumber('ADMS_CDATA_RATE_LIMIT_MAX', 120),
        admsCompatibleResponse: true,
      },
      {
        name: 'adms_cdata_post',
        method: 'POST',
        path: '/iclock',
        windowMs: getEnvNumber('ADMS_CDATA_RATE_LIMIT_WINDOW_MS', 60_000),
        limit: getEnvNumber('ADMS_CDATA_RATE_LIMIT_MAX', 120),
        admsCompatibleResponse: true,
      },
      {
        name: 'adms_getrequest',
        method: 'GET',
        path: '/iclock/getrequest',
        windowMs: getEnvNumber('ADMS_GETREQUEST_RATE_LIMIT_WINDOW_MS', 60_000),
        limit: getEnvNumber('ADMS_GETREQUEST_RATE_LIMIT_MAX', 180),
        admsCompatibleResponse: true,
      },
      {
        name: 'adms_devicecmd',
        method: 'POST',
        path: '/iclock/devicecmd',
        windowMs: getEnvNumber('ADMS_DEVICECMD_RATE_LIMIT_WINDOW_MS', 60_000),
        limit: getEnvNumber('ADMS_DEVICECMD_RATE_LIMIT_MAX', 120),
        admsCompatibleResponse: true,
      },
    ]),
  );

  // Parsear texto plano en las rutas ADMS (el MB360 envía text/plain)
  app.use('/iclock', express.text({ type: '*/*', limit: '10mb' }));

  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new HttpErrorFilter());

  const port = process.env.PORT || 4370;
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}`);
  console.log(`ADMS endpoint listo en http://0.0.0.0:${port}/iclock`);
  console.log(`Compatibilidad ADMS activa en http://0.0.0.0:${port}/iclock/cdata`);
}

bootstrap().catch((error) => {
  logError({
    message: error instanceof Error ? error.message : 'Error al iniciar el backend',
    stack: error instanceof Error ? error.stack : String(error),
  });
  throw error;
});
