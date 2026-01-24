/**
 * Express 应用配置（双表版本）
 * 
 * 配置中间件、路由和错误处理
 * 支持双表架构（domains + configs）
 */

import express, { Express, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { requestIdMiddleware } from './middleware/RequestIdMiddleware';
import { loggingMiddleware } from './middleware/LoggingMiddleware';
import { rateLimitMiddleware } from './middleware/RateLimitMiddleware';
import { metricsMiddleware } from './middleware/MetricsMiddleware';
import { errorHandler } from './middleware/ErrorMiddleware';
import { swaggerSpec } from './config/swagger';
import { metricsRegistry } from './config/metrics';
import { config } from './config/env';
import { sequelize } from './config/database';
import { isRedisEnabled, connectRedis } from './config/redis';
import { logger } from './config/logger';

// 导入路由
import domainV2Routes from './routes/DomainV2Routes';
import configRoutes from './routes/ConfigRoutes';

/**
 * 创建 Express 应用
 */
export function createApp(): Express {
  const app = express();

  // ============================================================
  // 基础中间件
  // ============================================================
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ============================================================
  // 请求处理中间件（按顺序执行）
  // ============================================================
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);
  app.use(loggingMiddleware);
  app.use(rateLimitMiddleware);

  // ============================================================
  // API 路由
  // ============================================================
  app.use(`${config.apiPrefix}/domains`, domainV2Routes);
  app.use(`${config.apiPrefix}/configs`, configRoutes);

  // ============================================================
  // API 文档
  // ============================================================
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // ============================================================
  // 健康检查端点
  // ============================================================
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      // 检查数据库连接
      await sequelize.authenticate();
      const dbStatus = 'healthy';

      // 检查 Redis 连接（如果启用）
      let redisStatus = 'disabled';
      if (isRedisEnabled()) {
        try {
          // 尝试连接 Redis 来检查健康状态
          await connectRedis();
          redisStatus = 'healthy';
        } catch (error) {
          redisStatus = 'unhealthy';
          logger.error('Redis 健康检查失败', { error });
        }
      }

      // 确定整体状态
      const status = redisStatus === 'unhealthy' ? 'degraded' : 'healthy';

      res.json({
        status,
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      });
    } catch (error) {
      logger.error('健康检查失败', { error });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      });
    }
  });

  // ============================================================
  // 监控指标端点
  // ============================================================
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', metricsRegistry.contentType);
      const metrics = await metricsRegistry.metrics();
      res.send(metrics);
    } catch (error) {
      logger.error('获取监控指标失败', { error });
      res.status(500).json({
        error: {
          code: 'METRICS_ERROR',
          message: '获取监控指标失败',
        },
      });
    }
  });

  // ============================================================
  // 404 处理
  // ============================================================
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: '请求的资源不存在',
      },
    });
  });

  // ============================================================
  // 全局错误处理
  // ============================================================
  app.use(errorHandler);

  return app;
}

export default createApp();
