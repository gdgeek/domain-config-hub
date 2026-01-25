/**
 * DomainRoutes
 * 
 * 域名管理路由
 * 提供域名的 CRUD 操作，支持配置关联
 */

import { Router, Request, Response } from 'express';
import domainService from '../services/DomainService';
import { asyncHandler } from '../middleware/ErrorMiddleware';
import { validateBody, validateParams } from '../middleware/ValidationMiddleware';
import { paginationSchema, idParamSchema } from '../validation/schemas';
import { NotFoundError } from '../errors/NotFoundError';
import Joi from 'joi';

const router = Router();

/**
 * 创建域名验证模式
 */
const createDomainSchema = Joi.object({
  domain: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.base': '域名必须是字符串',
      'string.empty': '域名不能为空',
      'string.min': '域名不能为空',
      'string.max': '域名长度不能超过255字符',
      'any.required': '域名是必需的',
    }),
  configId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': '配置ID必须是数字',
      'number.integer': '配置ID必须是整数',
      'number.positive': '配置ID必须是正数',
      'any.required': '配置ID是必需的',
    }),
  homepage: Joi.string()
    .uri()
    .allow(null, '')
    .max(500)
    .messages({
      'string.uri': 'homepage 必须是有效的 URL',
      'string.max': 'homepage 长度不能超过500字符',
    }),
});

/**
 * 更新域名验证模式
 */
const updateDomainSchema = Joi.object({
  configId: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': '配置ID必须是数字',
      'number.integer': '配置ID必须是整数',
      'number.positive': '配置ID必须是正数',
    }),
  homepage: Joi.string()
    .uri()
    .allow(null, '')
    .max(500)
    .messages({
      'string.uri': 'homepage 必须是有效的 URL',
      'string.max': 'homepage 长度不能超过500字符',
    }),
});

/**
 * @swagger
 * /api/v1/domains:
 *   get:
 *     summary: 获取域名列表或查询单个域名
 *     tags: [Domains]
 *     parameters:
 *       - in: query
 *         name: domain
 *         schema:
 *           type: string
 *         description: 按域名查询（精确匹配或根域名匹配），返回单个对象
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         description: 按 URL 查询（与 domain 参数相同，保持向后兼容），返回单个对象
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码（仅在不使用 domain/url 参数时有效）
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每页大小（仅在不使用 domain/url 参数时有效）
 *     responses:
 *       200:
 *         description: 域名列表或单个域名对象
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   description: 查询单个域名时返回
 *                   properties:
 *                     data:
 *                       type: object
 *                 - type: object
 *                   description: 获取列表时返回
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       404:
 *         description: 域名不存在（仅在使用 domain/url 参数查询时）
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { domain, url, page, pageSize } = req.query as any;
    
    // 如果提供了 domain 或 url 参数，查询单个域名并返回对象
    const searchDomain = domain || url;
    if (searchDomain) {
      const result = await domainService.getByDomain(searchDomain);
      
      if (!result) {
        throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
      }
      
      // 返回单个对象（不是数组）
      res.json({ data: result });
      return;
    }
    
    // 否则返回分页列表
    const paginationParams = { 
      page: parseInt(page) || 1, 
      pageSize: parseInt(pageSize) || 20 
    };
    const { error } = paginationSchema.validate(paginationParams);
    
    if (error) {
      throw new Error(error.message);
    }
    
    const result = await domainService.list(paginationParams);
    res.json(result);
  })
);

/**
 * @swagger
 * /api/v1/domains/{id}:
 *   get:
 *     summary: 通过 ID 获取域名
 *     tags: [Domains]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 域名 ID
 *     responses:
 *       200:
 *         description: 域名详情（包含关联的配置）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     domain:
 *                       type: string
 *                       example: baidu.com
 *                     homepage:
 *                       type: string
 *                       nullable: true
 *                       example: https://www.baidu.com
 *                     config:
 *                       type: object
 *       404:
 *         description: 域名不存在
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const domain = await domainService.getById(id);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v1/domains:
 *   post:
 *     summary: 创建域名
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - domain
 *               - configId
 *             properties:
 *               domain:
 *                 type: string
 *                 example: example.com
 *               homepage:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://www.example.com
 *                 description: 域名主页 URL（可选）
 *               configId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: 域名创建成功
 *       400:
 *         description: 请求数据验证失败
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 配置不存在
 *       409:
 *         description: 域名已存在
 */
router.post(
  '/',
  validateBody(createDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const domain = await domainService.create(req.body);
    res.status(201).json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v1/domains/{id}:
 *   put:
 *     summary: 完全更新域名
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 域名 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               homepage:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://www.example.com
 *                 description: 域名主页 URL（可选）
 *               configId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: 域名更新成功
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 域名或配置不存在
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDomainSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const domain = await domainService.update(id, req.body);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v1/domains/{id}:
 *   patch:
 *     summary: 部分更新域名
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 域名 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               homepage:
 *                 type: string
 *                 format: uri
 *                 nullable: true
 *                 example: https://www.example.com
 *                 description: 域名主页 URL（可选）
 *               configId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: 域名更新成功
 *       400:
 *         description: 至少需要提供一个要更新的字段
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 域名或配置不存在
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    
    // PATCH 只更新提供的字段
    const updates: any = {};
    if (req.body.homepage !== undefined) updates.homepage = req.body.homepage;
    if (req.body.configId !== undefined) updates.configId = req.body.configId;
    
    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '至少需要提供一个要更新的字段'
        }
      });
      return;
    }
    
    const domain = await domainService.update(id, updates);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v1/domains/{id}:
 *   delete:
 *     summary: 删除域名
 *     tags: [Domains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 域名 ID
 *     responses:
 *       204:
 *         description: 域名删除成功（无响应体）
 *       401:
 *         description: 未提供认证令牌
 *       403:
 *         description: 认证令牌无效或过期
 *       404:
 *         description: 域名不存在
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await domainService.delete(id);
    // RESTful 最佳实践：删除成功返回 204 No Content
    res.status(204).send();
  })
);

export default router;
