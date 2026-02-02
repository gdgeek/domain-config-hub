/**
 * Property-Based Tests for RedisCacheManager
 * 
 * Uses fast-check for property testing to verify universal correctness properties
 * of the cache manager across all inputs.
 * 
 * Requirements: 6.1, 6.2, 6.5, 6.6
 */

import * as fc from 'fast-check';
import Redis from 'ioredis';
import { RedisCacheManager } from './RedisCacheManager';

describe('RedisCacheManager - Property-Based Tests', () => {
  let redisClient: Redis;
  let cacheManager: RedisCacheManager;

  beforeAll(() => {
    // Create Redis client for testing - use db 14 for property tests
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      db: parseInt(process.env.REDIS_TEST_DB || '14'), // Use db 14 for property tests
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

  /**
   * Property 15: Cache Storage and Retrieval
   * 
   * For any translation retrieved from the database, it should be cached in Redis
   * with the key format "config:{configId}:lang:{languageCode}", and subsequent
   * requests for the same translation should be served from cache without database access.
   * 
   * **Validates: Requirements 6.1, 6.2, 6.6**
   */
  describe('Property 15: Cache Storage and Retrieval', () => {
    // Arbitrary for cache keys in the format "config:{configId}:lang:{languageCode}"
    const cacheKeyArbitrary = fc.tuple(
      fc.integer({ min: 1, max: 10000 }),
      fc.constantFrom('zh-cn', 'en-us', 'ja-jp')
    ).map(([configId, lang]) => `config:${configId}:lang:${lang}`);

    // Arbitrary for translation data
    const translationArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      configId: fc.integer({ min: 1, max: 10000 }),
      languageCode: fc.constantFrom('zh-cn', 'en-us', 'ja-jp'),
      title: fc.string({ minLength: 1, maxLength: 200 }),
      author: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.string({ minLength: 1, maxLength: 1000 }),
      keywords: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
    });

    it('should store and retrieve any valid translation data', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          fc.integer({ min: 1, max: 7200 }),
          async (key, translation, ttl) => {
            // Store in cache
            await cacheManager.set(key, translation, ttl);

            // Retrieve from cache
            const retrieved = await cacheManager.get(key);

            // Property: retrieved data should match stored data
            expect(retrieved).toEqual(translation);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for non-existent keys', async () => {
      await fc.assert(
        fc.asyncProperty(cacheKeyArbitrary, async (key) => {
          // Don't store anything, just try to retrieve
          const result = await cacheManager.get(key);

          // Property: should return null for non-existent keys
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle round-trip serialization correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          async (key, translation) => {
            // Store and retrieve
            await cacheManager.set(key, translation, 3600);
            const retrieved = await cacheManager.get<typeof translation>(key);

            // Property: round-trip should preserve data structure
            expect(retrieved).toEqual(translation);
            
            // Property: arrays should remain arrays
            expect(Array.isArray(retrieved?.keywords)).toBe(true);
            
            // Property: strings should remain strings
            expect(typeof retrieved?.title).toBe('string');
            expect(typeof retrieved?.author).toBe('string');
            expect(typeof retrieved?.description).toBe('string');
            
            // Property: numbers should remain numbers
            expect(typeof retrieved?.id).toBe('number');
            expect(typeof retrieved?.configId).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various data types correctly', async () => {
      const mixedDataArbitrary = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.double().filter(n => !Object.is(n, -0)), // Filter out -0 as JSON cannot distinguish it from 0
        fc.boolean(),
        fc.array(fc.string()),
        fc.array(fc.integer()),
        fc.record({
          str: fc.string(),
          num: fc.integer(),
          bool: fc.boolean(),
          arr: fc.array(fc.string()),
        })
      );

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          mixedDataArbitrary,
          async (key, data) => {
            await cacheManager.set(key, data, 3600);
            const retrieved = await cacheManager.get(key);

            // Property: data type should be preserved
            expect(retrieved).toEqual(data);
            expect(typeof retrieved).toBe(typeof data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty and edge case values', async () => {
      const edgeCaseArbitrary = fc.oneof(
        fc.constant(''),
        fc.constant([]),
        fc.constant({}),
        fc.constant(0),
        fc.constant(false),
        fc.record({
          title: fc.constant(''),
          keywords: fc.constant([]),
        })
      );

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          edgeCaseArbitrary,
          async (key, data) => {
            await cacheManager.set(key, data, 3600);
            const retrieved = await cacheManager.get(key);

            // Property: edge cases should be preserved
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should overwrite existing values when setting same key', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          translationArbitrary,
          async (key, value1, value2) => {
            // Set first value
            await cacheManager.set(key, value1, 3600);
            
            // Set second value (overwrite)
            await cacheManager.set(key, value2, 3600);
            
            // Retrieve
            const retrieved = await cacheManager.get(key);

            // Property: should return the latest value
            expect(retrieved).toEqual(value2);
            expect(retrieved).not.toEqual(value1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 18: Cache TTL Configuration
   * 
   * For any translation cached in Redis, the TTL should be set to exactly 3600 seconds.
   * 
   * **Validates: Requirements 6.5**
   */
  describe('Property 18: Cache TTL Configuration', () => {
    const cacheKeyArbitrary = fc.tuple(
      fc.integer({ min: 1, max: 10000 }),
      fc.constantFrom('zh-cn', 'en-us', 'ja-jp')
    ).map(([configId, lang]) => `config:${configId}:lang:${lang}`);

    const translationArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      title: fc.string({ minLength: 1, maxLength: 200 }),
    });

    it('should set TTL correctly for any value', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          fc.integer({ min: 1, max: 7200 }),
          async (key, translation, ttl) => {
            await cacheManager.set(key, translation, ttl);

            // Get TTL from Redis
            const actualTtl = await redisClient.ttl(key);

            // Property: TTL should be set and within expected range
            // (allowing for small timing differences)
            expect(actualTtl).toBeGreaterThan(0);
            expect(actualTtl).toBeLessThanOrEqual(ttl);
            expect(actualTtl).toBeGreaterThan(ttl - 5); // Allow 5 second margin
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect the standard 3600 second TTL for translations', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          async (key, translation) => {
            // Set with standard TTL
            await cacheManager.set(key, translation, 3600);

            const ttl = await redisClient.ttl(key);

            // Property: TTL should be approximately 3600 seconds
            expect(ttl).toBeGreaterThan(3595); // Allow 5 second margin
            expect(ttl).toBeLessThanOrEqual(3600);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various TTL values correctly', async () => {
      const ttlArbitrary = fc.oneof(
        fc.constant(60),      // 1 minute
        fc.constant(300),     // 5 minutes
        fc.constant(3600),    // 1 hour (standard)
        fc.constant(7200),    // 2 hours
        fc.integer({ min: 1, max: 86400 }) // Random up to 1 day
      );

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          ttlArbitrary,
          async (key, translation, ttl) => {
            await cacheManager.set(key, translation, ttl);

            const actualTtl = await redisClient.ttl(key);

            // Property: TTL should be set correctly
            expect(actualTtl).toBeGreaterThan(0);
            expect(actualTtl).toBeLessThanOrEqual(ttl);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should expire entries after TTL', async () => {
      // Use a very short TTL for this test
      const shortTtl = 1; // 1 second

      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          translationArbitrary,
          async (key, translation) => {
            await cacheManager.set(key, translation, shortTtl);

            // Verify it exists immediately
            const immediate = await cacheManager.get(key);
            expect(immediate).toEqual(translation);

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify it's gone
            const afterExpiry = await cacheManager.get(key);
            
            // Property: entry should be null after TTL expires
            expect(afterExpiry).toBeNull();
          }
        ),
        { numRuns: 20 } // Fewer runs since this test involves waiting
      );
    }, 60000); // Increase timeout for this test
  });

  /**
   * Additional Property: Cache Key Format Consistency
   * 
   * Verifies that cache operations work correctly with the expected key format.
   */
  describe('Additional Property: Cache Key Format', () => {
    it('should work with config:id:lang:code format', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (configId, lang, value) => {
            const key = `config:${configId}:lang:${lang}`;
            
            await cacheManager.set(key, value, 3600);
            const retrieved = await cacheManager.get(key);

            // Property: key format should work correctly
            expect(retrieved).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle different config IDs independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (configId1, configId2, lang, value1, value2) => {
            fc.pre(configId1 !== configId2); // Ensure different IDs

            const key1 = `config:${configId1}:lang:${lang}`;
            const key2 = `config:${configId2}:lang:${lang}`;
            
            await cacheManager.set(key1, value1, 3600);
            await cacheManager.set(key2, value2, 3600);

            const retrieved1 = await cacheManager.get(key1);
            const retrieved2 = await cacheManager.get(key2);

            // Property: different config IDs should be independent
            expect(retrieved1).toBe(value1);
            expect(retrieved2).toBe(value2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle different languages for same config independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (configId, value1, value2, value3) => {
            const key1 = `config:${configId}:lang:zh-cn`;
            const key2 = `config:${configId}:lang:en-us`;
            const key3 = `config:${configId}:lang:ja-jp`;
            
            await cacheManager.set(key1, value1, 3600);
            await cacheManager.set(key2, value2, 3600);
            await cacheManager.set(key3, value3, 3600);

            const retrieved1 = await cacheManager.get(key1);
            const retrieved2 = await cacheManager.get(key2);
            const retrieved3 = await cacheManager.get(key3);

            // Property: different languages should be independent
            expect(retrieved1).toBe(value1);
            expect(retrieved2).toBe(value2);
            expect(retrieved3).toBe(value3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Delete Operations
   */
  describe('Additional Property: Delete Operations', () => {
    const cacheKeyArbitrary = fc.tuple(
      fc.integer({ min: 1, max: 10000 }),
      fc.constantFrom('zh-cn', 'en-us', 'ja-jp')
    ).map(([configId, lang]) => `config:${configId}:lang:${lang}`);

    it('should delete existing entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          cacheKeyArbitrary,
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Set value
            await cacheManager.set(key, value, 3600);
            
            // Verify it exists
            const before = await cacheManager.get(key);
            expect(before).toBe(value);

            // Delete
            await cacheManager.delete(key);

            // Verify it's gone
            const after = await cacheManager.get(key);
            
            // Property: deleted entry should return null
            expect(after).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deleting non-existent keys gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(cacheKeyArbitrary, async (key) => {
          // Delete without setting first
          await expect(cacheManager.delete(key)).resolves.not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    it('should delete all keys matching a pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.array(fc.constantFrom('zh-cn', 'en-us', 'ja-jp'), { minLength: 1, maxLength: 3 }),
          async (configId, languages) => {
            // Set values for all languages
            for (const lang of languages) {
              const key = `config:${configId}:lang:${lang}`;
              await cacheManager.set(key, `value-${lang}`, 3600);
            }

            // Verify all exist
            for (const lang of languages) {
              const key = `config:${configId}:lang:${lang}`;
              const value = await cacheManager.get(key);
              expect(value).toBe(`value-${lang}`);
            }

            // Delete all with pattern
            await cacheManager.deletePattern(`config:${configId}:lang:*`);

            // Verify all are gone
            for (const lang of languages) {
              const key = `config:${configId}:lang:${lang}`;
              const value = await cacheManager.get(key);
              
              // Property: all matching keys should be deleted
              expect(value).toBeNull();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should only delete keys matching the pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          async (configId1, configId2) => {
            fc.pre(configId1 !== configId2);

            // Set values for both configs
            await cacheManager.set(`config:${configId1}:lang:zh-cn`, 'value1', 3600);
            await cacheManager.set(`config:${configId2}:lang:zh-cn`, 'value2', 3600);

            // Delete only config1
            await cacheManager.deletePattern(`config:${configId1}:lang:*`);

            // Verify config1 is gone but config2 remains
            const value1 = await cacheManager.get(`config:${configId1}:lang:zh-cn`);
            const value2 = await cacheManager.get(`config:${configId2}:lang:zh-cn`);

            // Property: only matching keys should be deleted
            expect(value1).toBeNull();
            expect(value2).toBe('value2');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
