import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../lib/db.js';

// Ensure test environment variables are set early for config parsing
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test.db';
}

// Test database setup
beforeAll(async () => {
  // Connect to database
  await db.$connect();
});

// Clean up after each test
afterEach(async () => {
  // Clean up test data
  await db.sprintItem.deleteMany();
  await db.sprint.deleteMany();
  await db.feature.deleteMany();
  await db.document.deleteMany();
  await db.project.deleteMany();
});

// Cleanup after all tests
afterAll(async () => {
  await db.$disconnect();
});
