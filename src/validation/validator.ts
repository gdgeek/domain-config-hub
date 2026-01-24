import Joi from 'joi';

/**
 * ValidationError 类
 * 
 * 用于封装数据验证错误
 * 
 * 需求: 4.4
 */
export class ValidationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  /**
   * 创建 ValidationError 实例
   * 
   * @param message - 错误消息
   * @param code - 错误代码（默认: VALIDATION_ERROR）
   * @param details - 错误详情（包含具体的字段错误信息）
   */
  constructor(message: string, code: string = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;

    // 维护正确的原型链
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * 验证数据并在失败时抛出 ValidationError
 * 
 * 此函数使用 Joi schema 验证数据，如果验证失败则抛出 ValidationError
 * 
 * @param schema - Joi 验证模式
 * @param data - 要验证的数据
 * @returns 验证后的数据（包含默认值）
 * @throws {ValidationError} 当验证失败时
 * 
 * @example
 * ```typescript
 * const schema = Joi.object({
 *   name: Joi.string().required(),
 *   age: Joi.number().min(0)
 * });
 * 
 * try {
 *   const validated = validateOrThrow(schema, { name: 'John', age: 25 });
 *   console.log(validated); // { name: 'John', age: 25 }
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     console.error(error.message);
 *     console.error(error.details);
 *   }
 * }
 * ```
 * 
 * 需求: 4.4
 */
export function validateOrThrow<T>(schema: Joi.Schema, data: unknown): T {
  // Convert undefined to empty object to ensure validation runs
  const dataToValidate = data === undefined ? {} : data;
  
  const { error, value } = schema.validate(dataToValidate, {
    abortEarly: false, // 收集所有错误，而不是在第一个错误时停止
    stripUnknown: true, // 移除未在 schema 中定义的字段
  });

  if (error) {
    // 将 Joi 错误转换为标准化的错误详情格式
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
      type: detail.type,
    }));

    throw new ValidationError(
      '请求数据验证失败',
      'VALIDATION_ERROR',
      { errors }
    );
  }

  return value as T;
}
