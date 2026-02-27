/**
 * Prisma seed script — populates the database with representative dev data.
 *
 * Run with:  npx prisma db seed
 * Requires:  DATABASE_URL set in server/.env
 *
 * Strategy:
 *   All creates use upsert so the script is idempotent — safe to re-run.
 *   Data is representative of a real user and project to exercise every model.
 */
import { PrismaClient, AccessMode, JobStatus, ReviewStatus } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { WebSocket } from 'ws';
import 'dotenv/config';

// WebSocket polyfill required by @neondatabase/serverless in Node.js
neonConfig.webSocketConstructor = WebSocket;

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🌱 Seeding database...\n');

  // ── User ────────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { githubId: 'seed-github-1' },
    update: {
      name: 'Dev Seed User',
      email: 'dev@example.com',
    },
    create: {
      githubId: 'seed-github-1',
      email: 'dev@example.com',
      name: 'Dev Seed User',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
    },
  });
  console.log(`✓ User:   ${user.id}  (${user.email})`);

  // ── Project ─────────────────────────────────────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      userId: user.id,
      repoUrl: 'https://github.com/seed-user/my-nextjs-app',
      githubOwner: 'seed-user',
      githubRepo: 'my-nextjs-app',
      defaultBranch: 'main',
      accessMode: AccessMode.direct,
      framework: 'next',
      defaultLocale: 'en',
      targetLocales: ['es', 'fr', 'de'],
    },
  });
  console.log(`✓ Project: ${project.id}  (${project.githubOwner}/${project.githubRepo})`);

  // ── Job ─────────────────────────────────────────────────────────────────────
  const job = await prisma.job.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      projectId: project.id,
      status: JobStatus.completed,
      sourceBranch: 'main',
      locales: ['es', 'fr', 'de'],
      prUrl: 'https://github.com/seed-user/my-nextjs-app/pull/1',
      logs: [
        { ts: new Date().toISOString(), level: 'info', message: 'Job started' },
        { ts: new Date().toISOString(), level: 'info', message: 'Framework detected: next' },
        { ts: new Date().toISOString(), level: 'info', message: 'Extracted 3 strings' },
        { ts: new Date().toISOString(), level: 'info', message: 'Translations complete' },
        { ts: new Date().toISOString(), level: 'info', message: 'PR created' },
      ],
      metadata: { extractedCount: 3, translatedCount: 9, durationMs: 12_500 },
    },
  });
  console.log(`✓ Job:    ${job.id}  (${job.status})`);

  // ── SourceStrings ────────────────────────────────────────────────────────────
  const ss1 = await prisma.sourceString.upsert({
    where: { projectId_hash: { projectId: project.id, hash: 'hash-welcome' } },
    update: {},
    create: {
      projectId: project.id,
      hash: 'hash-welcome',
      sourceText: 'Welcome to our app',
      filePath: 'src/app/page.tsx',
      nodeType: 'JSXText',
      context: 'Hero heading on the landing page',
    },
  });

  const ss2 = await prisma.sourceString.upsert({
    where: { projectId_hash: { projectId: project.id, hash: 'hash-signin' } },
    update: {},
    create: {
      projectId: project.id,
      hash: 'hash-signin',
      sourceText: 'Sign in with GitHub',
      filePath: 'src/components/AuthButton.tsx',
      nodeType: 'StringLiteral',
      context: 'Primary call-to-action button text',
    },
  });

  const ss3 = await prisma.sourceString.upsert({
    where: { projectId_hash: { projectId: project.id, hash: 'hash-loading' } },
    update: {},
    create: {
      projectId: project.id,
      hash: 'hash-loading',
      sourceText: 'Loading...',
      filePath: 'src/components/Spinner.tsx',
      nodeType: 'JSXText',
    },
  });
  console.log(`✓ SourceStrings: ${ss1.id}, ${ss2.id}, ${ss3.id}`);

  // ── Translations ─────────────────────────────────────────────────────────────
  for (const [ss, locale, text] of [
    [ss1, 'es', 'Bienvenido a nuestra aplicación'],
    [ss1, 'fr', 'Bienvenue dans notre application'],
    [ss1, 'de', 'Willkommen in unserer App'],
    [ss2, 'es', 'Iniciar sesión con GitHub'],
    [ss2, 'fr', 'Se connecter avec GitHub'],
    [ss2, 'de', 'Mit GitHub anmelden'],
    [ss3, 'es', 'Cargando...'],
    [ss3, 'fr', 'Chargement...'],
    [ss3, 'de', 'Wird geladen...'],
  ] as const) {
    await prisma.translation.upsert({
      where: {
        sourceStringId_targetLocale: {
          sourceStringId: ss.id,
          targetLocale: locale,
        },
      },
      update: {},
      create: {
        sourceStringId: ss.id,
        targetLocale: locale,
        translatedText: text,
        provider: 'deepl',
        confidence: 0.95,
        reviewStatus: ReviewStatus.approved,
      },
    });
  }
  console.log('✓ Translations: 9 created (3 strings × 3 locales)');

  // ── TranslationMemory ────────────────────────────────────────────────────────
  for (const [hash, sourceText, locale, translatedText] of [
    ['hash-welcome', 'Welcome to our app', 'es', 'Bienvenido a nuestra aplicación'],
    ['hash-welcome', 'Welcome to our app', 'fr', 'Bienvenue dans notre application'],
    ['hash-welcome', 'Welcome to our app', 'de', 'Willkommen in unserer App'],
    ['hash-signin', 'Sign in with GitHub', 'es', 'Iniciar sesión con GitHub'],
    ['hash-signin', 'Sign in with GitHub', 'fr', 'Se connecter avec GitHub'],
    ['hash-signin', 'Sign in with GitHub', 'de', 'Mit GitHub anmelden'],
  ] as const) {
    await prisma.translationMemory.upsert({
      where: {
        userId_hash_sourceLocale_targetLocale: {
          userId: user.id,
          hash,
          sourceLocale: 'en',
          targetLocale: locale,
        },
      },
      update: { usageCount: { increment: 1 } },
      create: {
        userId: user.id,
        hash,
        sourceText,
        sourceLocale: 'en',
        targetLocale: locale,
        translatedText,
        provider: 'deepl',
        confidence: 0.95,
        usageCount: 1,
      },
    });
  }
  console.log('✓ TranslationMemory: 6 entries seeded\n');

  console.log('🌱 Seeding complete.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
