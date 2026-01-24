/**
 * DomainV2Routes
 * 
 * 域名管理路由（双表版本）
 * 提供域名的 CRUD 操作，支持配置关联
 */

import { Router, Request, Response } from 'express';
import domainV2Service from '../services/DomainV2Service';
import { asyncHandler } from '../middleware/ErrorMiddleware';
import { validateBody, validateQuery, validateParams } from '../middleware/ValidationMiddleware';
import { domainParamSchema, paginationSchema, idParamSchema } from '../validation/schemas';
import { NotFoundError } from '../errors/NotFoundError';
import Joi from 'joi';

const router = Router();

/**
 * 创建域名验证模式
 */
const createDomainV2Schema = Joi.object({
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
});

/**
 * 更新域名验证模式
 */
const updateDomainV2Schema = Joi.object({
  configId: Joi.number()
    .integer()
    .positive()
    .messages({
      'number.base': '配置ID必须是数字',
      'number.integer': '配置ID必须是整数',
      'number.positive': '配置ID必须是正数',
    }),
});

/**
 * @swagger
 * /api/v2/domains:
 *   get:
 *     summary: 获取域名列表
 *     tags: [Domains V2]
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
 *         description: 域名列表（包含关联的配置）
 */
router.get(
  '/',
  validateQuery(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = req.query as any;
    const result = await domainV2Service.list({ page, pageSize });
    res.json(result);
  })
);

/**
 * @swagger
 * /api/v2/domains/{domain}:
 *   get:
 *     summary: 通过域名获取配置
 *     tags: [Domains V2]
 *     parameters:
 *       - in: path
 *         name: domain
 *         required: true
 *         schema:
 *           type: string
 *         description: 域名
 *     responses:
 *       200:
 *         description: 域名详情（包含关联的配置）
 *       404:
 *         description: 域名不存在
 */
router.get(
  '/:domain',
  validateParams(domainParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { domain } = req.params;
    const domainRecord = await domainV2Service.getByDomain(domain);

    if (!domainRecord) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domainRecord });
  })
);

/**
 * @swagger
 * /api/v2/domains/id/{id}:
 *   get:
 *     summary: 通过 ID 获取域名
 *     tags: [Domains V2]
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
 *       404:
 *         description: 域名不存在
 */
router.get(
  '/id/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const domain = await domainV2Service.getById(id);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v2/domains:
 *   post:
 *     summary: 创建域名
 *     tags: [Domains V2]
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
 *               configId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: 域名创建成功
 *       400:
 *         description: 请求数据验证失败
 *       404:
 *         description: 配置不存在
 *       409:
 *         description: 域名已存在
 */
router.post(
  '/',
  validateBody(createDomainV2Schema),
  asyncHandler(async (req: Request, res: Response) => {
    const domain = await domainV2Service.create(req.body);
    res.status(201).json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v2/domains/{id}:
 *   put:
 *     summary: 更新域名
 *     tags: [Domains V2]
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
 *               configId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 域名更新成功
 *       404:
 *         description: 域名或配置不存在
 */
router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateDomainV2Schema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const domain = await domainV2Service.update(id, req.body);

    if (!domain) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    res.json({ data: domain });
  })
);

/**
 * @swagger
 * /api/v2/domains/{id}:
 *   delete:
 *     summary: 删除域名
 *     tags: [Domains V2]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 域名 ID
 *     responses:
 *       200:
 *         description: 域名删除成功
 *       404:
 *         description: 域名不存在
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    await domainV2Service.delete(id);
    res.json({ message: '域名删除成功' });
  })
);

export default router;
