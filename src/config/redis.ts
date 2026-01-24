/**
 * Redis 配置模块
 * 
 * 实现 Redis 连接和断开函数
 * 实现 isRedisEnabled 检查函数
 * 
 * 需求: 2.5
 * - WHERE Redis 缓存未启用 THEN Domain_Config_Service SHALL 直接查询数据库而不使用缓存
 */

import Redis, { RedisOptions } from 'ioredis';
import { config } from './env';
import { logger, logError } from './logger';

/**
 * Redis 客户端实例
 * 当 Redis 未启用或未连接时为 null
 */
let redis: Redis | null = null;

/**
 * 检查 Redis 是否已启用
 * 
 * 根据环境变量配置判断是否启用 Redis 缓存
 * 
 * @returns 如果 Redis 已启用返回 true，否则返回 false
 */
export function isRedisEnabled(): boolean {
  return config.redisEnabled;
}

/**
 * 连接到 Redis 服务器
 * 
 * 如果 Redis 未启用，则跳过连接
 * 如果已经连接，则跳过重复连接
 * 
 * @returns Promise<void>
 */
export async function connectRedis(): Promise<void> {
  // 如果 Redis 未启用，跳过连接
  if (!isRedisEnabled()) {
    logger.info('Redis 缓存未启用，跳过连接');
    return;
  }

  // 如果已经连接，跳过重复连接
  if (redis !== null) {
    logger.info('Redis 已连接，跳过重复连接');
    return;
  }

  try {
    logger.info('正在连接 Redis...', {
      host: config.redisHost,
      port: config.redisPort,
    });

    // 创建 Redis 客户端
    const redisOptions: RedisOptions = {
      host: config.redisHost,
      port: config.redisPort,
      retryStrategy: (times: number) => {
        // 最多重试 3 次，每次间隔递增
        if (times > 3) {
          logger.error('Redis 连接重试次数已达上限，停止重试');
          return null;
        }
        const delay = Math.min(times * 1000, 3000);
        logger.warn(`Redis 连接失败，${delay}ms 后重试 (第 ${times} 次)`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    };

    // 如果配置了密码，添加密码选项
    if (config.redisPassword) {
      redisOptions.password = config.redisPassword;
    }

    redis = new Redis(redisOptions);

    // 监听连接事件
    redis.on('connect', () => {
      logger.info('Redis 连接已建立');
    });

    redis.on('ready', () => {
      logger.info('Redis 已就绪，可以接受命令');
    });

    redis.on('error', (error: Error) => {
      logError(error, { context: 'Redis 连接错误' });
    });

    redis.on('close', () => {
      logger.info('Redis 连接已关闭');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis 正在重新连接...');
    });

    // 手动连接（因为使用了 lazyConnect）
    await redis.connect();

    logger.info('Redis 连接成功');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, { context: '连接 Redis 失败' });
    
    // 连接失败时清理实例
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    
    throw err;
  }
}

/**
 * 关闭 Redis 连接
 * 
 * 优雅地关闭 Redis 连接，释放资源
 * 
 * @returns Promise<void>
 */
export async function closeRedis(): Promise<void> {
  if (redis === null) {
    logger.info('Redis 未连接，无需关闭');
    return;
  }

  try {
    logger.info('正在关闭 Redis 连接...');
    
    // 使用 quit 命令优雅关闭连接
    await redis.quit();
    
    redis = null;
    logger.info('Redis 连接已关闭');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, { context: '关闭 Redis 连接失败' });
    
    // 强制断开连接
    if (redis) {
      redis.disconnect();
      redis = null;
    }
    
    throw err;
  }
}

/**
 * 获取 Redis 客户端实例
 * 
 * @returns Redis 客户端实例，如果未连接则返回 null
 */
export function getRedisClient(): Redis | null {
  return redis;
}

/**
 * 检查 Redis 是否已连接
 * 
 * @returns 如果 Redis 已连接返回 true，否则返回 false
 */
export function isRedisConnected(): boolean {
  return redis !== null && redis.status === 'ready';
}

/**
 * 导出 Redis 模块接口
 */
export default {
  get redis(): Redis | null {
    return redis;
  },
  isRedisEnabled,
  connectRedis,
  closeRedis,
  getRedisClient,
  isRedisConnected,
};
