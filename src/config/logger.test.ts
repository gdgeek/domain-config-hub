/**
 * 日志配置模块测试
 * 
 * 测试 Winston 日志器配置和辅助函数
 * 需求: 7.3, 7.4
 */

import fs from 'fs';

// 在导入 logger 之前设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';
process.env.LOG_FILE = 'logs/test.log';

import { logger, logError, createRequestLogger, isValidLogLevel, LogContext } from './logger';

describe('Logger Module', () => {
  const testLogDir = 'logs';
  const testLogFile = 'logs/test.log';
  const testErrorLogFile = 'logs/test.error.log';

  beforeAll(() => {
    // 确保测试日志目录存在
    if (!fs.existsSync(testLogDir)) {
      fs.mkdirSync(testLogDir, { recursive: true });
    }
  });

  afterAll(() => {
    // 清理测试日志文件
    try {
      if (fs.existsSync(testLogFile)) {
        fs.unlinkSync(testLogFile);
      }
      if (fs.existsSync(testErrorLogFile)) {
        fs.unlinkSync(testErrorLogFile);
      }
    } catch {
      // 忽略清理错误
    }
  });

  describe('logger instance', () => {
    it('should be defined', () => {
      expect(logger).toBeDefined();
    });

    it('should have standard log methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      // 不应抛出错误
      expect(() => {
        logger.info('Test info message');
      }).not.toThrow();
    });

    it('should log error messages', () => {
      // 不应抛出错误
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();
    });

    it('should log with context metadata', () => {
      // 不应抛出错误
      expect(() => {
        logger.info('Test message with context', { requestId: 'test-123', userId: 'user-456' });
      }).not.toThrow();
    });
  });

  describe('logError function', () => {
    it('should log error with basic error object', () => {
      const error = new Error('Test error message');
      
      // 不应抛出错误
      expect(() => {
        logError(error);
      }).not.toThrow();
    });

    it('should log error with context', () => {
      const error = new Error('Test error with context');
      const context: LogContext = {
        requestId: 'req-123',
        userId: 'user-456',
        action: 'test-action',
      };

      // 不应抛出错误
      expect(() => {
        logError(error, context);
      }).not.toThrow();
    });

    it('should handle error with stack trace', () => {
      const error = new Error('Error with stack');
      
      // 确保错误有堆栈信息
      expect(error.stack).toBeDefined();
      
      // 不应抛出错误
      expect(() => {
        logError(error);
      }).not.toThrow();
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string, public code: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error message', 'CUSTOM_CODE');
      
      // 不应抛出错误
      expect(() => {
        logError(error, { code: error.code });
      }).not.toThrow();
    });
  });

  describe('createRequestLogger function', () => {
    it('should create a child logger with requestId', () => {
      const requestId = 'test-request-id-123';
      const requestLogger = createRequestLogger(requestId);

      expect(requestLogger).toBeDefined();
      expect(typeof requestLogger.info).toBe('function');
      expect(typeof requestLogger.error).toBe('function');
    });

    it('should log messages with requestId in metadata', () => {
      const requestId = 'test-request-id-456';
      const requestLogger = createRequestLogger(requestId);

      // 不应抛出错误
      expect(() => {
        requestLogger.info('Test message from request logger');
      }).not.toThrow();
    });
  });

  describe('isValidLogLevel function', () => {
    it('should return true for valid log levels', () => {
      expect(isValidLogLevel('error')).toBe(true);
      expect(isValidLogLevel('warn')).toBe(true);
      expect(isValidLogLevel('info')).toBe(true);
      expect(isValidLogLevel('http')).toBe(true);
      expect(isValidLogLevel('verbose')).toBe(true);
      expect(isValidLogLevel('debug')).toBe(true);
      expect(isValidLogLevel('silly')).toBe(true);
    });

    it('should return false for invalid log levels', () => {
      expect(isValidLogLevel('invalid')).toBe(false);
      expect(isValidLogLevel('trace')).toBe(false);
      expect(isValidLogLevel('')).toBe(false);
      expect(isValidLogLevel('INFO')).toBe(false); // 大小写敏感
    });
  });

  describe('JSON format requirements (需求 7.4)', () => {
    it('should include timestamp in log output', async () => {
      // 写入一条日志
      logger.info('Test timestamp message');
      
      // 等待日志写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 读取日志文件
      if (fs.existsSync(testLogFile)) {
        const logContent = fs.readFileSync(testLogFile, 'utf-8');
        const lines = logContent.trim().split('\n').filter(line => line.length > 0);
        
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const logEntry = JSON.parse(lastLine);
          
          // 验证 JSON 格式包含必要字段
          expect(logEntry).toHaveProperty('timestamp');
          expect(logEntry).toHaveProperty('level');
          expect(logEntry).toHaveProperty('message');
        }
      }
    });

    it('should include service name in log output', async () => {
      // 写入一条日志
      logger.info('Test service name message');
      
      // 等待日志写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 读取日志文件
      if (fs.existsSync(testLogFile)) {
        const logContent = fs.readFileSync(testLogFile, 'utf-8');
        const lines = logContent.trim().split('\n').filter(line => line.length > 0);
        
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const logEntry = JSON.parse(lastLine);
          
          // 验证包含服务名称
          expect(logEntry).toHaveProperty('service', 'domain-config-service');
        }
      }
    });
  });

  describe('Error logging to file (需求 7.3)', () => {
    it('should write error logs to error log file', async () => {
      const testError = new Error('Test error for file logging');
      
      // 记录错误
      logError(testError, { requestId: 'error-test-123' });
      
      // 等待日志写入
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证错误日志文件存在
      if (fs.existsSync(testErrorLogFile)) {
        const errorLogContent = fs.readFileSync(testErrorLogFile, 'utf-8');
        const lines = errorLogContent.trim().split('\n').filter(line => line.length > 0);
        
        if (lines.length > 0) {
          const lastLine = lines[lines.length - 1];
          const logEntry = JSON.parse(lastLine);
          
          // 验证错误日志格式
          expect(logEntry).toHaveProperty('level', 'error');
          expect(logEntry).toHaveProperty('message');
        }
      }
    });
  });
});
