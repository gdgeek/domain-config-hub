/**
 * ValidationMiddleware 模块
 * 
 * 提供请求数据验证中间件，支持验证请求体、查询参数和路径参数
 * 
 * 需求: 4.4
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import Joi from 'joi';
import { ValidationError } from '../errors/ValidationError';

/**
 * 验证请求数据的中间件工厂函数
 * 
 * 根据指定的 Joi schema 和验证类型（body/query/params）创建验证中间件
 * 
 * @param schema - Joi 验证模式
 * @param type - 验证类型：'body' | 'query' | 'params'
 * @returns Express 请求处理器
 * 
 * @example
 * ```typescript
 * const schema = Joi.object({
 *   domain: Joi.string().required()
 * });
 * 
 * router.post('/domains', validateRequest(schema, 'body'), handler);
 * ```
 */
export function validateRequest(
  schema: Joi.Schema,
  type: 'body' | 'query' | 'params'
): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // 获取要验证的数据
    const dataToValidate = req[type];

    // 执行验证
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // 收集所有错误，而不是在第一个错误时停止
      stripUnknown: true, // 移除未在 schema 中定义的字段
      convert: true, // 自动类型转换（如字符串转数字）
    });

    if (error) {
      // 将 Joi 错误转换为标准化的错误详情格式
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      // 抛出 ValidationError，将被错误处理中间件捕获
      return next(
        new ValidationError(
          '请求数据验证失败',
          'VALIDATION_ERROR',
          { errors }
        )
      );
    }

    // 将验证后的值（包含默认值和类型转换）替换原始数据
    req[type] = value;

    next();
  };
}

/**
 * 验证请求体的便捷函数
 * 
 * @param schema - Joi 验证模式
 * @returns Express 请求处理器
 * 
 * @example
 * ```typescript
 * router.post('/domains', validateBody(createDomainSchema), handler);
 * ```
 */
export function validateBody(schema: Joi.Schema): RequestHandler {
  return validateRequest(schema, 'body');
}

/**
 * 验证查询参数的便捷函数
 * 
 * @param schema - Joi 验证模式
 * @returns Express 请求处理器
 * 
 * @example
 * ```typescript
 * router.get('/domains', validateQuery(paginationSchema), handler);
 * ```
 */
export function validateQuery(schema: Joi.Schema): RequestHandler {
  return validateRequest(schema, 'query');
}

/**
 * 验证路径参数的便捷函数
 * 
 * @param schema - Joi 验证模式
 * @returns Express 请求处理器
 * 
 * @example
 * ```typescript
 * router.get('/domains/:domain', validateParams(domainParamSchema), handler);
 * ```
 */
export function validateParams(schema: Joi.Schema): RequestHandler {
  return validateRequest(schema, 'params');
}
