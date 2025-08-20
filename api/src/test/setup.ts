import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../lib/db.js';

// Test database setup
beforeAll(async () => {
  // Ensure we're using a test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    process.env.DATABASE_URL = 'file:./test.db';
  }
  
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
