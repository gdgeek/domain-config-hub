/**
 * CacheService 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证缓存服务的正确性属性
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 * 
 * Property 5: 缓存行为正确性
 * - 首次查询应从数据库获取并存入缓存
 * - 后续查询应从缓存获取
 * - 更新或删除后缓存应失效
 */

import fc from 'fast-check';
import { CacheService, CACHE_KEY_PREFIX } from './CacheService';
import * as redisModule from '../config/redis';

// Mock Redis 模块
jest.mock('../config/redis', () => ({
  getRedisClient: jest.fn(),
  isRedisEnabled: jest.fn(),
}));

// Mock 环境配置
jest.mock('../config/env', () => ({
  config: {
    redisTtl: 3600,
  },
}));

// Mock 日志模块
jest.mock('../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('CacheService - Property Tests', () => {
  let cacheService: CacheService;
  let mockRedisClient: {
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };
    
    (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
    (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    cacheService = new CacheService();
  });

  describe('Property 5: 缓存行为正确性', () => {
    /**
     * 域名生成器
     * 生成有效的域名字符串（1-255字符）
     */
    const domainArbitrary = fc.string({ minLength: 1, maxLength: 255 })
      .filter(s => s.trim().length > 0);

    /**
     * 域名配置数据生成器
     * 生成模拟的域名配置对象
     */
    const domainDataArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 1000000 }),
      domain: domainArbitrary,
      title: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
      author: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
      description: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
      keywords: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
      links: fc.option(
        fc.dictionary(fc.string(), fc.string()),
        { nil: null }
      ),
    });

    /**
     * TTL 生成器
     * 生成有效的 TTL 值（1秒到7天）
     */
    const ttlArbitrary = fc.integer({ min: 1, max: 604800 });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * 属性: 对于任意域名和数据，设置缓存后立即获取应返回相同的数据
     * 
     * 这验证了：
     * - 2.3: 数据能够正确存入缓存
     * - 2.1: 缓存能够被查询
     * - 2.2: 缓存命中时返回正确的数据
     */
    it('设置缓存后立即获取应返回相同的数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          async (domain, data) => {
            // 模拟 Redis 行为：set 后 get 返回相同数据
            mockRedisClient.setex.mockResolvedValue('OK');
            mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

            // 设置缓存
            await cacheService.set(domain, data);

            // 验证 setex 被调用
            expect(mockRedisClient.setex).toHaveBeenCalledWith(
              `${CACHE_KEY_PREFIX}${domain}`,
              expect.any(Number),
              JSON.stringify(data)
            );

            // 获取缓存
            const retrieved = await cacheService.get(domain);

            // 验证 get 被调用
            expect(mockRedisClient.get).toHaveBeenCalledWith(
              `${CACHE_KEY_PREFIX}${domain}`
            );

            // 验证返回的数据与设置的数据一致
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2**
     * 
     * 属性: 对于任意不存在的键，获取缓存应返回 null
     * 
     * 这验证了：
     * - 2.1: 缓存未命中时的正确行为
     * - 2.2: 缓存未命中不会返回错误数据
     */
    it('获取不存在的缓存键应返回 null', async () => {
      await fc.assert(
        fc.asyncProperty(domainArbitrary, async (domain) => {
          // 模拟 Redis 行为：键不存在返回 null
          mockRedisClient.get.mockResolvedValue(null);

          const result = await cacheService.get(domain);

          expect(mockRedisClient.get).toHaveBeenCalledWith(
            `${CACHE_KEY_PREFIX}${domain}`
          );
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.4**
     * 
     * 属性: 对于任意已缓存的键，删除后获取应返回 null
     * 
     * 这验证了：
     * - 2.4: 缓存失效机制正确工作
     */
    it('删除缓存后获取应返回 null', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          async (domain, data) => {
            // 模拟 Redis 行为
            mockRedisClient.setex.mockResolvedValue('OK');
            mockRedisClient.del.mockResolvedValue(1);
            
            // 第一次 get 返回数据，删除后返回 null
            mockRedisClient.get
              .mockResolvedValueOnce(JSON.stringify(data))
              .mockResolvedValueOnce(null);

            // 设置缓存
            await cacheService.set(domain, data);

            // 验证缓存存在
            const beforeDelete = await cacheService.get(domain);
            expect(beforeDelete).toEqual(data);

            // 删除缓存
            await cacheService.delete(domain);
            expect(mockRedisClient.del).toHaveBeenCalledWith(
              `${CACHE_KEY_PREFIX}${domain}`
            );

            // 验证缓存已删除
            const afterDelete = await cacheService.get(domain);
            expect(afterDelete).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.6**
     * 
     * 属性: 对于任意 TTL 值，设置缓存时应使用指定的 TTL
     * 
     * 这验证了：
     * - 2.6: 缓存支持配置过期时间
     */
    it('设置缓存时应使用指定的 TTL', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          ttlArbitrary,
          async (domain, data, ttl) => {
            mockRedisClient.setex.mockResolvedValue('OK');

            await cacheService.set(domain, data, ttl);

            expect(mockRedisClient.setex).toHaveBeenCalledWith(
              `${CACHE_KEY_PREFIX}${domain}`,
              ttl,
              JSON.stringify(data)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.5**
     * 
     * 属性: 当缓存未启用时，所有操作应优雅降级（不调用 Redis）
     * 
     * 这验证了：
     * - 2.5: 缓存未启用时直接查询数据库而不使用缓存
     */
    it('当缓存未启用时应跳过所有 Redis 操作', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          async (domain, data) => {
            // 禁用缓存
            (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);
            const disabledCacheService = new CacheService();

            // 重置 mock 调用计数
            mockRedisClient.get.mockClear();
            mockRedisClient.setex.mockClear();
            mockRedisClient.del.mockClear();

            // 执行缓存操作
            const getResult = await disabledCacheService.get(domain);
            await disabledCacheService.set(domain, data);
            await disabledCacheService.delete(domain);

            // 验证没有调用 Redis
            expect(mockRedisClient.get).not.toHaveBeenCalled();
            expect(mockRedisClient.setex).not.toHaveBeenCalled();
            expect(mockRedisClient.del).not.toHaveBeenCalled();

            // 验证 get 返回 null（表示需要从数据库查询）
            expect(getResult).toBeNull();

            // 恢复缓存启用状态
            (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * 属性: 对于任意数据类型，缓存应正确序列化和反序列化
     * 
     * 这验证了：
     * - 数据完整性在缓存存储和检索过程中得到保持
     * 
     * 注意: JSON 序列化会将 undefined 转换为 null，这是预期行为
     */
    it('应正确序列化和反序列化各种数据类型', async () => {
      // 测试不同类型的数据（排除 undefined，因为 JSON 不支持）
      const dataArbitrary = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.array(fc.string()),
        fc.dictionary(fc.string(), fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null)
        )),
        domainDataArbitrary
      );

      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          dataArbitrary,
          async (domain, data) => {
            mockRedisClient.setex.mockResolvedValue('OK');
            mockRedisClient.get.mockResolvedValue(JSON.stringify(data));

            await cacheService.set(domain, data);
            const retrieved = await cacheService.get(domain);

            // 验证序列化和反序列化后数据一致
            expect(retrieved).toEqual(data);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * 属性: 缓存键应始终包含正确的前缀
     * 
     * 这验证了：
     * - 缓存键的命名规范得到遵守
     * - 不同类型的缓存数据能够正确隔离
     */
    it('所有缓存操作应使用正确的键前缀', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          async (domain, data) => {
            const expectedKey = `${CACHE_KEY_PREFIX}${domain}`;

            mockRedisClient.get.mockResolvedValue(null);
            mockRedisClient.setex.mockResolvedValue('OK');
            mockRedisClient.del.mockResolvedValue(1);

            // 执行所有操作
            await cacheService.get(domain);
            await cacheService.set(domain, data);
            await cacheService.delete(domain);

            // 验证所有操作都使用了正确的键
            expect(mockRedisClient.get).toHaveBeenCalledWith(expectedKey);
            expect(mockRedisClient.setex).toHaveBeenCalledWith(
              expectedKey,
              expect.any(Number),
              expect.any(String)
            );
            expect(mockRedisClient.del).toHaveBeenCalledWith(expectedKey);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3**
     * 
     * 属性: Redis 错误不应导致应用崩溃
     * 
     * 这验证了：
     * - 缓存层的错误处理是健壮的
     * - 缓存失败不会影响业务流程
     */
    it('Redis 操作失败时应优雅降级而不抛出错误', async () => {
      const errorArbitrary = fc.constantFrom(
        new Error('Connection timeout'),
        new Error('Redis unavailable'),
        new Error('Network error')
      );

      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          domainDataArbitrary,
          errorArbitrary,
          async (domain, data, error) => {
            // 模拟 Redis 操作失败
            mockRedisClient.get.mockRejectedValue(error);
            mockRedisClient.setex.mockRejectedValue(error);
            mockRedisClient.del.mockRejectedValue(error);

            // 所有操作都应该成功完成而不抛出错误
            await expect(cacheService.get(domain)).resolves.toBeNull();
            await expect(cacheService.set(domain, data)).resolves.toBeUndefined();
            await expect(cacheService.delete(domain)).resolves.toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
     * 
     * 属性: 多次设置同一个键应覆盖之前的值
     * 
     * 这验证了：
     * - 缓存更新机制正确工作
     * - 最新的数据总是被保存
     */
    it('多次设置同一个键应保存最新的值', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainArbitrary,
          fc.array(domainDataArbitrary, { minLength: 2, maxLength: 5 }),
          async (domain, dataArray) => {
            // 为每次测试重置 mock
            mockRedisClient.setex.mockClear();
            mockRedisClient.get.mockClear();
            mockRedisClient.setex.mockResolvedValue('OK');

            // 多次设置同一个键
            for (const data of dataArray) {
              await cacheService.set(domain, data);
            }

            // 模拟获取最后一次设置的值
            const lastData = dataArray[dataArray.length - 1];
            mockRedisClient.get.mockResolvedValue(JSON.stringify(lastData));

            const retrieved = await cacheService.get(domain);

            // 验证返回的是最后一次设置的值
            expect(retrieved).toEqual(lastData);

            // 验证 setex 被调用了正确的次数
            expect(mockRedisClient.setex).toHaveBeenCalledTimes(dataArray.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
