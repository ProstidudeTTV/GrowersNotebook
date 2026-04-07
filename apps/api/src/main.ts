import './load-env';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './http-exception.filter';

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`${name} environment variable is required`);
  }
  return v;
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  const port = Number(process.env.PORT);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(
      'PORT must be set to a valid TCP port (Render sets this automatically).',
    );
  }

  const listenHost = isProd
    ? requireEnv('LISTEN_HOST')
    : process.env.LISTEN_HOST?.trim() || '127.0.0.1';

  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  const dev = !isProd;
  const webOrigin = process.env.WEB_ORIGIN?.trim();
  if (isProd && !webOrigin) {
    throw new Error(
      'WEB_ORIGIN must be set in production (public origin of the Next.js app, for CORS).',
    );
  }
  const allowedOrigins = (raw: string) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  app.enableCors({
    origin: dev
      ? true
      : (origin, callback) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          if (allowedOrigins(webOrigin!).includes(origin)) {
            callback(null, true);
            return;
          }
          callback(null, false);
        },
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(port, listenHost);
  logger.log(
    `Listening on http://${listenHost}:${port} (health: /health) env=${isProd ? 'production' : 'development'}`,
  );
}

bootstrap().catch((err) => {
  console.error('API failed to start:', err);
  process.exit(1);
});
