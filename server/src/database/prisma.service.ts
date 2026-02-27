import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

// Neon's serverless driver uses WebSockets internally.
// In Node.js there is no native WebSocket — we supply the 'ws' polyfill.
neonConfig.webSocketConstructor = ws;

/**
 * PrismaService — the single database connection used across the entire app.
 *
 * Prisma 7 requires a driver adapter instead of a plain connection URL.
 * We use PrismaNeon (@prisma/adapter-neon) which creates a connection pool
 * via @neondatabase/serverless, giving us Neon's serverless-friendly pooling.
 *
 * Lifecycle:
 *   onModuleInit    → connects to Neon when the app boots
 *   onModuleDestroy → disconnects cleanly on shutdown
 *
 * If DATABASE_URL is missing (local dev without a DB), the server still starts
 * and the health endpoint works; any DB query will throw at runtime.
 * In production, ensure DATABASE_URL is always set.
 *
 * Schema is intentionally empty in Chunk 1. All models are added in Chunk 2.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL ?? '';

    // PrismaNeon accepts a PoolConfig object (not a Pool instance).
    // Internally it creates a @neondatabase/serverless Pool with this config.
    const adapter = new PrismaNeon({ connectionString });

    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to Neon PostgreSQL');
    } catch (err) {
      // Warn instead of crashing so the health endpoint stays reachable in dev.
      // In production DATABASE_URL must be set and this catch should never fire.
      this.logger.warn(
        `Could not connect to database: ${(err as Error).message}. ` +
          'Set DATABASE_URL in server/.env — see server/.env.example.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
