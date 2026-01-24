/**
 * CacheService 单元测试
 * 
 * 测试缓存服务的 get、set、delete 方法和 isEnabled 检查
 * 
 * 需求:
 * - 2.1: WHERE Redis 缓存已启用，WHEN 查询域名配置 THEN Cache_Layer SHALL 首先检查缓存是否存在该域名的配置
 * - 2.2: WHERE Redis 缓存已启用，WHEN 缓存命中 THEN Domain_Config_Service SHALL 直接返回缓存数据而不查询数据库
 * - 2.3: WHERE Redis 缓存已启用，WHEN 缓存未命中 THEN Domain_Config_Service SHALL 查询数据库并将结果存入缓存
 * - 2.6: THE Cache_Layer SHALL 支持配置缓存过期时间（TTL）
 */

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

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: {
    get: jest.Mock;
    setex: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 创建 mock Redis 客户端
    mockRedisClient = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    };
    
    // 创建新的 CacheService 实例
    cacheService = new CacheService();
  });

  describe('CACHE_KEY_PREFIX', () => {
    it('应该使用正确的缓存键前缀', () => {
      expect(CACHE_KEY_PREFIX).toBe('domain:config:');
    });
  });

  describe('isEnabled', () => {
    it('当 Redis 已启用且客户端已连接时应返回 true', () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

      expect(cacheService.isEnabled()).toBe(true);
    });

    it('当 Redis 未启用时应返回 false', () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);

      expect(cacheService.isEnabled()).toBe(false);
    });

    it('当 Redis 客户端未连接时应返回 false', () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(null);

      expect(cacheService.isEnabled()).toBe(false);
    });

    it('当 Redis 未启用且客户端未连接时应返回 false', () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(null);

      expect(cacheService.isEnabled()).toBe(false);
    });
  });

  describe('get', () => {
    beforeEach(() => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('当缓存命中时应返回解析后的数据', async () => {
      const testData = { id: 1, domain: 'example.com', title: 'Test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get<typeof testData>('example.com');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('domain:config:example.com');
    });

    it('当缓存未命中时应返回 null', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('nonexistent.com');

      expect(result).toBeNull();
      expect(mockRedisClient.get).toHaveBeenCalledWith('domain:config:nonexistent.com');
    });

    it('当缓存未启用时应返回 null 且不调用 Redis', async () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);

      const result = await cacheService.get('example.com');

      expect(result).toBeNull();
      expect(mockRedisClient.get).not.toHaveBeenCalled();
    });

    it('当 Redis 客户端为 null 时应返回 null', async () => {
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(null);

      const result = await cacheService.get('example.com');

      expect(result).toBeNull();
    });

    it('当 Redis 操作失败时应返回 null 而不抛出错误', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'));

      const result = await cacheService.get('example.com');

      expect(result).toBeNull();
    });

    it('当 JSON 解析失败时应返回 null 而不抛出错误', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await cacheService.get('example.com');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    beforeEach(() => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('应使用默认 TTL 设置缓存', async () => {
      const testData = { id: 1, domain: 'example.com' };
      mockRedisClient.setex.mockResolvedValue('OK');

      await cacheService.set('example.com', testData);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'domain:config:example.com',
        3600, // 默认 TTL
        JSON.stringify(testData)
      );
    });

    it('应使用自定义 TTL 设置缓存', async () => {
      const testData = { id: 1, domain: 'example.com' };
      const customTtl = 1800;
      mockRedisClient.setex.mockResolvedValue('OK');

      await cacheService.set('example.com', testData, customTtl);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'domain:config:example.com',
        customTtl,
        JSON.stringify(testData)
      );
    });

    it('当缓存未启用时应跳过设置', async () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);

      await cacheService.set('example.com', { id: 1 });

      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('当 Redis 客户端为 null 时应跳过设置', async () => {
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(null);

      await cacheService.set('example.com', { id: 1 });

      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('当 Redis 操作失败时应静默失败而不抛出错误', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis connection error'));

      // 不应抛出错误
      await expect(cacheService.set('example.com', { id: 1 })).resolves.toBeUndefined();
    });

    it('应正确序列化复杂对象', async () => {
      const complexData = {
        id: 1,
        domain: 'example.com',
        links: { home: 'https://example.com', about: 'https://example.com/about' },
        nested: { level1: { level2: 'value' } },
      };
      mockRedisClient.setex.mockResolvedValue('OK');

      await cacheService.set('example.com', complexData);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'domain:config:example.com',
        3600,
        JSON.stringify(complexData)
      );
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('应删除指定的缓存键', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.delete('example.com');

      expect(mockRedisClient.del).toHaveBeenCalledWith('domain:config:example.com');
    });

    it('当缓存未启用时应跳过删除', async () => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(false);

      await cacheService.delete('example.com');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('当 Redis 客户端为 null 时应跳过删除', async () => {
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(null);

      await cacheService.delete('example.com');

      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('当 Redis 操作失败时应静默失败而不抛出错误', async () => {
      mockRedisClient.del.mockRejectedValue(new Error('Redis connection error'));

      // 不应抛出错误
      await expect(cacheService.delete('example.com')).resolves.toBeUndefined();
    });

    it('当键不存在时也应正常完成', async () => {
      mockRedisClient.del.mockResolvedValue(0); // 0 表示没有删除任何键

      await expect(cacheService.delete('nonexistent.com')).resolves.toBeUndefined();
      expect(mockRedisClient.del).toHaveBeenCalledWith('domain:config:nonexistent.com');
    });
  });

  describe('缓存键格式', () => {
    beforeEach(() => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('应为所有操作使用正确的缓存键前缀', async () => {
      const key = 'test.example.com';
      const expectedCacheKey = `domain:config:${key}`;

      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.get(key);
      expect(mockRedisClient.get).toHaveBeenCalledWith(expectedCacheKey);

      await cacheService.set(key, { data: 'test' });
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expectedCacheKey,
        expect.any(Number),
        expect.any(String)
      );

      await cacheService.delete(key);
      expect(mockRedisClient.del).toHaveBeenCalledWith(expectedCacheKey);
    });
  });

  describe('数据类型处理', () => {
    beforeEach(() => {
      (redisModule.isRedisEnabled as jest.Mock).mockReturnValue(true);
      (redisModule.getRedisClient as jest.Mock).mockReturnValue(mockRedisClient);
    });

    it('应正确处理字符串值', async () => {
      const stringValue = 'simple string';
      mockRedisClient.get.mockResolvedValue(JSON.stringify(stringValue));

      const result = await cacheService.get<string>('key');

      expect(result).toBe(stringValue);
    });

    it('应正确处理数字值', async () => {
      const numberValue = 42;
      mockRedisClient.get.mockResolvedValue(JSON.stringify(numberValue));

      const result = await cacheService.get<number>('key');

      expect(result).toBe(numberValue);
    });

    it('应正确处理数组值', async () => {
      const arrayValue = [1, 2, 3, 'test'];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(arrayValue));

      const result = await cacheService.get<typeof arrayValue>('key');

      expect(result).toEqual(arrayValue);
    });

    it('应正确处理 null 字段的对象', async () => {
      const objectWithNull = { id: 1, title: null, description: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(objectWithNull));

      const result = await cacheService.get<typeof objectWithNull>('key');

      expect(result).toEqual(objectWithNull);
    });
  });
});
