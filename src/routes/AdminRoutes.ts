/**
 * AdminRoutes 模块
 * 
 * 提供管理界面的认证路由
 */

import { Router, Request, Response } from 'express';
import { config } from '../config/env';

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
    res.json({
      success: true,
      token: password,
      message: '登录成功',
    });
  } else {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '密码错误',
      },
    });
  }
});

export default router;
