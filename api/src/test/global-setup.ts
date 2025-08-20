// Vitest global setup: ensure env is initialized before test files are loaded
export default async () => {
  // Ensure test environment variables are set early for config parsing
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./test.db';
  }
};
