/**
 * 监控指标配置模块
 * 
 * 定义 Prometheus 监控指标，包括：
 * - HTTP 请求计数
 * - HTTP 请求延迟
 * - HTTP 错误计数
 * - 缓存命中率
 * 
 * 需求:
 * - 6.2: WHEN 访问 /metrics 端点 THEN Domain_Config_Service SHALL 返回 Prometheus 格式的监控指标
 * - 6.3: THE 监控指标 SHALL 包含 HTTP 请求计数、请求延迟、错误计数和缓存命中率
 */

import { Counter, Histogram, Registry } from 'prom-client';

/**
 * Prometheus 指标注册表
 * 
 * 所有指标都注册到这个注册表中，用于统一导出
 */
export const metricsRegistry = new Registry();

/**
 * HTTP 请求计数器
 * 
 * 记录所有 HTTP 请求的总数，按以下维度分组：
 * - method: HTTP 方法（GET, POST, PUT, DELETE 等）
 * - route: 路由路径
 * - status_code: HTTP 状态码
 * 
 * 需求 6.3: HTTP 请求计数
 */
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

/**
 * HTTP 请求延迟直方图
 * 
 * 记录 HTTP 请求的处理时间（秒），按以下维度分组：
 * - method: HTTP 方法
 * - route: 路由路径
 * - status_code: HTTP 状态码
 * 
 * 桶配置：0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10 秒
 * 
 * 需求 6.3: 请求延迟
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

/**
 * HTTP 错误计数器
 * 
 * 记录 HTTP 错误响应（4xx 和 5xx）的总数，按以下维度分组：
 * - method: HTTP 方法
 * - route: 路由路径
 * - status_code: HTTP 状态码
 * - error_type: 错误类型（ValidationError, NotFoundError, ConflictError 等）
 * 
 * 需求 6.3: 错误计数
 */
export const httpErrorCounter = new Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx responses)',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
  registers: [metricsRegistry],
});

/**
 * 缓存操作计数器
 * 
 * 记录缓存操作的总数，按以下维度分组：
 * - operation: 操作类型（get, set, delete）
 * - result: 操作结果（hit, miss, success, error）
 * 
 * 需求 6.3: 缓存命中率
 * 
 * 缓存命中率计算方式：
 * cache_hit_rate = cache_operations_total{operation="get",result="hit"} / 
 *                  (cache_operations_total{operation="get",result="hit"} + 
 *                   cache_operations_total{operation="get",result="miss"})
 */
export const cacheOperationCounter = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result'],
  registers: [metricsRegistry],
});

/**
 * 记录 HTTP 请求指标
 * 
 * 更新请求计数和延迟指标
 * 
 * @param method - HTTP 方法
 * @param route - 路由路径
 * @param statusCode - HTTP 状态码
 * @param duration - 请求处理时间（秒）
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number
): void {
  const labels = {
    method,
    route,
    status_code: statusCode.toString(),
  };

  httpRequestCounter.inc(labels);
  httpRequestDuration.observe(labels, duration);
}

/**
 * 记录 HTTP 错误指标
 * 
 * 更新错误计数指标
 * 
 * @param method - HTTP 方法
 * @param route - 路由路径
 * @param statusCode - HTTP 状态码
 * @param errorType - 错误类型（如 ValidationError, NotFoundError）
 */
export function recordHttpError(
  method: string,
  route: string,
  statusCode: number,
  errorType: string
): void {
  const labels = {
    method,
    route,
    status_code: statusCode.toString(),
    error_type: errorType,
  };

  httpErrorCounter.inc(labels);
}

/**
 * 记录缓存命中指标
 * 
 * 当缓存查询命中时调用
 */
export function recordCacheHit(): void {
  cacheOperationCounter.inc({
    operation: 'get',
    result: 'hit',
  });
}

/**
 * 记录缓存未命中指标
 * 
 * 当缓存查询未命中时调用
 */
export function recordCacheMiss(): void {
  cacheOperationCounter.inc({
    operation: 'get',
    result: 'miss',
  });
}

/**
 * 记录缓存设置成功指标
 * 
 * 当成功设置缓存数据时调用
 */
export function recordCacheSet(): void {
  cacheOperationCounter.inc({
    operation: 'set',
    result: 'success',
  });
}

/**
 * 记录缓存删除成功指标
 * 
 * 当成功删除缓存数据时调用
 */
export function recordCacheDelete(): void {
  cacheOperationCounter.inc({
    operation: 'delete',
    result: 'success',
  });
}

/**
 * 记录缓存操作错误指标
 * 
 * 当缓存操作失败时调用
 * 
 * @param operation - 操作类型（get, set, delete）
 */
export function recordCacheError(operation: 'get' | 'set' | 'delete'): void {
  cacheOperationCounter.inc({
    operation,
    result: 'error',
  });
}

/**
 * 获取 Prometheus 格式的指标
 * 
 * 返回所有注册指标的 Prometheus 文本格式
 * 
 * @returns Promise<string> - Prometheus 格式的指标文本
 */
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

/**
 * 获取 Prometheus 注册表的内容类型
 * 
 * @returns string - 内容类型字符串
 */
export function getMetricsContentType(): string {
  return metricsRegistry.contentType;
}
