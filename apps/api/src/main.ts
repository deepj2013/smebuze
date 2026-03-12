import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
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
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*', credentials: true });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  const msg = `SMEBUZE API running on http://localhost:${port}/api/v1`;
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
