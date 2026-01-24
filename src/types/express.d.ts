/**
 * Express 类型扩展
 * 
 * 扩展 Express Request 接口以包含自定义属性
 * 
 * 需求: 1.4
 */

import 'express';

// 使用模块增强来扩展 Express 类型
declare module 'express' {
  export interface Request {
    /**
     * 唯一请求 ID，用于追踪和日志记录
     */
    requestId?: string;
  }
}
