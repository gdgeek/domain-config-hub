/**
 * 缓存服务模块
 * 
 * 实现 Redis 缓存操作，包括 get、set、delete 方法
 * 支持配置 TTL（缓存过期时间）
 * 
 * 需求:
 * - 2.1: WHERE Redis 缓存已启用，WHEN 查询域名配置 THEN Cache_Layer SHALL 首先检查缓存是否存在该域名的配置
 * - 2.2: WHERE Redis 缓存已启用，WHEN 缓存命中 THEN Domain_Config_Service SHALL 直接返回缓存数据而不查询数据库
 * - 2.3: WHERE Redis 缓存已启用，WHEN 缓存未命中 THEN Domain_Config_Service SHALL 查询数据库并将结果存入缓存
 * - 2.6: THE Cache_Layer SHALL 支持配置缓存过期时间（TTL）
 */

import { getRedisClient, isRedisEnabled } from '../config/redis';
import { config } from '../config/env';
import { logger, logError } from '../config/logger';

/**
 * 缓存键前缀
 * 用于区分域名配置缓存与其他缓存数据
 */
export const CACHE_KEY_PREFIX = 'domain:config:';

/**
 * 缓存服务接口
 */
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  isEnabled(): boolean;
}

/**
 * 生成完整的缓存键
 * @param key 原始键名
 * @returns 带前缀的完整缓存键
 */
function getCacheKey(key: string): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}

/**
 * 缓存服务类
 * 
 * 提供 Redis 缓存操作的封装，包括：
 * - 获取缓存数据
 * - 设置缓存数据（支持 TTL）
 * - 删除缓存数据
 * - 检查缓存是否启用
 */
export class CacheService implements ICacheService {
  /**
   * 检查缓存是否已启用
   * 
   * 缓存启用需要满足两个条件：
   * 1. 环境变量配置启用 Redis
   * 2. Redis 客户端已连接
   * 
   * @returns 如果缓存已启用返回 true，否则返回 false
   */
  isEnabled(): boolean {
    const enabled = isRedisEnabled();
    const client = getRedisClient();
    return enabled && client !== null;
  }

  /**
   * 从缓存获取数据
   * 
   * 需求 2.1: WHERE Redis 缓存已启用，WHEN 查询域名配置 THEN Cache_Layer SHALL 首先检查缓存是否存在该域名的配置
   * 需求 2.2: WHERE Redis 缓存已启用，WHEN 缓存命中 THEN Domain_Config_Service SHALL 直接返回缓存数据而不查询数据库
   * 
   * @param key 缓存键（不含前缀）
   * @returns 缓存数据，如果不存在或缓存未启用则返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    // 如果缓存未启用，直接返回 null
    if (!this.isEnabled()) {
      logger.debug('缓存未启用，跳过缓存查询', { key });
      return null;
    }

    const client = getRedisClient();
    if (!client) {
      return null;
    }

    const cacheKey = getCacheKey(key);

    try {
      const data = await client.get(cacheKey);
      
      if (data === null) {
        logger.debug('缓存未命中', { key: cacheKey });
        return null;
      }

      logger.debug('缓存命中', { key: cacheKey });
      
      // 解析 JSON 数据
      const parsed = JSON.parse(data) as T;
      return parsed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: '获取缓存数据失败', key: cacheKey });
      // 缓存错误不应影响业务流程，返回 null 让调用方从数据库获取
      return null;
    }
  }

  /**
   * 设置缓存数据
   * 
   * 需求 2.3: WHERE Redis 缓存已启用，WHEN 缓存未命中 THEN Domain_Config_Service SHALL 查询数据库并将结果存入缓存
   * 需求 2.6: THE Cache_Layer SHALL 支持配置缓存过期时间（TTL）
   * 
   * @param key 缓存键（不含前缀）
   * @param value 要缓存的数据
   * @param ttl 缓存过期时间（秒），默认使用配置的 redisTtl
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // 如果缓存未启用，直接返回
    if (!this.isEnabled()) {
      logger.debug('缓存未启用，跳过缓存设置', { key });
      return;
    }

    const client = getRedisClient();
    if (!client) {
      return;
    }

    const cacheKey = getCacheKey(key);
    const expireTime = ttl ?? config.redisTtl;

    try {
      // 序列化数据为 JSON
      const serialized = JSON.stringify(value);
      
      // 使用 SETEX 命令设置带过期时间的缓存
      await client.setex(cacheKey, expireTime, serialized);
      
      logger.debug('缓存设置成功', { key: cacheKey, ttl: expireTime });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: '设置缓存数据失败', key: cacheKey });
      // 缓存错误不应影响业务流程，静默失败
    }
  }

  /**
   * 删除缓存数据
   * 
   * 需求 2.4: WHERE Redis 缓存已启用，WHEN 域名配置被更新或删除 THEN Cache_Layer SHALL 使该域名的缓存失效
   * 
   * @param key 缓存键（不含前缀）
   */
  async delete(key: string): Promise<void> {
    // 如果缓存未启用，直接返回
    if (!this.isEnabled()) {
      logger.debug('缓存未启用，跳过缓存删除', { key });
      return;
    }

    const client = getRedisClient();
    if (!client) {
      return;
    }

    const cacheKey = getCacheKey(key);

    try {
      await client.del(cacheKey);
      
      logger.debug('缓存删除成功', { key: cacheKey });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(err, { context: '删除缓存数据失败', key: cacheKey });
      // 缓存错误不应影响业务流程，静默失败
    }
  }
}

/**
 * 导出缓存服务单例实例
 */
export const cacheService = new CacheService();

export default cacheService;
