/**
 * 数据库配置模块
 * 
 * 配置 Sequelize 连接 MySQL
 * 实现 connectWithRetry 重试连接函数
 * 
 * 需求: 技术栈要求
 */

import { Sequelize, Options } from 'sequelize';
import { config } from './env';
import { logger } from './logger';

/**
 * 数据库模块接口
 */
export interface DatabaseModule {
  sequelize: Sequelize;
  connectWithRetry(maxRetries?: number, delay?: number): Promise<void>;
}

/**
 * 创建 Sequelize 配置选项
 */
function createSequelizeOptions(): Options {
  return {
    host: config.dbHost,
    port: config.dbPort,
    dialect: 'mysql',
    pool: {
      min: config.dbPoolMin,
      max: config.dbPoolMax,
      acquire: 30000,
      idle: 10000,
    },
    logging: (msg: string) => {
      // 在开发环境下记录 SQL 日志
      if (config.nodeEnv === 'development') {
        logger.debug(msg, { type: 'sql' });
      }
    },
    define: {
      timestamps: false,
      underscored: false,
      freezeTableName: true,
    },
    timezone: '+08:00',
  };
}

/**
 * 创建 Sequelize 实例
 */
export const sequelize = new Sequelize(
  config.dbName,
  config.dbUser,
  config.dbPassword,
  createSequelizeOptions()
);

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试机制的数据库连接函数
 * 
 * @param maxRetries 最大重试次数，默认为 5
 * @param delayMs 重试间隔毫秒数，默认为 5000
 * @throws Error 如果所有重试都失败
 */
export async function connectWithRetry(
  maxRetries: number = 5,
  delayMs: number = 5000
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`正在连接数据库... (尝试 ${attempt}/${maxRetries})`, {
        host: config.dbHost,
        port: config.dbPort,
        database: config.dbName,
      });

      await sequelize.authenticate();

      logger.info('数据库连接成功', {
        host: config.dbHost,
        port: config.dbPort,
        database: config.dbName,
      });

      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn(`数据库连接失败 (尝试 ${attempt}/${maxRetries})`, {
        error: lastError.message,
        host: config.dbHost,
        port: config.dbPort,
        database: config.dbName,
      });

      if (attempt < maxRetries) {
        logger.info(`${delayMs / 1000} 秒后重试...`);
        await delay(delayMs);
      }
    }
  }

  // 所有重试都失败
  const errorMessage = `数据库连接失败，已重试 ${maxRetries} 次`;
  logger.error(errorMessage, {
    lastError: lastError?.message,
    host: config.dbHost,
    port: config.dbPort,
    database: config.dbName,
  });

  throw new Error(errorMessage);
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('关闭数据库连接时出错', { error: err.message });
    throw err;
  }
}

/**
 * 检查数据库连接状态
 * @returns 连接是否正常
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    return true;
  } catch {
    return false;
  }
}

/**
 * 导出数据库模块
 */
const databaseModule: DatabaseModule = {
  sequelize,
  connectWithRetry,
};

export default databaseModule;
