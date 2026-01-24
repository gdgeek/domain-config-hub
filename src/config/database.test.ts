/**
 * 数据库配置模块单元测试
 * 
 * 测试 Sequelize 配置和 connectWithRetry 重试连接函数
 */

// Set up environment variables before importing modules
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_POOL_MIN = '2';
process.env.DB_POOL_MAX = '10';
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE = 'logs/test.log';

import { sequelize, connectWithRetry, closeDatabase, isDatabaseConnected } from './database';
import { logger } from './logger';

// Mock logger methods
jest.spyOn(logger, 'info').mockImplementation(() => logger);
jest.spyOn(logger, 'warn').mockImplementation(() => logger);
jest.spyOn(logger, 'error').mockImplementation(() => logger);
jest.spyOn(logger, 'debug').mockImplementation(() => logger);

describe('Database Configuration Module', () => {
  let authenticateSpy: jest.SpyInstance;
  let closeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Spy on sequelize methods
    authenticateSpy = jest.spyOn(sequelize, 'authenticate');
    closeSpy = jest.spyOn(sequelize, 'close');
  });

  afterEach(() => {
    jest.useRealTimers();
    authenticateSpy.mockRestore();
    closeSpy.mockRestore();
  });

  describe('sequelize instance', () => {
    it('should create a Sequelize instance', () => {
      expect(sequelize).toBeDefined();
      expect(sequelize.getDialect()).toBe('mysql');
    });

    it('should have correct database name', () => {
      expect(sequelize.getDatabaseName()).toBe('test_db');
    });
  });

  describe('connectWithRetry', () => {
    it('should connect successfully on first attempt', async () => {
      authenticateSpy.mockResolvedValueOnce(undefined);

      await connectWithRetry(3, 100);

      expect(authenticateSpy).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        '数据库连接成功',
        expect.any(Object)
      );
    });

    it('should retry on connection failure', async () => {
      authenticateSpy
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce(undefined);

      const connectPromise = connectWithRetry(3, 100);

      // Advance timers for first retry
      await jest.advanceTimersByTimeAsync(100);
      // Advance timers for second retry
      await jest.advanceTimersByTimeAsync(100);

      await connectPromise;

      expect(authenticateSpy).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        '数据库连接成功',
        expect.any(Object)
      );
    });

    it('should throw error after max retries', async () => {
      authenticateSpy.mockRejectedValue(new Error('Connection refused'));

      // Start the connection attempt
      let caughtError: Error | undefined;
      const connectPromise = connectWithRetry(3, 100).catch((e: Error) => {
        caughtError = e;
      });

      // Advance timers for first retry delay
      await jest.advanceTimersByTimeAsync(100);
      // Advance timers for second retry delay
      await jest.advanceTimersByTimeAsync(100);

      // Wait for the promise to complete
      await connectPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError!.message).toBe('数据库连接失败，已重试 3 次');
      expect(authenticateSpy).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledWith(
        '数据库连接失败，已重试 3 次',
        expect.any(Object)
      );
    });

    it('should use default values for maxRetries and delay', async () => {
      authenticateSpy.mockResolvedValueOnce(undefined);

      await connectWithRetry();

      expect(authenticateSpy).toHaveBeenCalledTimes(1);
    });

    it('should log connection attempts with host info', async () => {
      authenticateSpy.mockResolvedValueOnce(undefined);

      await connectWithRetry(3, 100);

      expect(logger.info).toHaveBeenCalledWith(
        '正在连接数据库... (尝试 1/3)',
        expect.objectContaining({
          host: 'localhost',
          port: 3306,
          database: 'test_db',
        })
      );
    });

    it('should log retry delay message', async () => {
      authenticateSpy
        .mockRejectedValueOnce(new Error('Connection refused'))
        .mockResolvedValueOnce(undefined);

      const connectPromise = connectWithRetry(3, 5000);

      // Advance timers for retry
      await jest.advanceTimersByTimeAsync(5000);

      await connectPromise;

      expect(logger.info).toHaveBeenCalledWith('5 秒后重试...');
    });

    it('should handle non-Error objects thrown', async () => {
      authenticateSpy.mockRejectedValueOnce('String error');
      authenticateSpy.mockResolvedValueOnce(undefined);

      const connectPromise = connectWithRetry(2, 100);

      await jest.advanceTimersByTimeAsync(100);

      await connectPromise;

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('数据库连接失败'),
        expect.objectContaining({
          error: 'String error',
        })
      );
    });
  });

  describe('closeDatabase', () => {
    it('should close database connection successfully', async () => {
      closeSpy.mockResolvedValueOnce(undefined);

      await closeDatabase();

      expect(closeSpy).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('数据库连接已关闭');
    });

    it('should throw error if close fails', async () => {
      const closeError = new Error('Close failed');
      closeSpy.mockRejectedValueOnce(closeError);

      await expect(closeDatabase()).rejects.toThrow('Close failed');

      expect(logger.error).toHaveBeenCalledWith(
        '关闭数据库连接时出错',
        expect.objectContaining({ error: 'Close failed' })
      );
    });

    it('should handle non-Error objects thrown during close', async () => {
      closeSpy.mockRejectedValueOnce('String error');

      await expect(closeDatabase()).rejects.toThrow('String error');
    });
  });

  describe('isDatabaseConnected', () => {
    it('should return true when database is connected', async () => {
      authenticateSpy.mockResolvedValueOnce(undefined);

      const result = await isDatabaseConnected();

      expect(result).toBe(true);
    });

    it('should return false when database is not connected', async () => {
      authenticateSpy.mockRejectedValueOnce(new Error('Not connected'));

      const result = await isDatabaseConnected();

      expect(result).toBe(false);
    });
  });

  describe('module exports', () => {
    it('should export sequelize instance', async () => {
      const database = await import('./database');
      expect(database.sequelize).toBeDefined();
    });

    it('should export connectWithRetry function', async () => {
      const database = await import('./database');
      expect(database.connectWithRetry).toBeDefined();
      expect(typeof database.connectWithRetry).toBe('function');
    });

    it('should export closeDatabase function', async () => {
      const database = await import('./database');
      expect(database.closeDatabase).toBeDefined();
      expect(typeof database.closeDatabase).toBe('function');
    });

    it('should export isDatabaseConnected function', async () => {
      const database = await import('./database');
      expect(database.isDatabaseConnected).toBeDefined();
      expect(typeof database.isDatabaseConnected).toBe('function');
    });

    it('should export default database module', async () => {
      const database = await import('./database');
      expect(database.default).toBeDefined();
      expect(database.default.sequelize).toBeDefined();
      expect(database.default.connectWithRetry).toBeDefined();
    });
  });
});
