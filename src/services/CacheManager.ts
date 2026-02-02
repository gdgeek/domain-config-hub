/**
 * Cache Manager Interface
 * 
 * Provides a generic interface for cache operations used by the multilingual content support feature.
 * This interface abstracts the cache implementation details and allows for different cache backends.
 * 
 * Requirements:
 * - 6.1: Cache translations in Redis with language-specific cache keys
 * - 6.2: Use cache keys in the format "config:{configId}:lang:{languageCode}"
 * - 6.3: Invalidate cache entries when translations are updated or deleted
 * - 6.4: Invalidate all cache entries for all languages when a config is deleted
 * - 6.5: Set cache TTL of 3600 seconds for translation cache entries
 * - 6.6: Retrieve translations from database and populate cache when cache entry is not found
 */

/**
 * Generic cache manager interface
 * 
 * Defines the contract for cache operations that must be implemented by concrete cache managers.
 */
export interface CacheManager {
  /**
   * Get a value from the cache
   * 
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in the cache with TTL
   * 
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  set(key: string, value: any, ttl: number): Promise<void>;

  /**
   * Delete a single cache entry
   * 
   * @param key - The cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Delete all cache entries matching a pattern
   * 
   * @param pattern - The pattern to match (e.g., "config:123:lang:*")
   */
  deletePattern(pattern: string): Promise<void>;
}
