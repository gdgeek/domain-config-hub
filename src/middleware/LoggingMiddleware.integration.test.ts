/**
 * LoggingMiddleware 集成测试
 * 
 * 测试日志中间件在真实 Express 应用中的行为
 */

import express, { Express, Request, Response } from 'express';
import request from 'supertest';
import { loggingMiddleware } from './LoggingMiddleware';
import { requestIdMiddleware } from './RequestIdMiddleware';
import { logger } from '../config/logger';

// Mock logger
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    log: jest.fn(),
  },
}));

describe('LoggingMiddleware Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    
    // 应用中间件
    app.use(requestIdMiddleware);
    app.use(loggingMiddleware);

    // 测试路由
    app.get('/test', (_req: Request, res: Response) => {
      res.status(200).json({ message: 'success' });
    });

    app.get('/error', (_req: Request, res: Response) => {
      res.status(500).json({ error: 'Internal Server Error' });
    });

    app.get('/not-found', (_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not Found' });
    });
  });

  it('应该记录成功请求的日志', async () => {
    await request(app)
      .get('/test')
      .expect(200);

    // 验证请求日志
    expect(logger.info).toHaveBeenCalledWith('Incoming request', 
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        requestId: expect.any(String),
      })
    );

    // 验证响应日志
    expect(logger.log).toHaveBeenCalledWith('info', 'Request completed',
      expect.objectContaining({
        method: 'GET',
        url: '/test',
        statusCode: 200,
        duration: expect.stringMatching(/^\d+ms$/),
        requestId: expect.any(String),
      })
    );
  });

  it('应该记录错误请求的日志', async () => {
    await request(app)
      .get('/error')
      .expect(500);

    // 验证响应日志使用 warn 级别
    expect(logger.log).toHaveBeenCalledWith('warn', 'Request completed',
      expect.objectContaining({
        statusCode: 500,
      })
    );
  });

  it('应该记录 404 请求的日志', async () => {
    await request(app)
      .get('/not-found')
      .expect(404);

    // 验证响应日志使用 warn 级别
    expect(logger.log).toHaveBeenCalledWith('warn', 'Request completed',
      expect.objectContaining({
        statusCode: 404,
      })
    );
  });

  it('应该在日志中包含请求 ID', async () => {
    const response = await request(app)
      .get('/test')
      .expect(200);

    const requestId = response.headers['x-request-id'];
    expect(requestId).toBeDefined();

    // 验证请求日志包含请求 ID
    expect(logger.info).toHaveBeenCalledWith('Incoming request',
      expect.objectContaining({
        requestId,
      })
    );

    // 验证响应日志包含请求 ID
    expect(logger.log).toHaveBeenCalledWith('info', 'Request completed',
      expect.objectContaining({
        requestId,
      })
    );
  });

  it('应该记录 user-agent', async () => {
    await request(app)
      .get('/test')
      .set('User-Agent', 'test-client/1.0')
      .expect(200);

    expect(logger.info).toHaveBeenCalledWith('Incoming request',
      expect.objectContaining({
        userAgent: 'test-client/1.0',
      })
    );
  });

  it('应该记录客户端 IP', async () => {
    await request(app)
      .get('/test')
      .expect(200);

    expect(logger.info).toHaveBeenCalledWith('Incoming request',
      expect.objectContaining({
        ip: expect.any(String),
      })
    );
  });

  it('应该记录响应时间', async () => {
    await request(app)
      .get('/test')
      .expect(200);

    const logCall = (logger.log as jest.Mock).mock.calls[0];
    const logData = logCall[2];

    expect(logData.duration).toMatch(/^\d+ms$/);
  });

  it('应该为每个请求记录两次日志（请求和响应）', async () => {
    await request(app)
      .get('/test')
      .expect(200);

    // 一次请求日志
    expect(logger.info).toHaveBeenCalledTimes(1);
    
    // 一次响应日志
    expect(logger.log).toHaveBeenCalledTimes(1);
  });

  it('应该处理多个并发请求', async () => {
    const requests = [
      request(app).get('/test'),
      request(app).get('/test'),
      request(app).get('/test'),
    ];

    await Promise.all(requests);

    // 每个请求应该有一次请求日志
    expect(logger.info).toHaveBeenCalledTimes(3);
    
    // 每个请求应该有一次响应日志
    expect(logger.log).toHaveBeenCalledTimes(3);
  });

  it('应该为不同的请求使用不同的请求 ID', async () => {
    await request(app).get('/test').expect(200);
    await request(app).get('/test').expect(200);

    const firstRequestId = (logger.info as jest.Mock).mock.calls[0][1].requestId;
    const secondRequestId = (logger.info as jest.Mock).mock.calls[1][1].requestId;

    expect(firstRequestId).not.toBe(secondRequestId);
  });
});
