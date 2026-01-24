/**
 * ValidationError 单元测试
 */

import { ValidationError } from './ValidationError';

describe('ValidationError', () => {
  it('应该创建带有默认代码的 ValidationError', () => {
    const error = new ValidationError('验证失败');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('验证失败');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toBeUndefined();
  });

  it('应该创建带有自定义代码的 ValidationError', () => {
    const error = new ValidationError('验证失败', 'CUSTOM_ERROR');

    expect(error.code).toBe('CUSTOM_ERROR');
  });

  it('应该创建带有详情的 ValidationError', () => {
    const details = {
      errors: [
        { field: 'domain', message: '域名不能为空', type: 'string.empty' },
      ],
    };
    const error = new ValidationError('验证失败', 'VALIDATION_ERROR', details);

    expect(error.details).toEqual(details);
  });

  it('应该维护正确的原型链', () => {
    const error = new ValidationError('验证失败');

    expect(Object.getPrototypeOf(error)).toBe(ValidationError.prototype);
  });

  it('应该可以被 instanceof 正确识别', () => {
    const error = new ValidationError('验证失败');

    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});
