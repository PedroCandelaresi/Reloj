import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './logging/http-error.filter';
import { getClientIp, logAccess, logError } from './logging/file-log.util';

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

  // CORS para el frontend Next.js
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

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
