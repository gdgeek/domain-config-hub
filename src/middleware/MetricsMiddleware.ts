/**
 * MetricsMiddleware 模块
 * 
 * 收集 HTTP 请求计数和延迟指标,用于 Prometheus 监控
 * 
 * 需求: 6.3
 * - 6.3: THE 监控指标 SHALL 包含 HTTP 请求计数、请求延迟、错误计数和缓存命中率
 */

import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from '../config/metrics';

/**
 * 监控指标中间件
 * 
 * 收集每个 HTTP 请求的指标：
 * - 请求计数（按方法、路由、状态码分组）
 * - 请求延迟（按方法、路由、状态码分组）
 * 
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @param next - Express next 函数
 * 
 * @example
 * app.use(metricsMiddleware);
 */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 记录请求开始时间（高精度）
  const startTime = process.hrtime();

  // 监听响应完成事件
  res.on('finish', () => {
    // 计算请求延迟（秒）
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds + nanoseconds / 1e9;

    // 获取路由路径（如果可用），否则使用原始路径
    const route = req.route?.path || req.path;

    // 记录 HTTP 请求指标
    recordHttpRequest(req.method, route, res.statusCode, duration);
  });

  next();
}
