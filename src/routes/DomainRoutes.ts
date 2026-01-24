/**
 * DomainRoutes 模块
 * 
 * 定义域名配置管理的 REST API 端点
 * 
 * 需求: 1.1, 1.2, 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import { Router, Request, Response } from 'express';
import { IDomainService } from '../services/DomainService';
import { validateBody, validateParams, validateQuery } from '../middleware/ValidationMiddleware';
import { asyncHandler } from '../middleware/ErrorMiddleware';
import { NotFoundError } from '../errors/NotFoundError';
import {
  createDomainSchema,
  updateDomainSchema,
  domainParamSchema,
  idParamSchema,
  paginationSchema,
} from '../validation/schemas';

/**
 * 创建 Domain 路由
 * 
 * @param domainService - 域名服务实例
 * @returns Express Router
 */
export function createDomainRoutes(domainService: IDomainService): Router {
  const router = Router();

  /**
   * @openapi
   * /domains:
   *   get:
   *     tags:
   *       - Domains
   *     summary: 获取域名配置列表
   *     description: 获取所有域名配置的分页列表
   *     parameters:
   *       - $ref: '#/components/parameters/PageParam'
   *       - $ref: '#/components/parameters/PageSizeParam'
   *     responses:
   *       200:
   *         description: 成功返回域名配置列表
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/PaginatedDomainsResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get(
    '/',
    validateQuery(paginationSchema),
    asyncHandler(async (req: Request, res: Response) => {
      // Validation middleware ensures these are numbers with defaults
      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;
      
      const result = await domainService.list({ page, pageSize });
      
      res.json(result);
    })
  );

  /**
   * @openapi
   * /domains/{domain}:
   *   get:
   *     tags:
   *       - Domains
   *     summary: 通过域名获取配置
   *     description: 根据域名查询对应的配置信息（支持缓存）
   *     parameters:
   *       - $ref: '#/components/parameters/DomainParam'
   *     responses:
   *       200:
   *         description: 成功返回域名配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DomainResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get(
    '/:domain',
    validateParams(domainParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { domain } = req.params;
      
      const result = await domainService.getByDomain(domain);
      
      if (!result) {
        throw new NotFoundError(`域名配置 '${domain}' 不存在`);
      }
      
      res.json({ data: result });
    })
  );

  /**
   * @openapi
   * /domains/id/{id}:
   *   get:
   *     tags:
   *       - Domains
   *     summary: 通过 ID 获取配置
   *     description: 根据 ID 查询对应的域名配置信息
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     responses:
   *       200:
   *         description: 成功返回域名配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DomainResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.get(
    '/id/:id',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      
      const result = await domainService.getById(id);
      
      if (!result) {
        throw new NotFoundError(`域名配置 ID ${id} 不存在`);
      }
      
      res.json({ data: result });
    })
  );

  /**
   * @openapi
   * /domains:
   *   post:
   *     tags:
   *       - Domains
   *     summary: 创建域名配置
   *     description: 创建新的域名配置记录
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDomainRequest'
   *     responses:
   *       201:
   *         description: 成功创建域名配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DomainResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       409:
   *         $ref: '#/components/responses/Conflict'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.post(
    '/',
    validateBody(createDomainSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await domainService.create(req.body);
      
      res.status(201).json({ data: result });
    })
  );

  /**
   * @openapi
   * /domains/{id}:
   *   put:
   *     tags:
   *       - Domains
   *     summary: 更新域名配置
   *     description: 更新指定 ID 的域名配置（会使缓存失效）
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateDomainRequest'
   *     responses:
   *       200:
   *         description: 成功更新域名配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DomainResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.put(
    '/:id',
    validateParams(idParamSchema),
    validateBody(updateDomainSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      
      const result = await domainService.update(id, req.body);
      
      if (!result) {
        throw new NotFoundError(`域名配置 ID ${id} 不存在`);
      }
      
      res.json({ data: result });
    })
  );

  /**
   * @openapi
   * /domains/{id}:
   *   delete:
   *     tags:
   *       - Domains
   *     summary: 删除域名配置
   *     description: 删除指定 ID 的域名配置（会使缓存失效）
   *     parameters:
   *       - $ref: '#/components/parameters/IdParam'
   *     responses:
   *       200:
   *         description: 成功删除域名配置
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DeleteResponse'
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *       429:
   *         $ref: '#/components/responses/RateLimitExceeded'
   *       500:
   *         $ref: '#/components/responses/InternalError'
   */
  router.delete(
    '/:id',
    validateParams(idParamSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      
      const deleted = await domainService.delete(id);
      
      if (!deleted) {
        throw new NotFoundError(`域名配置 ID ${id} 不存在`);
      }
      
      res.json({ message: '域名配置已删除' });
    })
  );

  return router;
}

export default createDomainRoutes;
