/**
 * 监控指标配置模块测试
 * 
 * 测试 Prometheus 指标的定义和记录功能
 */

import {
  metricsRegistry,
  httpRequestCounter,
  httpRequestDuration,
  httpErrorCounter,
  cacheOperationCounter,
  recordHttpRequest,
  recordHttpError,
  recordCacheHit,
  recordCacheMiss,
  recordCacheSet,
  recordCacheDelete,
  recordCacheError,
  getMetrics,
  getMetricsContentType,
} from './metrics';

describe('Metrics Configuration', () => {
  beforeEach(() => {
    // 清除所有指标
    metricsRegistry.resetMetrics();
  });

  describe('Metrics Registry', () => {
    it('should have a metrics registry', () => {
      expect(metricsRegistry).toBeDefined();
    });

    it('should return content type', () => {
      const contentType = getMetricsContentType();
      expect(contentType).toContain('text/plain');
    });
  });

  describe('HTTP Request Counter', () => {
    it('should be defined', () => {
      expect(httpRequestCounter).toBeDefined();
    });

    it('should increment counter when recording request', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.1);

      const metrics = await getMetrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/domains"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should track multiple requests separately', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.1);
      recordHttpRequest('POST', '/api/v1/domains', 201, 0.2);
      recordHttpRequest('GET', '/api/v1/domains', 404, 0.05);

      const metrics = await getMetrics();
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="201"');
      expect(metrics).toContain('status_code="404"');
    });
  });

  describe('HTTP Request Duration', () => {
    it('should be defined', () => {
      expect(httpRequestDuration).toBeDefined();
    });

    it('should record request duration', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.123);

      const metrics = await getMetrics();
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/domains"');
      expect(metrics).toContain('status_code="200"');
    });

    it('should have predefined buckets', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.05);

      const metrics = await getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_bucket');
      expect(metrics).toContain('le="0.005"');
      expect(metrics).toContain('le="0.01"');
      expect(metrics).toContain('le="0.025"');
      expect(metrics).toContain('le="0.05"');
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="0.25"');
      expect(metrics).toContain('le="0.5"');
      expect(metrics).toContain('le="1"');
      expect(metrics).toContain('le="2.5"');
      expect(metrics).toContain('le="5"');
      expect(metrics).toContain('le="10"');
      expect(metrics).toContain('le="+Inf"');
    });
  });

  describe('HTTP Error Counter', () => {
    it('should be defined', () => {
      expect(httpErrorCounter).toBeDefined();
    });

    it('should record HTTP errors', async () => {
      recordHttpError('GET', '/api/v1/domains', 404, 'NotFoundError');

      const metrics = await getMetrics();
      expect(metrics).toContain('http_errors_total');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('route="/api/v1/domains"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('error_type="NotFoundError"');
    });

    it('should track different error types', async () => {
      recordHttpError('POST', '/api/v1/domains', 400, 'ValidationError');
      recordHttpError('GET', '/api/v1/domains', 404, 'NotFoundError');
      recordHttpError('POST', '/api/v1/domains', 409, 'ConflictError');
      recordHttpError('GET', '/api/v1/domains', 500, 'DatabaseError');

      const metrics = await getMetrics();
      expect(metrics).toContain('error_type="ValidationError"');
      expect(metrics).toContain('error_type="NotFoundError"');
      expect(metrics).toContain('error_type="ConflictError"');
      expect(metrics).toContain('error_type="DatabaseError"');
    });
  });

  describe('Cache Operation Counter', () => {
    it('should be defined', () => {
      expect(cacheOperationCounter).toBeDefined();
    });

    it('should record cache hits', async () => {
      recordCacheHit();

      const metrics = await getMetrics();
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="get"');
      expect(metrics).toContain('result="hit"');
    });

    it('should record cache misses', async () => {
      recordCacheMiss();

      const metrics = await getMetrics();
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="get"');
      expect(metrics).toContain('result="miss"');
    });

    it('should record cache sets', async () => {
      recordCacheSet();

      const metrics = await getMetrics();
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="set"');
      expect(metrics).toContain('result="success"');
    });

    it('should record cache deletes', async () => {
      recordCacheDelete();

      const metrics = await getMetrics();
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="delete"');
      expect(metrics).toContain('result="success"');
    });

    it('should record cache errors', async () => {
      recordCacheError('get');
      recordCacheError('set');
      recordCacheError('delete');

      const metrics = await getMetrics();
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="get"');
      expect(metrics).toContain('operation="set"');
      expect(metrics).toContain('operation="delete"');
      expect(metrics).toContain('result="error"');
    });

    it('should track cache hit rate metrics', async () => {
      // Simulate cache operations
      recordCacheHit();
      recordCacheHit();
      recordCacheHit();
      recordCacheMiss();
      recordCacheMiss();

      const metrics = await getMetrics();
      
      // Verify both hit and miss are recorded
      expect(metrics).toContain('operation="get",result="hit"');
      expect(metrics).toContain('operation="get",result="miss"');
      
      // Cache hit rate can be calculated as:
      // hits / (hits + misses) = 3 / (3 + 2) = 0.6 = 60%
    });
  });

  describe('recordHttpRequest', () => {
    it('should record both counter and duration', async () => {
      recordHttpRequest('POST', '/api/v1/domains', 201, 0.234);

      const metrics = await getMetrics();
      
      // Check counter
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="201"');
      
      // Check duration
      expect(metrics).toContain('http_request_duration_seconds');
    });

    it('should handle different status codes', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.1);
      recordHttpRequest('GET', '/api/v1/domains', 404, 0.05);
      recordHttpRequest('POST', '/api/v1/domains', 400, 0.08);
      recordHttpRequest('DELETE', '/api/v1/domains/1', 500, 0.15);

      const metrics = await getMetrics();
      expect(metrics).toContain('status_code="200"');
      expect(metrics).toContain('status_code="404"');
      expect(metrics).toContain('status_code="400"');
      expect(metrics).toContain('status_code="500"');
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus format metrics', async () => {
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.1);
      recordCacheHit();

      const metrics = await getMetrics();
      
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('cache_operations_total');
    });

    it('should return empty metrics when no data recorded', async () => {
      const metrics = await getMetrics();
      
      expect(typeof metrics).toBe('string');
      // Should still contain metric definitions even with no data
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });
  });

  describe('Integration - Complete Request Flow', () => {
    it('should track complete successful request flow', async () => {
      // Simulate a successful request with cache miss
      recordHttpRequest('GET', '/api/v1/domains/example.com', 200, 0.123);
      recordCacheMiss();
      recordCacheSet();

      const metrics = await getMetrics();
      
      // Verify HTTP metrics
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('status_code="200"');
      
      // Verify cache metrics
      expect(metrics).toContain('cache_operations_total');
      expect(metrics).toContain('operation="get",result="miss"');
      expect(metrics).toContain('operation="set",result="success"');
    });

    it('should track complete error request flow', async () => {
      // Simulate a failed request
      recordHttpRequest('POST', '/api/v1/domains', 400, 0.05);
      recordHttpError('POST', '/api/v1/domains', 400, 'ValidationError');

      const metrics = await getMetrics();
      
      // Verify HTTP metrics
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_errors_total');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('status_code="400"');
      expect(metrics).toContain('error_type="ValidationError"');
    });

    it('should track cache hit scenario', async () => {
      // Simulate a request with cache hit
      recordHttpRequest('GET', '/api/v1/domains/example.com', 200, 0.005);
      recordCacheHit();

      const metrics = await getMetrics();
      
      // Verify faster response time with cache hit
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('operation="get",result="hit"');
    });
  });

  describe('Metrics Reset', () => {
    it('should reset metrics correctly', async () => {
      // Record some metrics
      recordHttpRequest('GET', '/api/v1/domains', 200, 0.1);
      recordCacheHit();

      // Reset
      metricsRegistry.resetMetrics();

      const metrics = await getMetrics();
      
      // Metrics should be reset (no values, only definitions)
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      // Should not contain specific recorded values
      expect(metrics).not.toContain('method="GET"');
    });
  });
});
