import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

function corsOrigin(): boolean | string | string[] {
  const raw = (process.env.CORS_ORIGIN || '').trim();
  const productionSites = [
    'https://smebuze.com',
    'https://www.smebuze.com',
    'http://localhost:3001',
  ];
  if (process.env.NODE_ENV === 'production') {
    if (!raw || raw === '*') return productionSites;
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length ? list : productionSites;
  }
  if (!raw || raw === '*') return true;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length <= 1 ? list[0] || true : list;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.setGlobalPrefix('api/v1');
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance();
  expressInstance.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: corsOrigin(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
  await app.listen(port, host);
  const msg = `SMEBUZE API running on http://${host}:${port}/api/v1`;
  if (process.env.LOG_FORMAT === 'json') {
    console.log(JSON.stringify({ level: 'info', message: msg, timestamp: new Date().toISOString() }));
  } else {
    console.log(msg);
  }
}

bootstrap().catch((err) => {
  if (process.env.LOG_FORMAT === 'json') {
    console.error(JSON.stringify({ level: 'error', message: err?.message ?? String(err), timestamp: new Date().toISOString() }));
  } else {
    console.error(err);
  }
  process.exit(1);
});
