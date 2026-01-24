/**
 * Express 应用配置模块
 * 
 * 配置中间件执行顺序、挂载路由、配置 Swagger UI、实现健康检查和监控指标端点
 * 
 * 需求: 5.1, 6.1, 6.2, 6.4
 * - 5.1: WHEN 访问 /api-docs 端点 THEN Domain_Config_Service SHALL 返回 Swagger UI 界面
 * - 6.1: WHEN 访问 /health 端点 THEN Domain_Config_Service SHALL 返回服务健康状态，包括数据库和 Redis 连接状态
 * - 6.2: WHEN 访问 /metrics 端点 THEN Domain_Config_Service SHALL 返回 Prometheus 格式的监控指标
 * - 6.4: IF 数据库连接失败 THEN 健康检查 SHALL 返回 degraded 状态
 */

import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import { getMetrics, getMetricsContentType } from './config/metrics';
import { isDatabaseConnected } from './config/database';
import { isRedisConnected, isRedisEnabled } from './config/redis';
import { requestIdMiddleware } from './middleware/RequestIdMiddleware';
import { loggingMiddleware } from './middleware/LoggingMiddleware';
import { rateLimitMiddleware } from './middleware/RateLimitMiddleware';
import { metricsMiddleware } from './middleware/MetricsMiddleware';
import { errorHandler } from './middleware/ErrorMiddleware';
import { createDomainRoutes } from './routes/DomainRoutes';
import { IDomainService } from './services/DomainService';
import { config } from './config/env';

/**
 * 健康检查响应接口
 */
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: string;
      message: string;
    };
    redis: {
      status: string;
      message: string;
    };
  };
}

/**
 * 创建并配置 Express 应用
 * 
 * @param domainService - 域名服务实例
 * @returns 配置好的 Express 应用
 */
export function createApp(domainService: IDomainService): Application {
  const app = express();

  // ============================================================
  // 1. 基础中间件配置
  // ============================================================
  
  // 解析 JSON 请求体
  app.use(express.json());
  
  // 解析 URL 编码的请求体
  app.use(express.urlencoded({ extended: true }));

  // ============================================================
  // 2. 中间件执行顺序（按照设计文档的顺序）
  // ============================================================
  
  // 2.1 请求 ID 中间件（最先执行，为后续中间件提供请求 ID）
  app.use(requestIdMiddleware);
  
  // 2.2 监控指标中间件（记录所有请求的指标）
  app.use(metricsMiddleware);
  
  // 2.3 日志中间件（记录请求和响应日志）
  app.use(loggingMiddleware);
  
  // 2.4 限流中间件（防止滥用）
  app.use(rateLimitMiddleware);

  // ============================================================
  // 3. API 文档路由（需求 5.1）
  // ============================================================
  
  /**
   * @openapi
   * /api-docs:
   *   get:
   *     tags:
   *       - Documentation
   *     summary: API 文档
   *     description: 访问 Swagger UI 界面查看 API 文档
   *     responses:
   *       200:
   *         description: 返回 Swagger UI 界面
   */
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // ============================================================
  // 4. 健康检查端点（需求 6.1, 6.4）
  // ============================================================
  
  /**
   * @openapi
   * /health:
   *   get:
   *     tags:
   *       - Health
   *     summary: 健康检查
   *     description: 检查服务健康状态，包括数据库和 Redis 连接状态
   *     responses:
   *       200:
   *         description: 服务健康或部分降级
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *       503:
   *         description: 服务不健康
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   */
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      // 检查数据库连接状态
      const dbConnected = await isDatabaseConnected();
      
      // 检查 Redis 连接状态（如果启用）
      const redisEnabled = isRedisEnabled();
      const redisConnected = redisEnabled ? isRedisConnected() : true;

      // 构建健康检查响应
      const healthResponse: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbConnected ? 'connected' : 'disconnected',
            message: dbConnected ? '数据库连接正常' : '数据库连接失败',
          },
          redis: {
            status: redisEnabled
              ? (redisConnected ? 'connected' : 'disconnected')
              : 'disabled',
            message: redisEnabled
              ? (redisConnected ? 'Redis 连接正常' : 'Redis 连接失败')
              : 'Redis 未启用',
          },
        },
      };

      // 根据服务状态确定整体健康状态
      if (!dbConnected) {
        // 数据库连接失败，服务不健康
        healthResponse.status = 'unhealthy';
        res.status(503).json(healthResponse);
      } else if (redisEnabled && !redisConnected) {
        // Redis 启用但连接失败，服务降级
        healthResponse.status = 'degraded';
        res.status(200).json(healthResponse);
      } else {
        // 所有服务正常
        res.status(200).json(healthResponse);
      }
    } catch (error) {
      // 健康检查本身出错
      const errorResponse: HealthCheckResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'unknown',
            message: '无法检查数据库状态',
          },
          redis: {
            status: 'unknown',
            message: '无法检查 Redis 状态',
          },
        },
      };
      res.status(503).json(errorResponse);
    }
  });

  // ============================================================
  // 5. 监控指标端点（需求 6.2）
  // ============================================================
  
  /**
   * @openapi
   * /metrics:
   *   get:
   *     tags:
   *       - Health
   *     summary: 监控指标
   *     description: 返回 Prometheus 格式的监控指标
   *     responses:
   *       200:
   *         description: 成功返回监控指标
   *         content:
   *           text/plain:
   *             schema:
   *               type: string
   *               example: |
   *                 # HELP http_requests_total Total number of HTTP requests
   *                 # TYPE http_requests_total counter
   *                 http_requests_total{method="GET",route="/api/v1/domains",status_code="200"} 42
   */
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      // 设置 Prometheus 内容类型
      res.set('Content-Type', getMetricsContentType());
      
      // 获取并返回指标
      const metrics = await getMetrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'METRICS_ERROR',
          message: '获取监控指标失败',
        },
      });
    }
  });

  // ============================================================
  // 6. 业务路由（挂载到 API 前缀下）
  // ============================================================
  
  // 挂载域名配置路由
  app.use(`${config.apiPrefix}/domains`, createDomainRoutes(domainService));

  // ============================================================
  // 7. 错误处理中间件（必须在所有路由之后）
  // ============================================================
  
  app.use(errorHandler);

  return app;
}

export default createApp;
