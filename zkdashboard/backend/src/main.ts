import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS para el frontend Next.js
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });

  // Parsear texto plano en las rutas ADMS (el MB360 envía text/plain)
  app.use('/iclock', express.text({ type: '*/*', limit: '10mb' }));

  // Validación global de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT || 4370;
  await app.listen(port);
  console.log(`Backend corriendo en http://localhost:${port}`);
  console.log(`ADMS endpoint listo en http://0.0.0.0:${port}/iclock`);
  console.log(`Compatibilidad ADMS activa en http://0.0.0.0:${port}/iclock/cdata`);
}

bootstrap();
