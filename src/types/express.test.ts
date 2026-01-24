/**
 * Express 类型扩展测试
 * 
 * 验证 Express Request 接口扩展是否正确工作
 * 
 * 需求: 1.4
 */

import { Request } from 'express';
import './express.d'; // 导入类型扩展

describe('Express Type Extensions', () => {
  describe('Request.requestId', () => {
    it('should allow setting requestId on Request object', () => {
      const req = {} as Request;
      const testId = 'test-request-id-123';
      
      // 这应该不会产生 TypeScript 错误
      req.requestId = testId;
      
      expect(req.requestId).toBe(testId);
    });

    it('should allow reading requestId from Request object', () => {
      const req = { requestId: 'existing-id' } as Request;
      
      // 这应该不会产生 TypeScript 错误
      const id = req.requestId;
      
      expect(id).toBe('existing-id');
    });

    it('should allow requestId to be undefined', () => {
      const req = {} as Request;
      
      // requestId 是可选的，所以可以是 undefined
      expect(req.requestId).toBeUndefined();
    });

    it('should work with type checking in functions', () => {
      const processRequest = (req: Request): string => {
        // 这应该不会产生 TypeScript 错误
        return req.requestId || 'no-id';
      };

      const req1 = { requestId: 'test-id' } as Request;
      const req2 = {} as Request;

      expect(processRequest(req1)).toBe('test-id');
      expect(processRequest(req2)).toBe('no-id');
    });
  });
});
