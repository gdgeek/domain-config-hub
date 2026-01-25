/**
 * ConfigRoutes
 * 
 * 配置管理路由
 * 提供配置的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import configService from '../services/ConfigService';
import { asyncHandler } from '../middleware/ErrorMiddleware';
import { validateBody, validateQuery, validateParams } from '../middleware/ValidationMiddleware';
import { createConfigSchema, paginationSchema, idParamSchema } from '../validation/schemas';
import { NotFoundError } from '../errors/NotFoundError';

const router = Router();

/**
 * @swagger
 * /api/v1/configs:
 *   get:
 *     summary: 获取配置列表
 *     tags: [Configs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页大小
 *     responses:
 *       200:
 *         description: 配置列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Config'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get(
  '/',
  validateQuery(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as any;
    const result = await configService.list({ page, pageSize });
    res.json(result);
  })
);

/**
 * @swagger
 * /api/v1/configs/{id}:
 *   get:
 *     summary: 通过 ID 获取配置
 *     tags: [Configs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 配置详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Config'
 *       404:
 *         description: 配置不存在
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const config = await configService.getById(id);

    if (!config) {
      throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
    }

    res.json({ data: config });
  })
);

/**
 * @swagger
 * /api/v1/configs:
 *   post:
 *     summary: 创建配置
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigInput'
 *     responses:
 *       201:
 *         description: 配置创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Config'
 *       400:
 *         description: 请求数据验证失败
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 */
router.post(
  '/',
  validateBody(createConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const config = await configService.create(req.body);
    res.status(201).json({ data: config });
  })
);

/**
 * @swagger
 * /api/v1/configs/{id}:
 *   put:
 *     summary: 完全更新配置
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigInput'
 *     responses:
 *       200:
 *         description: 配置更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Config'
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 配置不存在
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(createConfigSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const config = await configService.update(id, req.body);

    if (!config) {
      throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
    }

    res.json({ data: config });
  })
);

/**
 * @swagger
 * /api/v1/configs/{id}:
 *   patch:
 *     summary: 部分更新配置
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfigInput'
 *     responses:
 *       200:
 *         description: 配置更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Config'
 *       400:
 *         description: 至少需要提供一个要更新的字段
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 配置不存在
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    
    // PATCH 只更新提供的字段
    const updates: any = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.author !== undefined) updates.author = req.body.author;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.keywords !== undefined) updates.keywords = req.body.keywords;
    if (req.body.links !== undefined) updates.links = req.body.links;
    if (req.body.permissions !== undefined) updates.permissions = req.body.permissions;
    
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '至少需要提供一个要更新的字段'
        }
      });
      return;
    }
    
    const config = await configService.update(id, updates);

    if (!config) {
      throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
    }

    res.json({ data: config });
  })
);

/**
 * @swagger
 * /api/v1/configs/{id}:
 *   delete:
 *     summary: 删除配置
 *     tags: [Configs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       204:
 *         description: 配置删除成功（无响应体）
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 配置不存在
 *       409:
 *         description: 配置正在被使用，无法删除
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await configService.delete(id);
    // RESTful 最佳实践：删除成功返回 204 No Content
    res.status(204).send();
  })
);

export default router;
