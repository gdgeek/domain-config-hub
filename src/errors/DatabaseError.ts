/**
 * DatabaseError 类
 * 
 * 用于封装数据库操作错误
 * 
 * 需求: 7.1
 */

/**
 * 数据库错误类
 * 
 * 当数据库操作失败时抛出此错误
 */
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly originalError?: Error;

  /**
   * 创建 DatabaseError 实例
   * 
   * @param message - 错误消息
   * @param code - 错误代码（默认: DATABASE_ERROR）
   * @param originalError - 原始错误对象
   */
  constructor(message: string, code: string = 'DATABASE_ERROR', originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.originalError = originalError;

    // 维护正确的原型链
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
