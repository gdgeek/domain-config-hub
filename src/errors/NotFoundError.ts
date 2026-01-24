/**
 * NotFoundError 类
 * 
 * 用于表示资源不存在的错误
 * 
 * 需求: 1.2, 3.4, 3.6
 */

/**
 * 资源不存在错误类
 * 
 * 当请求的资源不存在时抛出此错误
 */
export class NotFoundError extends Error {
  public readonly code: string;

  /**
   * 创建 NotFoundError 实例
   * 
   * @param message - 错误消息
   * @param code - 错误代码（默认: NOT_FOUND）
   */
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;

    // 维护正确的原型链
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
