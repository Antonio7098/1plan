import { describe, it, expect, vi } from 'vitest';
import { checkDatabaseHealth } from '../lib/db.js';

describe('Health Check', () => {
  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      const result = await checkDatabaseHealth();
      expect(result).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      // Mock db to throw an error
      const { db } = await import('../lib/db.js');
      const originalQuery = db.$queryRaw;
      
      vi.spyOn(db, '$queryRaw').mockRejectedValueOnce(new Error('Database error'));

      const result = await checkDatabaseHealth();
      expect(result).toBe(false);

      // Restore original method
      db.$queryRaw = originalQuery;
    });
  });
});
