/**
 * AdminRoutes 模块
 * 
 * 提供管理界面的认证路由
 */

import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { generateToken } from '../middleware/AuthMiddleware';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/v1/auth/login
 * 管理员登录
 */
router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;
  
  if (!password) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: '请提供密码',
      },
    });
    return;
  }
  
  if (password === config.adminPassword) {
    // 生成 JWT 令牌
    const token = generateToken();
    
    logger.info('管理员登录成功', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.json({
      success: true,
      token,
      message: '登录成功',
    });
  } else {
    logger.warn('管理员登录失败：密码错误', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '密码错误',
      },
    });
  }
});

export default router;
