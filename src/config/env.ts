/**
 * 环境变量配置模块
 * 
 * 提供环境变量读取辅助函数和统一的配置对象
 * 需求: 2.6, 8.3
 */

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 * @param key 环境变量名称
 * @returns 环境变量值
 * @throws Error 如果环境变量不存在
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`必需的环境变量 ${key} 未设置`);
  }
  return value;
}

/**
 * 获取可选的环境变量，如果不存在则返回默认值
 * @param key 环境变量名称
 * @param defaultValue 默认值
 * @returns 环境变量值或默认值
 */
export function getEnv(key: string, defaultValue: string = ''): string {
  const value = process.env[key];
  return value !== undefined && value !== '' ? value : defaultValue;
}

/**
 * 获取数字类型的环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值
 * @returns 解析后的数字值
 * @throws Error 如果值不是有效数字
 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`环境变量 ${key} 的值 "${value}" 不是有效的数字`);
  }
  return parsed;
}

/**
 * 获取布尔类型的环境变量
 * @param key 环境变量名称
 * @param defaultValue 默认值
 * @returns 解析后的布尔值
 */
export function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 环境变量配置接口
 */
export interface EnvConfig {
  // 服务配置
  nodeEnv: string;
  port: number;
  
  // 数据库配置
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbPoolMin: number;
  dbPoolMax: number;
  
  // Redis 配置
  redisEnabled: boolean;
  redisHost: string;
  redisPort: number;
  redisPassword: string;
  redisTtl: number;  // 缓存过期时间（秒）
  
  // 日志配置
  logLevel: string;
  logFile: string;
  
  // API 配置
  apiPrefix: string;
  maxPageSize: number;
  defaultPageSize: number;
  
  // 限流配置
  rateLimitWindowMs: number;
  rateLimitMax: number;
  
  // 管理界面配置
  adminPassword: string;
}

/**
 * 加载配置对象
 * 在测试环境中可以延迟加载以便设置环境变量
 */
function loadConfig(): EnvConfig {
  return {
    // 服务配置
    nodeEnv: getEnv('NODE_ENV', 'development'),
    port: getEnvNumber('PORT', 3000),
    
    // 数据库配置
    dbHost: getEnv('DB_HOST', 'localhost'),
    dbPort: getEnvNumber('DB_PORT', 3306),
    dbName: getEnv('DB_NAME', 'domain_config'),
    dbUser: getEnv('DB_USER', 'root'),
    dbPassword: getEnv('DB_PASSWORD', ''),
    dbPoolMin: getEnvNumber('DB_POOL_MIN', 2),
    dbPoolMax: getEnvNumber('DB_POOL_MAX', 10),
    
    // Redis 配置
    redisEnabled: getEnvBoolean('REDIS_ENABLED', false),
    redisHost: getEnv('REDIS_HOST', 'localhost'),
    redisPort: getEnvNumber('REDIS_PORT', 6379),
    redisPassword: getEnv('REDIS_PASSWORD', ''),
    redisTtl: getEnvNumber('REDIS_TTL', 3600),
    
    // 日志配置
    logLevel: getEnv('LOG_LEVEL', 'info'),
    logFile: getEnv('LOG_FILE', 'logs/app.log'),
    
    // API 配置
    apiPrefix: getEnv('API_PREFIX', '/api/v1'),
    maxPageSize: getEnvNumber('MAX_PAGE_SIZE', 100),
    defaultPageSize: getEnvNumber('DEFAULT_PAGE_SIZE', 20),
    
    // 限流配置
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 100),
    
    // 管理界面配置
    adminPassword: getEnv('ADMIN_PASSWORD', 'admin123'),
  };
}

/**
 * 导出配置对象
 * 使用 getter 实现延迟加载，便于测试时动态设置环境变量
 */
let _config: EnvConfig | null = null;

export const config: EnvConfig = new Proxy({} as EnvConfig, {
  get(_target, prop: keyof EnvConfig) {
    if (_config === null) {
      _config = loadConfig();
    }
    return _config[prop];
  },
});

/**
 * 重新加载配置（主要用于测试）
 */
export function reloadConfig(): EnvConfig {
  _config = loadConfig();
  return _config;
}

/**
 * 获取当前配置的快照（主要用于调试）
 */
export function getConfigSnapshot(): EnvConfig {
  return loadConfig();
}
