/**
 * Jest 全局设置文件
 * 
 * 此文件在每个测试文件运行前执行，用于配置全局测试环境
 */

// 设置环境变量为测试模式
process.env.NODE_ENV = 'test';

// 配置测试数据库（如果需要）
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'domain_config_test';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';

// 配置 Redis（测试时默认禁用）
process.env.REDIS_ENABLED = process.env.REDIS_ENABLED || 'false';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
process.env.REDIS_TTL = process.env.REDIS_TTL || '3600';

// 配置日志（测试时使用较低级别）
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.LOG_FILE = process.env.LOG_FILE || 'logs/test.log';

// 配置 API
process.env.PORT = process.env.PORT || '3000';
process.env.API_PREFIX = process.env.API_PREFIX || '/api/v1';
process.env.MAX_PAGE_SIZE = process.env.MAX_PAGE_SIZE || '100';
process.env.DEFAULT_PAGE_SIZE = process.env.DEFAULT_PAGE_SIZE || '20';

// 配置限流（测试时使用较高限制）
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || '60000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '1000';

// 全局测试超时设置（可选，已在 jest.config.js 中设置）
// jest.setTimeout(10000);

// 全局 beforeAll 钩子（如果需要）
beforeAll(() => {
  // 可以在这里初始化全局测试资源
  // 例如：连接测试数据库、启动测试服务器等
});

// 全局 afterAll 钩子（如果需要）
afterAll(() => {
  // 可以在这里清理全局测试资源
  // 例如：关闭数据库连接、停止测试服务器等
});

// 全局 beforeEach 钩子（如果需要）
beforeEach(() => {
  // 可以在每个测试前执行的操作
  // 例如：清理数据库、重置 mock 等
});

// 全局 afterEach 钩子（如果需要）
afterEach(() => {
  // 可以在每个测试后执行的操作
  // 例如：清理测试数据、重置状态等
});

// 配置 console 输出（可选）
// 在测试时抑制某些 console 输出
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// 过滤掉某些预期的警告/错误信息
console.error = (...args) => {
  // 可以在这里过滤掉某些预期的错误信息
  // 例如：if (args[0].includes('expected error')) return;
  originalConsoleError.apply(console, args);
};

console.warn = (...args) => {
  // 可以在这里过滤掉某些预期的警告信息
  originalConsoleWarn.apply(console, args);
};

// 导出配置（如果需要在测试中使用）
module.exports = {
  // 可以导出一些测试辅助函数或配置
};
