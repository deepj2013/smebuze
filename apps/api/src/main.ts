import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

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

function securityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.setGlobalPrefix('api/v1');
  const httpAdapter = app.getHttpAdapter();
  const expressInstance = httpAdapter.getInstance() as express.Express;
  expressInstance.set('trust proxy', 1);
  expressInstance.disable('x-powered-by');
  expressInstance.use(securityHeaders);
  expressInstance.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads'), {
      setHeaders(res, filePath) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'none'; img-src 'self'; style-src 'none'; script-src 'none'",
        );
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        if (filePath.toLowerCase().endsWith('.svg')) {
          res.setHeader('Content-Disposition', 'attachment');
        }
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
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
    maxAge: 86400,
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
