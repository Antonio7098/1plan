import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configSchema = z.object({
  // API Configuration
  API_BASE_URL: z.string().url().default('http://localhost:4000/api/v1'),
  API_TOKEN: z.string().optional(),
  API_TIMEOUT: z.coerce.number().default(30000),

  // MCP Configuration
  MCP_SERVER_NAME: z.string().default('1plan-gateway'),
  MCP_SERVER_VERSION: z.string().default('1.0.0'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Circuit Breaker Configuration
  CIRCUIT_BREAKER_THRESHOLD: z.coerce.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT: z.coerce.number().default(60000),
  CIRCUIT_BREAKER_RESET_TIMEOUT: z.coerce.number().default(30000),

  // Rate Limiting
  REQUEST_TIMEOUT: z.coerce.number().default(10000),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().default(10),
});

export type Config = z.infer<typeof configSchema>;

// Validate and export configuration
export const config = configSchema.parse(process.env);

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
