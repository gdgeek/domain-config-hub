/**
 * 日志配置模块
 * 
 * 配置 Winston 日志器，支持 JSON 格式输出
 * 实现文件和控制台输出
 * 
 * 需求: 7.3, 7.4
 * - 7.3: WHEN 发生错误 THEN Domain_Config_Service SHALL 记录错误详情到日志文件
 * - 7.4: THE 日志 SHALL 使用结构化 JSON 格式并包含时间戳、级别、消息和上下文信息
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from './env';

/**
 * 日志上下文接口
 */
export interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

/**
 * 确保日志目录存在
 * @param logFilePath 日志文件路径
 */
function ensureLogDirectory(logFilePath: string): void {
  const logDir = path.dirname(logFilePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * 创建自定义 JSON 格式
 * 包含时间戳、级别、消息和上下文信息
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 创建控制台格式（开发环境使用）
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

/**
 * 创建 Winston 日志器
 */
function createLogger(): winston.Logger {
  const logLevel = config.logLevel;
  const logFile = config.logFile;
  const nodeEnv = config.nodeEnv;

  // 确保日志目录存在
  ensureLogDirectory(logFile);

  const transports: winston.transport[] = [];

  // 文件输出 - 使用 JSON 格式
  transports.push(
    new winston.transports.File({
      filename: logFile,
      level: logLevel,
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // 错误日志单独输出到 error.log
  const errorLogFile = logFile.replace(/\.log$/, '.error.log');
  transports.push(
    new winston.transports.File({
      filename: errorLogFile,
      level: 'error',
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // 控制台输出
  if (nodeEnv !== 'test') {
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: nodeEnv === 'development' ? consoleFormat : jsonFormat,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    defaultMeta: { service: 'domain-config-service' },
    transports,
  });
}

/**
 * 导出日志器实例
 */
export const logger = createLogger();

/**
 * 记录错误详情的辅助函数
 * 
 * 需求 7.3: WHEN 发生错误 THEN Domain_Config_Service SHALL 记录错误详情到日志文件
 * 
 * @param error 错误对象
 * @param context 日志上下文（可选）
 */
export function logError(error: Error, context?: LogContext): void {
  const errorInfo: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  // 合并上下文信息
  if (context) {
    Object.assign(errorInfo, context);
  }

  logger.error(error.message, errorInfo);
}

/**
 * 创建带有请求 ID 的子日志器
 * 
 * @param requestId 请求 ID
 * @returns 带有请求 ID 的日志器
 */
export function createRequestLogger(requestId: string): winston.Logger {
  return logger.child({ requestId });
}

/**
 * 日志级别类型
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * 检查日志级别是否有效
 * @param level 日志级别
 * @returns 是否有效
 */
export function isValidLogLevel(level: string): level is LogLevel {
  const validLevels: LogLevel[] = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'];
  return validLevels.includes(level as LogLevel);
}

export default logger;
