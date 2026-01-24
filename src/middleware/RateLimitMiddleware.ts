/**
 * RateLimitMiddleware 模块
 * 
 * 提供 API 限流功能，防止滥用和保护系统资源
 * 
 * 需求: 8.1, 8.2, 8.3
 * - 8.1: WHEN 单个 IP 在 1 分钟内请求超过配置的限制 THEN Domain_Config_Service SHALL 返回 429 状态码
 * - 8.2: THE 限流响应 SHALL 包含标准化的错误信息
 * - 8.3: THE Domain_Config_Service SHALL 支持通过环境变量配置限流参数
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * 创建限流中间件
 * 
 * 使用 express-rate-limit 实现基于 IP 的请求限流
 * 限流参数通过环境变量配置：
 * - RATE_LIMIT_WINDOW_MS: 时间窗口（毫秒），默认 60000（1分钟）
 * - RATE_LIMIT_MAX: 时间窗口内最大请求数，默认 100
 * 
 * @returns Express 限流中间件
 * 
 * @example
 * app.use(rateLimitMiddleware);
 */
export const rateLimitMiddleware = rateLimit({
  // 时间窗口（毫秒）
  windowMs: config.rateLimitWindowMs,
  
  // 时间窗口内最大请求数
  max: config.rateLimitMax,
  
  // 标准化错误响应格式
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
      },
    });
  },
  
  // 跳过成功的响应计数（false 表示所有请求都计数）
  skipSuccessfulRequests: false,
  
  // 跳过失败的响应计数（false 表示所有请求都计数）
  skipFailedRequests: false,
  
  // 标准化响应头
  standardHeaders: true, // 返回 RateLimit-* 响应头
  legacyHeaders: false,  // 禁用 X-RateLimit-* 响应头
});
