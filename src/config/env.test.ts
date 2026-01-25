/**
 * 环境变量配置模块单元测试
 */

import {
  requireEnv,
  getEnv,
  getEnvNumber,
  getEnvBoolean,
  reloadConfig,
  getConfigSnapshot,
} from './env';

describe('环境变量配置模块', () => {
  // 保存原始环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('requireEnv', () => {
    it('应该返回存在的环境变量值', () => {
      process.env.TEST_VAR = 'test_value';
      expect(requireEnv('TEST_VAR')).toBe('test_value');
    });

    it('应该在环境变量不存在时抛出错误', () => {
      delete process.env.MISSING_VAR;
      expect(() => requireEnv('MISSING_VAR')).toThrow('必需的环境变量 MISSING_VAR 未设置');
    });

    it('应该在环境变量为空字符串时抛出错误', () => {
      process.env.EMPTY_VAR = '';
      expect(() => requireEnv('EMPTY_VAR')).toThrow('必需的环境变量 EMPTY_VAR 未设置');
    });
  });

  describe('getEnv', () => {
    it('应该返回存在的环境变量值', () => {
      process.env.TEST_VAR = 'test_value';
      expect(getEnv('TEST_VAR')).toBe('test_value');
    });

    it('应该在环境变量不存在时返回默认值', () => {
      delete process.env.MISSING_VAR;
      expect(getEnv('MISSING_VAR', 'default')).toBe('default');
    });

    it('应该在环境变量为空字符串时返回默认值', () => {
      process.env.EMPTY_VAR = '';
      expect(getEnv('EMPTY_VAR', 'default')).toBe('default');
    });

    it('应该在没有提供默认值时返回空字符串', () => {
      delete process.env.MISSING_VAR;
      expect(getEnv('MISSING_VAR')).toBe('');
    });
  });

  describe('getEnvNumber', () => {
    it('应该返回解析后的数字值', () => {
      process.env.NUM_VAR = '42';
      expect(getEnvNumber('NUM_VAR', 0)).toBe(42);
    });

    it('应该在环境变量不存在时返回默认值', () => {
      delete process.env.MISSING_VAR;
      expect(getEnvNumber('MISSING_VAR', 100)).toBe(100);
    });

    it('应该在环境变量为空字符串时返回默认值', () => {
      process.env.EMPTY_VAR = '';
      expect(getEnvNumber('EMPTY_VAR', 100)).toBe(100);
    });

    it('应该在值不是有效数字时抛出错误', () => {
      process.env.INVALID_NUM = 'not_a_number';
      expect(() => getEnvNumber('INVALID_NUM', 0)).toThrow(
        '环境变量 INVALID_NUM 的值 "not_a_number" 不是有效的数字'
      );
    });

    it('应该正确解析负数', () => {
      process.env.NEG_NUM = '-10';
      expect(getEnvNumber('NEG_NUM', 0)).toBe(-10);
    });

    it('应该正确解析零', () => {
      process.env.ZERO_NUM = '0';
      expect(getEnvNumber('ZERO_NUM', 100)).toBe(0);
    });
  });

  describe('getEnvBoolean', () => {
    it('应该将 "true" 解析为 true', () => {
      process.env.BOOL_VAR = 'true';
      expect(getEnvBoolean('BOOL_VAR', false)).toBe(true);
    });

    it('应该将 "TRUE" 解析为 true（不区分大小写）', () => {
      process.env.BOOL_VAR = 'TRUE';
      expect(getEnvBoolean('BOOL_VAR', false)).toBe(true);
    });

    it('应该将 "1" 解析为 true', () => {
      process.env.BOOL_VAR = '1';
      expect(getEnvBoolean('BOOL_VAR', false)).toBe(true);
    });

    it('应该将 "false" 解析为 false', () => {
      process.env.BOOL_VAR = 'false';
      expect(getEnvBoolean('BOOL_VAR', true)).toBe(false);
    });

    it('应该将其他值解析为 false', () => {
      process.env.BOOL_VAR = 'anything';
      expect(getEnvBoolean('BOOL_VAR', true)).toBe(false);
    });

    it('应该在环境变量不存在时返回默认值', () => {
      delete process.env.MISSING_VAR;
      expect(getEnvBoolean('MISSING_VAR', true)).toBe(true);
      expect(getEnvBoolean('MISSING_VAR', false)).toBe(false);
    });

    it('应该在环境变量为空字符串时返回默认值', () => {
      process.env.EMPTY_VAR = '';
      expect(getEnvBoolean('EMPTY_VAR', true)).toBe(true);
    });
  });

  describe('配置对象', () => {
    beforeEach(() => {
      // 设置测试环境变量
      process.env.NODE_ENV = 'test';
      process.env.PORT = '4000';
      process.env.DB_HOST = 'test-db-host';
      process.env.DB_PORT = '3307';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';
      process.env.DB_POOL_MIN = '1';
      process.env.DB_POOL_MAX = '5';
      process.env.REDIS_ENABLED = 'true';
      process.env.REDIS_HOST = 'test-redis-host';
      process.env.REDIS_PORT = '6380';
      process.env.REDIS_PASSWORD = 'redis_password';
      process.env.REDIS_TTL = '1800';
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_FILE = 'logs/test.log';
      process.env.API_PREFIX = '/api/v1';
      process.env.MAX_PAGE_SIZE = '50';
      process.env.DEFAULT_PAGE_SIZE = '10';
      process.env.RATE_LIMIT_WINDOW_MS = '30000';
      process.env.RATE_LIMIT_MAX = '50';
    });

    it('应该正确加载所有配置项', () => {
      const config = reloadConfig();

      // 服务配置
      expect(config.nodeEnv).toBe('test');
      expect(config.port).toBe(4000);

      // 数据库配置
      expect(config.dbHost).toBe('test-db-host');
      expect(config.dbPort).toBe(3307);
      expect(config.dbName).toBe('test_db');
      expect(config.dbUser).toBe('test_user');
      expect(config.dbPassword).toBe('test_password');
      expect(config.dbPoolMin).toBe(1);
      expect(config.dbPoolMax).toBe(5);

      // Redis 配置
      expect(config.redisEnabled).toBe(true);
      expect(config.redisHost).toBe('test-redis-host');
      expect(config.redisPort).toBe(6380);
      expect(config.redisPassword).toBe('redis_password');
      expect(config.redisTtl).toBe(1800);

      // 日志配置
      expect(config.logLevel).toBe('debug');
      expect(config.logFile).toBe('logs/test.log');

      // API 配置
      expect(config.apiPrefix).toBe('/api/v1');
      expect(config.maxPageSize).toBe(50);
      expect(config.defaultPageSize).toBe(10);

      // 限流配置
      expect(config.rateLimitWindowMs).toBe(30000);
      expect(config.rateLimitMax).toBe(50);
    });

    it('应该使用默认值当环境变量未设置时', () => {
      // 清除所有测试环境变量
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_POOL_MIN;
      delete process.env.DB_POOL_MAX;
      delete process.env.REDIS_ENABLED;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.REDIS_PASSWORD;
      delete process.env.REDIS_TTL;
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_FILE;
      delete process.env.API_PREFIX;
      delete process.env.MAX_PAGE_SIZE;
      delete process.env.DEFAULT_PAGE_SIZE;
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX;

      const config = reloadConfig();

      // 验证默认值
      expect(config.nodeEnv).toBe('development');
      expect(config.port).toBe(3000);
      expect(config.dbHost).toBe('localhost');
      expect(config.dbPort).toBe(3306);
      expect(config.dbName).toBe('domain_config');
      expect(config.dbUser).toBe('root');
      expect(config.dbPassword).toBe('');
      expect(config.dbPoolMin).toBe(2);
      expect(config.dbPoolMax).toBe(10);
      expect(config.redisEnabled).toBe(false);
      expect(config.redisHost).toBe('localhost');
      expect(config.redisPort).toBe(6379);
      expect(config.redisPassword).toBe('');
      expect(config.redisTtl).toBe(3600);
      expect(config.logLevel).toBe('info');
      expect(config.logFile).toBe('logs/app.log');
      expect(config.apiPrefix).toBe('/api/v1');
      expect(config.maxPageSize).toBe(100);
      expect(config.defaultPageSize).toBe(20);
      expect(config.rateLimitWindowMs).toBe(60000);
      expect(config.rateLimitMax).toBe(100);
    });
  });

  describe('getConfigSnapshot', () => {
    it('应该返回当前配置的快照', () => {
      process.env.NODE_ENV = 'snapshot_test';
      process.env.PORT = '5000';

      const snapshot = getConfigSnapshot();

      expect(snapshot.nodeEnv).toBe('snapshot_test');
      expect(snapshot.port).toBe(5000);
    });

    it('每次调用应该返回新的配置对象', () => {
      const snapshot1 = getConfigSnapshot();
      const snapshot2 = getConfigSnapshot();

      expect(snapshot1).not.toBe(snapshot2);
      expect(snapshot1).toEqual(snapshot2);
    });
  });
});
