/**
 * AdminAuthMiddleware 模块
 * 
 * 提供管理界面的简单密码认证
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

/**
 * 管理员认证中间件
 * 
 * 验证请求头中的 Authorization Bearer token 是否匹配配置的管理密码
 */
export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '未提供认证信息',
      },
    });
    return;
  }
  
  const token = authHeader.substring(7); // 移除 "Bearer " 前缀
  
  if (token !== config.adminPassword) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '认证失败',
      },
    });
    return;
  }
  
  next();
}
