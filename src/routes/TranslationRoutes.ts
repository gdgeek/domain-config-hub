/**
 * TranslationRoutes
 * 
 * 翻译管理路由
 * 提供翻译的 CRUD 操作
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/ErrorMiddleware';
import { validateBody, validateParams } from '../middleware/ValidationMiddleware';
import {
  createTranslationSchema,
  updateTranslationSchema,
  configIdParamSchema,
  configIdAndLanguageParamSchema,
} from '../validation/schemas';
import { createTranslationService } from '../services/TranslationService';
import { createDefaultLanguageResolver } from '../services/LanguageResolver';
import { RedisCacheManager } from '../services/RedisCacheManager';
import { getRedisClient, isRedisEnabled } from '../config/redis';
import Redis from 'ioredis';

const router = Router();

// Initialize services
// Create a mock Redis client if Redis is not enabled
const redisClient = isRedisEnabled() && getRedisClient() 
  ? getRedisClient()! 
  : new Redis({ lazyConnect: true }); // Mock client that won't connect

const cacheManager = new RedisCacheManager(redisClient);
const languageResolver = createDefaultLanguageResolver();
const translationService = createTranslationService(cacheManager, languageResolver);

/**
 * @swagger
 * /api/v1/configs/{configId}/translations:
 *   post:
 *     summary: 创建翻译
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - languageCode
 *               - title
 *               - author
 *               - description
 *               - keywords
 *             properties:
 *               languageCode:
 *                 type: string
 *                 description: 语言代码（BCP 47 格式，如 zh-CN, en-US, ja-JP）
 *                 example: en-us
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: 标题
 *                 example: Example Title
 *               author:
 *                 type: string
 *                 maxLength: 100
 *                 description: 作者
 *                 example: John Doe
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 描述
 *                 example: This is an example description
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关键词数组
 *                 example: ["example", "test", "demo"]
 *     responses:
 *       201:
 *         description: 翻译创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Translation'
 *       400:
 *         description: 请求数据验证失败或语言代码不支持
 *       404:
 *         description: 配置不存在
 *       409:
 *         description: 该语言的翻译已存在
 */
router.post(
  '/:configId/translations',
  validateParams(configIdParamSchema),
  validateBody(createTranslationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const configId = parseInt(req.params.configId, 10);
    const { languageCode, title, author, description, keywords } = req.body;

    const translation = await translationService.createTranslation({
      configId,
      languageCode,
      title,
      author,
      description,
      keywords,
    });

    res.status(201).json({ data: translation });
  })
);

/**
 * @swagger
 * /api/v1/configs/{configId}/translations/{languageCode}:
 *   put:
 *     summary: 更新翻译
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: 语言代码
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *                 description: 标题
 *               author:
 *                 type: string
 *                 maxLength: 100
 *                 description: 作者
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: 描述
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 关键词数组
 *     responses:
 *       200:
 *         description: 翻译更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Translation'
 *       400:
 *         description: 请求数据验证失败
 *       404:
 *         description: 翻译不存在
 */
router.put(
  '/:configId/translations/:languageCode',
  validateParams(configIdAndLanguageParamSchema),
  validateBody(updateTranslationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const configId = parseInt(req.params.configId, 10);
    const { languageCode } = req.params;
    const updates = req.body;

    const translation = await translationService.updateTranslation(
      configId,
      languageCode,
      updates
    );

    res.json({ data: translation });
  })
);

/**
 * @swagger
 * /api/v1/configs/{configId}/translations:
 *   get:
 *     summary: 获取配置的所有翻译
 *     tags: [Translations]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *     responses:
 *       200:
 *         description: 翻译列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Translation'
 *       404:
 *         description: 配置不存在
 */
router.get(
  '/:configId/translations',
  validateParams(configIdParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const configId = parseInt(req.params.configId, 10);

    const translations = await translationService.getAllTranslations(configId);

    res.json({ data: translations });
  })
);

/**
 * @swagger
 * /api/v1/configs/{configId}/translations/{languageCode}:
 *   get:
 *     summary: 获取指定语言的翻译
 *     tags: [Translations]
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: 语言代码
 *     responses:
 *       200:
 *         description: 翻译详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Translation'
 *       404:
 *         description: 翻译不存在
 */
router.get(
  '/:configId/translations/:languageCode',
  validateParams(configIdAndLanguageParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const configId = parseInt(req.params.configId, 10);
    const { languageCode } = req.params;

    const translation = await translationService.getTranslation(configId, languageCode);

    res.json({ data: translation });
  })
);

/**
 * @swagger
 * /api/v1/configs/{configId}/translations/{languageCode}:
 *   delete:
 *     summary: 删除翻译
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: configId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 配置 ID
 *       - in: path
 *         name: languageCode
 *         required: true
 *         schema:
 *           type: string
 *         description: 语言代码
 *     responses:
 *       204:
 *         description: 翻译删除成功（无响应体）
 *       400:
 *         description: 无法删除默认语言翻译（当存在其他翻译时）
 *       404:
 *         description: 翻译不存在
 */
router.delete(
  '/:configId/translations/:languageCode',
  validateParams(configIdAndLanguageParamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const configId = parseInt(req.params.configId, 10);
    const { languageCode } = req.params;

    await translationService.deleteTranslation(configId, languageCode);

    res.status(204).send();
  })
);

/**
 * Language metadata interface
 */
interface LanguageMetadata {
  code: string;
  name: string;
  englishName: string;
}

/**
 * Language metadata map
 */
const languageMetadata: Record<string, LanguageMetadata> = {
  'zh-cn': {
    code: 'zh-cn',
    name: '中文（简体）',
    englishName: 'Chinese (Simplified)',
  },
  'en-us': {
    code: 'en-us',
    name: 'English (US)',
    englishName: 'English (US)',
  },
  'ja-jp': {
    code: 'ja-jp',
    name: '日本語',
    englishName: 'Japanese',
  },
};

// Export the language metadata endpoint separately (not under /:configId)
export const languagesRouter = Router();

/**
 * @swagger
 * /api/v1/languages:
 *   get:
 *     summary: 获取支持的语言列表
 *     tags: [Languages]
 *     description: 返回系统支持的所有语言及其元数据，包括默认语言
 *     responses:
 *       200:
 *         description: 语言列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 default:
 *                   type: string
 *                   description: 默认语言代码
 *                   example: zh-cn
 *                 supported:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         description: 语言代码（BCP 47 格式）
 *                         example: zh-cn
 *                       name:
 *                         type: string
 *                         description: 语言的本地名称
 *                         example: 中文（简体）
 *                       englishName:
 *                         type: string
 *                         description: 语言的英文名称
 *                         example: Chinese (Simplified)
 */
languagesRouter.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const defaultLanguage = languageResolver.getDefaultLanguage();
    const supportedLanguages = languageResolver.getSupportedLanguages();

    const supported = supportedLanguages.map(code => {
      return languageMetadata[code] || {
        code,
        name: code,
        englishName: code,
      };
    });

    res.json({
      default: defaultLanguage,
      supported,
    });
  })
);

export default router;
// Force rebuild
