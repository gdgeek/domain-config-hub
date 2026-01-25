/**
 * 应用入口模块
 * 
 * 启动服务器并实现优雅关闭
 * 
 * 需求: 9.1, 9.2, 9.3, 9.4
 * - 9.1: WHEN 收到 SIGTERM 或 SIGINT 信号 THEN Domain_Config_Service SHALL 停止接受新请求
 * - 9.2: WHEN 优雅关闭时 THEN Domain_Config_Service SHALL 等待正在处理的请求完成
 * - 9.3: WHEN 优雅关闭时 THEN Domain_Config_Service SHALL 关闭数据库和 Redis 连接
 * - 9.4: IF 优雅关闭超时 THEN Domain_Config_Service SHALL 强制退出
 */

import http from 'http';
import { config } from './config/env';
import { logger, logError } from './config/logger';
import { connectWithRetry, closeDatabase } from './config/database';
import { connectRedis, closeRedis, isRedisEnabled } from './config/redis';
import { createApp } from './app';
import { DomainService } from './services/DomainService';
import { DomainRepository } from './repositories/DomainRepository';
import { CacheService } from './services/CacheService';
import { Domain } from './models/Domain';

/**
 * 优雅关闭超时时间（毫秒）
 * 如果在此时间内未能完成关闭，将强制退出
 */
const GRACEFUL_SHUTDOWN_TIMEOUT = 30000; // 30 秒

/**
 * HTTP 服务器实例
 */
let server: http.Server | null = null;

/**
 * 标记服务器是否正在关闭
 */
let isShuttingDown = false;

/**
 * 启动应用
 */
async function startApp(): Promise<void> {
  try {
    logger.info('正在启动 Domain Config Service...', {
      nodeEnv: config.nodeEnv,
      port: config.port,
    });

    // ============================================================
    // 1. 连接数据库
    // ============================================================
    logger.info('正在连接数据库...');
    await connectWithRetry();

    // 同步数据库模型（仅在开发环境）
    if (config.nodeEnv === 'development') {
      logger.info('正在同步数据库模型...');
      await Domain.sync({ alter: false });
      logger.info('数据库模型同步完成');
    }

    // ============================================================
    // 2. 连接 Redis（如果启用）
    // ============================================================
    if (isRedisEnabled()) {
      logger.info('正在连接 Redis...');
      try {
        await connectRedis();
      } catch (error) {
        // Redis 连接失败不应阻止应用启动
        logger.warn('Redis 连接失败，将在没有缓存的情况下运行', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      logger.info('Redis 缓存未启用');
    }

    // ============================================================
    // 3. 创建服务实例（依赖注入）
    // ============================================================
    const domainRepository = new DomainRepository();
    const cacheService = new CacheService();
    const domainService = new DomainService(domainRepository, cacheService);

    // ============================================================
    // 4. 创建 Express 应用
    // ============================================================
    const app = createApp(domainService);

    // ============================================================
    // 5. 创建 HTTP 服务器并启动
    // ============================================================
    server = http.createServer(app);

    // ============================================================
    // 配置背压机制（连接数限制）
    // ============================================================
    // 限制最大并发连接数，防止服务器过载
    // 超过此限制的新连接将被拒绝，提供基本的背压保护
    server.maxConnections = 1000;
    
    // 设置请求超时时间（毫秒）
    // 防止慢速客户端占用连接资源
    server.timeout = 30000; // 30 秒
    
    // 设置 keep-alive 超时时间（毫秒）
    // 控制空闲连接的保持时间
    server.keepAliveTimeout = 65000; // 65 秒（略大于常见负载均衡器的 60 秒）
    
    logger.info('背压机制已配置', {
      maxConnections: server.maxConnections,
      timeout: server.timeout,
      keepAliveTimeout: server.keepAliveTimeout,
    });

    // 监听端口
    await new Promise<void>((resolve, reject) => {
      server!.listen(config.port, () => {
        logger.info(`服务器启动成功`, {
          port: config.port,
          nodeEnv: config.nodeEnv,
          apiPrefix: config.apiPrefix,
        });
        logger.info(`API 文档: http://localhost:${config.port}/api-docs`);
        logger.info(`健康检查: http://localhost:${config.port}/health`);
        logger.info(`监控指标: http://localhost:${config.port}/metrics`);
        resolve();
      });

      server!.on('error', (error: Error) => {
        logger.error('服务器启动失败', { error: error.message });
        reject(error);
      });
    });

    // ============================================================
    // 6. 注册优雅关闭处理器
    // ============================================================
    setupGracefulShutdown();

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, { context: '应用启动失败' });
    process.exit(1);
  }
}

/**
 * 优雅关闭应用
 * 
 * 需求 9.1: WHEN 收到 SIGTERM 或 SIGINT 信号 THEN Domain_Config_Service SHALL 停止接受新请求
 * 需求 9.2: WHEN 优雅关闭时 THEN Domain_Config_Service SHALL 等待正在处理的请求完成
 * 需求 9.3: WHEN 优雅关闭时 THEN Domain_Config_Service SHALL 关闭数据库和 Redis 连接
 * 需求 9.4: IF 优雅关闭超时 THEN Domain_Config_Service SHALL 强制退出
 */
async function gracefulShutdown(signal: string): Promise<void> {
  // 防止重复关闭
  if (isShuttingDown) {
    logger.warn('已经在关闭过程中，忽略重复信号', { signal });
    return;
  }

  isShuttingDown = true;

  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

  // 设置强制退出超时
  const forceExitTimer = setTimeout(() => {
    logger.error('优雅关闭超时，强制退出', {
      timeout: GRACEFUL_SHUTDOWN_TIMEOUT,
    });
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);

  try {
    // ============================================================
    // 1. 停止接受新请求（需求 9.1）
    // ============================================================
    if (server) {
      logger.info('正在停止接受新请求...');
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => {
          if (error) {
            logger.error('关闭服务器时出错', { error: error.message });
            reject(error);
          } else {
            logger.info('服务器已停止接受新请求');
            resolve();
          }
        });
      });
    }

    // ============================================================
    // 2. 等待正在处理的请求完成（需求 9.2）
    // ============================================================
    // server.close() 会自动等待所有连接关闭
    logger.info('等待正在处理的请求完成...');

    // ============================================================
    // 3. 关闭数据库和 Redis 连接（需求 9.3）
    // ============================================================
    
    // 关闭 Redis 连接
    if (isRedisEnabled()) {
      logger.info('正在关闭 Redis 连接...');
      try {
        await closeRedis();
      } catch (error) {
        logger.error('关闭 Redis 连接时出错', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 关闭数据库连接
    logger.info('正在关闭数据库连接...');
    try {
      await closeDatabase();
    } catch (error) {
      logger.error('关闭数据库连接时出错', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ============================================================
    // 4. 清理超时定时器并正常退出
    // ============================================================
    clearTimeout(forceExitTimer);
    logger.info('优雅关闭完成');
    process.exit(0);

  } catch (error) {
    clearTimeout(forceExitTimer);
    const err = error instanceof Error ? error : new Error(String(error));
    logError(err, { context: '优雅关闭失败' });
    process.exit(1);
  }
}

/**
 * 设置优雅关闭处理器
 * 
 * 监听 SIGTERM 和 SIGINT 信号
 */
function setupGracefulShutdown(): void {
  // SIGTERM: 终止信号（Docker、Kubernetes 等使用）
  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
  });

  // SIGINT: 中断信号（Ctrl+C）
  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
  });

  // 捕获未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('未处理的 Promise 拒绝', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  // 捕获未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logError(error, { context: '未捕获的异常' });
    // 未捕获的异常可能导致应用处于不稳定状态，应该退出
    gracefulShutdown('uncaughtException');
  });
}

/**
 * 启动应用
 */
startApp();
