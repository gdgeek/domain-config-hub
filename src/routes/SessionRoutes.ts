/**
 * SessionRoutes
 * 
 * RESTful 会话管理路由
 * 提供认证相关的操作
 */

import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { generateToken, authMiddleware } from '../middleware/AuthMiddleware';
import { logger } from '../config/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/sessions:
 *   post:
 *     summary: 创建会话（登录）
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: 管理员密码
 *                 example: admin123
 *     responses:
 *       201:
 *         description: 会话创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT 认证令牌
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *                     expiresIn:
 *                       type: integer
 *                       description: 令牌有效期（秒）
 *                       example: 86400
 *       400:
 *         description: 请求数据验证失败
 *       401:
 *         description: 密码错误
 */
router.post('/', (req: Request, res: Response) => {
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
    const token = generateToken();
    
    logger.info('会话创建成功', {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    
    // RESTful 最佳实践：创建资源返回 201 Created
    res.status(201).json({
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: 86400 // 24 小时
      }
    });
  } else {
    logger.warn('会话创建失败：密码错误', {
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

/**
 * @swagger
 * /api/v1/sessions/current:
 *   get:
 *     summary: 获取当前会话信息
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 当前会话信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                       example: true
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *       401:
 *         description: 未认证
 *       403:
 *         description: 令牌无效或过期
 */
router.get('/current', authMiddleware, (_req: Request, res: Response) => {
  res.json({
    data: {
      authenticated: true,
      tokenType: 'Bearer'
    }
  });
});

/**
 * @swagger
 * /api/v1/sessions:
 *   delete:
 *     summary: 删除会话（登出）
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: 会话删除成功（无响应体）
 *       401:
 *         description: 未认证
 *       403:
 *         description: 令牌无效或过期
 */
router.delete('/', authMiddleware, (_req: Request, res: Response) => {
  // 在实际应用中，这里应该将令牌加入黑名单
  // 由于我们使用的是无状态 JWT，客户端删除令牌即可
  logger.info('会话删除成功', {
    ip: _req.ip,
  });
  
  // RESTful 最佳实践：删除成功返回 204 No Content
  res.status(204).send();
});

export default router;
