/**
 * ConflictError 类
 * 
 * 用于表示资源冲突的错误
 * 
 * 需求: 3.2
 */

/**
 * 资源冲突错误类
 * 
 * 当尝试创建已存在的资源时抛出此错误
 */
export class ConflictError extends Error {
  public readonly code: string;

  /**
   * 创建 ConflictError 实例
   * 
   * @param message - 错误消息
   * @param code - 错误代码（默认: CONFLICT）
   */
  constructor(message: string, code: string = 'CONFLICT') {
    super(message);
    this.name = 'ConflictError';
    this.code = code;

    // 维护正确的原型链
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
