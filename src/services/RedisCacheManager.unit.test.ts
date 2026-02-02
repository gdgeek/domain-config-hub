/**
 * Unit Tests for RedisCacheManager
 * 
 * Tests cache storage, retrieval, deletion, TTL, and error handling
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import Redis from 'ioredis';
import { RedisCacheManager } from './RedisCacheManager';

describe('RedisCacheManager', () => {
  let redisClient: Redis;
  let cacheManager: RedisCacheManager;

  beforeAll(() => {
    // Create Redis client for testing
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_TEST_DB || '15'), // Use separate DB for tests
    });
  });

  afterAll(async () => {
    // Clean up and close connection
    await redisClient.flushdb();
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clear test database before each test
    await redisClient.flushdb();
    cacheManager = new RedisCacheManager(redisClient);
  });

  describe('get', () => {
    it('should retrieve a cached value', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test Title', author: 'Test Author' };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheManager.get('config:999:lang:zh-cn');
      expect(result).toBeNull();
    });

    it('should deserialize JSON correctly', async () => {
      const key = 'config:1:lang:en-us';
      const value = {
        id: 1,
        title: 'Title',
        keywords: ['keyword1', 'keyword2'],
        nested: { field: 'value' },
      };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get<typeof value>(key);

      expect(result).toEqual(value);
      expect(Array.isArray(result?.keywords)).toBe(true);
      expect(typeof result?.nested).toBe('object');
    });

    it('should handle string values', async () => {
      const key = 'config:1:lang:ja-jp';
      const value = 'simple string value';

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toBe(value);
    });

    it('should handle number values', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = 12345;

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toBe(value);
    });

    it('should handle boolean values', async () => {
      const key = 'config:1:lang:en-us';
      const value = true;

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toBe(value);
    });

    it('should handle array values', async () => {
      const key = 'config:1:lang:ja-jp';
      const value = ['item1', 'item2', 'item3'];

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty object', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = {};

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should handle empty array', async () => {
      const key = 'config:1:lang:en-us';
      const value: string[] = [];

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null value', async () => {
      const key = 'config:1:lang:ja-jp';
      const value = null;

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toBeNull();
    });

    it('should return null on JSON parse error', async () => {
      const key = 'config:1:lang:zh-cn';
      
      // Manually set invalid JSON in Redis
      await redisClient.set(key, 'invalid json {');
      
      const result = await cacheManager.get(key);
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store a value with TTL', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test' };
      const ttl = 3600;

      await cacheManager.set(key, value, ttl);

      // Verify value is stored
      const stored = await redisClient.get(key);
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(value);

      // Verify TTL is set
      const actualTtl = await redisClient.ttl(key);
      expect(actualTtl).toBeGreaterThan(0);
      expect(actualTtl).toBeLessThanOrEqual(ttl);
    });

    it('should serialize complex objects correctly', async () => {
      const key = 'config:1:lang:en-us';
      const value = {
        id: 1,
        configId: 100,
        languageCode: 'en-us',
        title: 'Test Title',
        author: 'Test Author',
        description: 'Test Description',
        keywords: ['keyword1', 'keyword2'],
        createdAt: '2024-01-01T00:00:00.000Z', // Use string instead of Date
        nested: {
          field1: 'value1',
          field2: 123,
        },
      };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should overwrite existing value', async () => {
      const key = 'config:1:lang:ja-jp';
      const value1 = { title: 'First' };
      const value2 = { title: 'Second' };

      await cacheManager.set(key, value1, 3600);
      await cacheManager.set(key, value2, 3600);

      const result = await cacheManager.get(key);
      expect(result).toEqual(value2);
    });

    it('should set TTL of 3600 seconds for translations (Requirement 6.5)', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(key, value, 3600);

      const ttl = await redisClient.ttl(key);
      expect(ttl).toBeGreaterThan(3595); // Allow 5 second margin
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should handle different TTL values', async () => {
      const key1 = 'config:1:lang:zh-cn';
      const key2 = 'config:2:lang:en-us';
      const value = { title: 'Test' };

      await cacheManager.set(key1, value, 60);
      await cacheManager.set(key2, value, 7200);

      const ttl1 = await redisClient.ttl(key1);
      const ttl2 = await redisClient.ttl(key2);

      expect(ttl1).toBeGreaterThan(55);
      expect(ttl1).toBeLessThanOrEqual(60);
      expect(ttl2).toBeGreaterThan(7195);
      expect(ttl2).toBeLessThanOrEqual(7200);
    });

    it('should handle special characters in values', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = {
        title: 'Title with "quotes" and \'apostrophes\'',
        description: 'Description with\nnewlines\tand\ttabs',
        keywords: ['keyword with spaces', 'keyword-with-hyphens'],
      };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should handle Unicode characters', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = {
        title: '中文标题',
        author: '作者名',
        description: '这是一个描述',
        keywords: ['关键词1', '关键词2'],
      };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should handle emoji characters', async () => {
      const key = 'config:1:lang:en-us';
      const value = {
        title: 'Title with emoji 🎉',
        description: 'Description 👍 with 🚀 emojis',
      };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });
  });

  describe('delete', () => {
    it('should delete an existing cache entry (Requirement 6.3)', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(key, value, 3600);
      
      // Verify it exists
      let result = await cacheManager.get(key);
      expect(result).toEqual(value);

      // Delete it
      await cacheManager.delete(key);

      // Verify it's gone
      result = await cacheManager.get(key);
      expect(result).toBeNull();
    });

    it('should handle deleting non-existent key', async () => {
      await expect(cacheManager.delete('config:999:lang:zh-cn')).resolves.not.toThrow();
    });

    it('should delete only the specified key', async () => {
      const key1 = 'config:1:lang:zh-cn';
      const key2 = 'config:1:lang:en-us';
      const value = { title: 'Test' };

      await cacheManager.set(key1, value, 3600);
      await cacheManager.set(key2, value, 3600);

      await cacheManager.delete(key1);

      const result1 = await cacheManager.get(key1);
      const result2 = await cacheManager.get(key2);

      expect(result1).toBeNull();
      expect(result2).toEqual(value);
    });

    it('should allow re-setting after deletion', async () => {
      const key = 'config:1:lang:ja-jp';
      const value1 = { title: 'First' };
      const value2 = { title: 'Second' };

      await cacheManager.set(key, value1, 3600);
      await cacheManager.delete(key);
      await cacheManager.set(key, value2, 3600);

      const result = await cacheManager.get(key);
      expect(result).toEqual(value2);
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching a pattern (Requirement 6.4)', async () => {
      const configId = 1;
      const languages = ['zh-cn', 'en-us', 'ja-jp'];
      const value = { title: 'Test' };

      // Set values for all languages
      for (const lang of languages) {
        await cacheManager.set(`config:${configId}:lang:${lang}`, value, 3600);
      }

      // Verify all exist
      for (const lang of languages) {
        const result = await cacheManager.get(`config:${configId}:lang:${lang}`);
        expect(result).toEqual(value);
      }

      // Delete all with pattern
      await cacheManager.deletePattern(`config:${configId}:lang:*`);

      // Verify all are gone
      for (const lang of languages) {
        const result = await cacheManager.get(`config:${configId}:lang:${lang}`);
        expect(result).toBeNull();
      }
    });

    it('should only delete keys matching the pattern', async () => {
      const value = { title: 'Test' };

      await cacheManager.set('config:1:lang:zh-cn', value, 3600);
      await cacheManager.set('config:1:lang:en-us', value, 3600);
      await cacheManager.set('config:2:lang:zh-cn', value, 3600);
      await cacheManager.set('config:2:lang:en-us', value, 3600);

      // Delete only config:1 entries
      await cacheManager.deletePattern('config:1:lang:*');

      // Verify config:1 entries are gone
      expect(await cacheManager.get('config:1:lang:zh-cn')).toBeNull();
      expect(await cacheManager.get('config:1:lang:en-us')).toBeNull();

      // Verify config:2 entries still exist
      expect(await cacheManager.get('config:2:lang:zh-cn')).toEqual(value);
      expect(await cacheManager.get('config:2:lang:en-us')).toEqual(value);
    });

    it('should handle pattern with no matches', async () => {
      await expect(cacheManager.deletePattern('config:999:lang:*')).resolves.not.toThrow();
    });

    it('should handle wildcard at different positions', async () => {
      const value = { title: 'Test' };

      await cacheManager.set('config:1:lang:zh-cn', value, 3600);
      await cacheManager.set('config:2:lang:zh-cn', value, 3600);
      await cacheManager.set('config:3:lang:zh-cn', value, 3600);

      // Delete all zh-cn entries
      await cacheManager.deletePattern('config:*:lang:zh-cn');

      expect(await cacheManager.get('config:1:lang:zh-cn')).toBeNull();
      expect(await cacheManager.get('config:2:lang:zh-cn')).toBeNull();
      expect(await cacheManager.get('config:3:lang:zh-cn')).toBeNull();
    });

    it('should handle multiple wildcards', async () => {
      const value = { title: 'Test' };

      await cacheManager.set('config:1:lang:zh-cn', value, 3600);
      await cacheManager.set('config:1:lang:en-us', value, 3600);
      await cacheManager.set('config:2:lang:zh-cn', value, 3600);

      // Delete all config entries
      await cacheManager.deletePattern('config:*:lang:*');

      expect(await cacheManager.get('config:1:lang:zh-cn')).toBeNull();
      expect(await cacheManager.get('config:1:lang:en-us')).toBeNull();
      expect(await cacheManager.get('config:2:lang:zh-cn')).toBeNull();
    });

    it('should delete large number of keys efficiently', async () => {
      const value = { title: 'Test' };
      const configId = 100;

      // Create 50 cache entries
      for (let i = 0; i < 50; i++) {
        await cacheManager.set(`config:${configId}:lang:test-${i}`, value, 3600);
      }

      // Delete all at once
      await cacheManager.deletePattern(`config:${configId}:lang:*`);

      // Verify all are gone
      for (let i = 0; i < 50; i++) {
        const result = await cacheManager.get(`config:${configId}:lang:test-${i}`);
        expect(result).toBeNull();
      }
    });
  });

  describe('cache key format (Requirement 6.2)', () => {
    it('should work with config:id:lang:code format', async () => {
      const key = 'config:123:lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });

    it('should handle different config IDs', async () => {
      const value1 = { title: 'Config 1' };
      const value2 = { title: 'Config 2' };

      await cacheManager.set('config:1:lang:zh-cn', value1, 3600);
      await cacheManager.set('config:2:lang:zh-cn', value2, 3600);

      expect(await cacheManager.get('config:1:lang:zh-cn')).toEqual(value1);
      expect(await cacheManager.get('config:2:lang:zh-cn')).toEqual(value2);
    });

    it('should handle different language codes', async () => {
      const value1 = { title: 'Chinese' };
      const value2 = { title: 'English' };
      const value3 = { title: 'Japanese' };

      await cacheManager.set('config:1:lang:zh-cn', value1, 3600);
      await cacheManager.set('config:1:lang:en-us', value2, 3600);
      await cacheManager.set('config:1:lang:ja-jp', value3, 3600);

      expect(await cacheManager.get('config:1:lang:zh-cn')).toEqual(value1);
      expect(await cacheManager.get('config:1:lang:en-us')).toEqual(value2);
      expect(await cacheManager.get('config:1:lang:ja-jp')).toEqual(value3);
    });

    it('should handle large config IDs', async () => {
      const key = 'config:999999999:lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(key, value, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(value);
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test' };
      const ttl = 1; // 1 second

      await cacheManager.set(key, value, ttl);

      // Verify it exists immediately
      let result = await cacheManager.get(key);
      expect(result).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify it's gone
      result = await cacheManager.get(key);
      expect(result).toBeNull();
    }, 10000);

    it('should not expire before TTL', async () => {
      const key = 'config:1:lang:en-us';
      const value = { title: 'Test' };
      const ttl = 5; // 5 seconds

      await cacheManager.set(key, value, ttl);

      // Wait 2 seconds (less than TTL)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should still exist
      const result = await cacheManager.get(key);
      expect(result).toEqual(value);
    }, 10000);
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully in get', async () => {
      // Create a disconnected client
      const disconnectedClient = new Redis({
        host: 'invalid-host',
        port: 9999,
        retryStrategy: () => null, // Don't retry
        lazyConnect: true,
      });

      const errorCacheManager = new RedisCacheManager(disconnectedClient);

      // Should return null instead of throwing
      const result = await errorCacheManager.get('config:1:lang:zh-cn');
      expect(result).toBeNull();

      await disconnectedClient.disconnect();
    });

    it('should handle Redis connection errors gracefully in set', async () => {
      const disconnectedClient = new Redis({
        host: 'invalid-host',
        port: 9999,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      const errorCacheManager = new RedisCacheManager(disconnectedClient);

      // Should not throw
      await expect(
        errorCacheManager.set('config:1:lang:zh-cn', { title: 'Test' }, 3600)
      ).resolves.not.toThrow();

      await disconnectedClient.disconnect();
    });

    it('should handle Redis connection errors gracefully in delete', async () => {
      const disconnectedClient = new Redis({
        host: 'invalid-host',
        port: 9999,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      const errorCacheManager = new RedisCacheManager(disconnectedClient);

      // Should not throw
      await expect(
        errorCacheManager.delete('config:1:lang:zh-cn')
      ).resolves.not.toThrow();

      await disconnectedClient.disconnect();
    });

    it('should handle Redis connection errors gracefully in deletePattern', async () => {
      const disconnectedClient = new Redis({
        host: 'invalid-host',
        port: 9999,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      const errorCacheManager = new RedisCacheManager(disconnectedClient);

      // Should not throw
      await expect(
        errorCacheManager.deletePattern('config:*:lang:*')
      ).resolves.not.toThrow();

      await disconnectedClient.disconnect();
    });
  });

  describe('edge cases', () => {
    it('should handle very long keys', async () => {
      const longKey = 'config:' + '1'.repeat(1000) + ':lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(longKey, value, 3600);
      const result = await cacheManager.get(longKey);

      expect(result).toEqual(value);
    });

    it('should handle very large values', async () => {
      const key = 'config:1:lang:zh-cn';
      const largeValue = {
        title: 'A'.repeat(10000),
        description: 'B'.repeat(10000),
        keywords: Array(1000).fill('keyword'),
      };

      await cacheManager.set(key, largeValue, 3600);
      const result = await cacheManager.get(key);

      expect(result).toEqual(largeValue);
    });

    it('should handle rapid successive operations', async () => {
      const key = 'config:1:lang:zh-cn';
      const operations = [];

      for (let i = 0; i < 100; i++) {
        operations.push(cacheManager.set(key, { title: `Test ${i}` }, 3600));
      }

      await Promise.all(operations);

      const result = await cacheManager.get<{ title: string }>(key);
      expect(result).toBeTruthy();
      expect(result?.title).toMatch(/^Test \d+$/);
    });

    it('should handle concurrent get operations', async () => {
      const key = 'config:1:lang:zh-cn';
      const value = { title: 'Test' };

      await cacheManager.set(key, value, 3600);

      const operations = Array(50).fill(null).map(() => cacheManager.get(key));
      const results = await Promise.all(operations);

      results.forEach(result => {
        expect(result).toEqual(value);
      });
    });
  });
});
