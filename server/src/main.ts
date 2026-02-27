import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Config ──────────────────────────────────────────────────────────────
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );

  // ── Global prefix ────────────────────────────────────────────────────────
  // All routes become /api/... — avoids collisions with client-side routes
  app.setGlobalPrefix('api');

  // ── CORS ─────────────────────────────────────────────────────────────────
  // Allow requests only from the configured frontend origin
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Validation pipe ───────────────────────────────────────────────────────
  // whitelist:           strips unknown properties from request bodies
  // transform:           converts plain JSON to typed class instances (DTOs)
  // forbidNonWhitelisted: rejects requests containing unexpected properties
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ── Global exception filter ───────────────────────────────────────────────
  // Shapes ALL thrown exceptions into { statusCode, error, message, timestamp, path }
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────────
  // Auto-generated API explorer available at /docs during development
  const swaggerConfig = new DocumentBuilder()
    .setTitle('i18n Orchestration Engine')
    .setDescription(
      'API for automating the full i18n pipeline for React-based web apps',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'GitHub OAuth Token' },
      'github-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // ── Start ─────────────────────────────────────────────────────────────────
  await app.listen(port);
  console.log(`\n🚀 Server running on http://localhost:${port}/api`);
  console.log(`📖 Swagger docs at  http://localhost:${port}/docs\n`);
}

// Explicitly mark the top-level bootstrap promise as intentionally unhandled.
// Node.js will still surface uncaught rejections; this silences the ESLint rule.
void bootstrap();
