/**
 * ValidationError 类
 * 
 * 用于表示请求数据验证失败的错误
 * 
 * 需求: 4.4, 7.1
 */

/**
 * 验证错误详情接口
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  type: string;
}

/**
 * 验证错误类
 * 
 * 当请求数据验证失败时抛出此错误
 */
export class ValidationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  /**
   * 创建 ValidationError 实例
   * 
   * @param message - 错误消息
   * @param code - 错误代码（默认: VALIDATION_ERROR）
   * @param details - 验证错误详情
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
