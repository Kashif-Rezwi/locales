import * as Joi from 'joi';

/**
 * Joi validation schema for all environment variables.
 *
 * Required on startup:
 *   DATABASE_URL  — Neon PostgreSQL connection string
 *   FRONTEND_URL  — client origin used for CORS
 *
 * Optional (populated as each service chunk is implemented):
 *   E2B_API_KEY              — workspace isolation (Chunk 8)
 *   LINGO_API_KEY            — translation provider (Chunk 6)
 *   DEEPL_API_KEY            — translation provider (Chunk 6)
 *   GOOGLE_TRANSLATE_API_KEY — translation provider (Chunk 6)
 *   OPENAI_API_KEY           — translation provider (Chunk 6) + PR description (Chunk 11)
 *
 * If a required variable is missing, the server refuses to start with a
 * precise error message (e.g. '"DATABASE_URL" is required').
 */
export const configSchema = Joi.object({
  PORT: Joi.number().default(3001),
  FRONTEND_URL: Joi.string().uri().required(),
  DATABASE_URL: Joi.string().required(),

  // External services — optional until configured
  E2B_API_KEY: Joi.string().optional().allow(''),
  LINGO_API_KEY: Joi.string().optional().allow(''),
  DEEPL_API_KEY: Joi.string().optional().allow(''),
  GOOGLE_TRANSLATE_API_KEY: Joi.string().optional().allow(''),
  OPENAI_API_KEY: Joi.string().optional().allow(''),
});
