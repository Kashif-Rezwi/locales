import { defineConfig } from 'prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 configuration file.
 *
 * This file is read by the Prisma CLI for migration and introspection commands:
 *   npx prisma migrate dev       — create a migration
 *   npx prisma migrate deploy    — apply migrations in CI/prod
 *   npx prisma db push           — push schema without migration history
 *   npx prisma db pull           — introspect the live database
 *
 * The connection URL is NOT in schema.prisma (Prisma 7 removed that support).
 * At runtime the URL is passed to PrismaClient via @prisma/adapter-neon in
 * server/src/database/prisma.service.ts.
 */
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
