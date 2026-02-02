/**
 * Redis Cache Manager Implementation
 * 
 * Implements the CacheManager interface using Redis as the backend.
 * Provides cache operations for multilingual content support.
 * 
 * Requirements:
 * - 6.1: Cache translations in Redis with language-specific cache keys
 * - 6.2: Use cache keys in the format "config:{configId}:lang:{languageCode}"
 * - 6.3: Invalidate cache entries when translations are updated or deleted
 * - 6.4: Invalidate all cache entries for all languages when a config is deleted
 * - 6.5: Set cache TTL of 3600 seconds for translation cache entries
 */

import Redis from 'ioredis';
import { CacheManager } from './CacheManager';
import { logger, logError } from '../config/logger';

/**
 * Redis-based cache manager implementation
 * 
 * Provides cache operations using Redis as the storage backend.
 * Handles serialization/deserialization and error handling.
 */
export class RedisCacheManager implements CacheManager {
  /**
   * Create a new Redis cache manager
   * 
   * @param redisClient - The Redis client instance to use for cache operations
   */
  constructor(private redisClient: Redis) {}

  /**
   * Get a value from Redis cache
   * 
   * Retrieves a cached value by key and deserializes it from JSON.
   * Returns null if the key doesn't exist or if an error occurs.
   * 
   * Requirement 6.6: Retrieve from cache, return null if not found
   * 
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisClient.get(key);
      
      if (value === null) {
        logger.debug('Cache miss', { key });
        return null;
      }

      logger.debug('Cache hit', { key });
      return JSON.parse(value, this.reviver) as T;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: 'Failed to get cache value', key });
      // Return null on error to allow fallback to database
      return null;
    }
  }

  /**
   * JSON reviver function to handle special values
   * Restores Infinity, -Infinity, and NaN from their string representations
   */
  private reviver(_key: string, value: any): any {
    if (value === '__INFINITY__') return Infinity;
    if (value === '__NEG_INFINITY__') return -Infinity;
    if (value === '__NAN__') return NaN;
    return value;
  }

  /**
   * JSON replacer function to handle special values
   * Converts Infinity, -Infinity, and NaN to string representations
   */
  private replacer(_key: string, value: any): any {
    if (value === Infinity) return '__INFINITY__';
    if (value === -Infinity) return '__NEG_INFINITY__';
    if (Number.isNaN(value)) return '__NAN__';
    return value;
  }

  /**
   * Set a value in Redis cache with TTL
   * 
   * Serializes the value to JSON and stores it in Redis with the specified TTL.
   * Errors are logged but don't throw to avoid disrupting the application flow.
   * 
   * Requirements:
   * - 6.1: Cache translations in Redis
   * - 6.5: Set cache TTL of 3600 seconds
   * 
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value, this.replacer);
      await this.redisClient.setex(key, ttl, serialized);
      
      logger.debug('Cache set successfully', { key, ttl });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: 'Failed to set cache value', key });
      // Don't throw - cache errors should not disrupt application flow
    }
  }

  /**
   * Delete a single cache entry
   * 
   * Removes a cache entry by key.
   * Errors are logged but don't throw.
   * 
   * Requirement 6.3: Invalidate cache entries when translations are updated or deleted
   * 
   * @param key - The cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
      
      logger.debug('Cache entry deleted', { key });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: 'Failed to delete cache entry', key });
      // Don't throw - cache errors should not disrupt application flow
    }
  }

  /**
   * Delete all cache entries matching a pattern
   * 
   * Uses Redis KEYS command to find all keys matching the pattern,
   * then deletes them in batch. This is useful for invalidating all
   * translations for a config when the config is deleted.
   * 
   * Requirement 6.4: Invalidate all cache entries for all languages when a config is deleted
   * 
   * @param pattern - The pattern to match (e.g., "config:123:lang:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      // Find all keys matching the pattern
      const keys = await this.redisClient.keys(pattern);
      
      if (keys.length === 0) {
        logger.debug('No cache entries found matching pattern', { pattern });
        return;
      }

      // Delete all matching keys
      await this.redisClient.del(...keys);
      
      logger.debug('Cache entries deleted by pattern', { pattern, count: keys.length });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: 'Failed to delete cache entries by pattern', pattern });
      // Don't throw - cache errors should not disrupt application flow
    }
  }
}
