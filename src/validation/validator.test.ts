import Joi from 'joi';
import { ValidationError, validateOrThrow } from './validator';

describe('ValidationError', () => {
  it('should create ValidationError with default code', () => {
    const error = new ValidationError('Test error');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toBeUndefined();
  });

  it('should create ValidationError with custom code', () => {
    const error = new ValidationError('Test error', 'CUSTOM_ERROR');
    
    expect(error.code).toBe('CUSTOM_ERROR');
  });

  it('should create ValidationError with details', () => {
    const details = {
      errors: [
        { field: 'name', message: 'Name is required', type: 'any.required' }
      ]
    };
    const error = new ValidationError('Test error', 'VALIDATION_ERROR', details);
    
    expect(error.details).toEqual(details);
  });
});

describe('validateOrThrow', () => {
  describe('成功验证', () => {
    it('should return validated data when validation passes', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().min(0),
      });

      const data = { name: 'John', age: 25 };
      const result = validateOrThrow(schema, data);

      expect(result).toEqual(data);
    });

    it('should apply default values', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        status: Joi.string().default('active'),
      });

      const data = { name: 'John' };
      const result = validateOrThrow(schema, data);

      expect(result).toEqual({ name: 'John', status: 'active' });
    });

    it('should strip unknown fields', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      const data = { name: 'John', extra: 'field' };
      const result = validateOrThrow(schema, data);

      expect(result).toEqual({ name: 'John' });
      expect(result).not.toHaveProperty('extra');
    });

    it('should handle null values when allowed', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow(null),
      });

      const data = { name: 'John', description: null };
      const result = validateOrThrow(schema, data);

      expect(result).toEqual(data);
    });

    it('should handle empty strings when allowed', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        title: Joi.string().allow(''),
      });

      const data = { name: 'John', title: '' };
      const result = validateOrThrow(schema, data);

      expect(result).toEqual(data);
    });
  });

  describe('验证失败', () => {
    it('should throw ValidationError when required field is missing', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      const data = {};

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toBe('请求数据验证失败');
          expect(error.code).toBe('VALIDATION_ERROR');
          expect(error.details).toBeDefined();
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'name',
            type: 'any.required',
          });
        }
      }
    });

    it('should throw ValidationError when field type is invalid', () => {
      const schema = Joi.object({
        age: Joi.number().required(),
      });

      const data = { age: 'not a number' };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'age',
            type: 'number.base',
          });
        }
      }
    });

    it('should throw ValidationError when field exceeds max length', () => {
      const schema = Joi.object({
        name: Joi.string().max(5),
      });

      const data = { name: 'toolong' };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'name',
            type: 'string.max',
          });
        }
      }
    });

    it('should throw ValidationError when field is below minimum', () => {
      const schema = Joi.object({
        age: Joi.number().min(18),
      });

      const data = { age: 10 };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'age',
            type: 'number.min',
          });
        }
      }
    });

    it('should collect multiple validation errors', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
        email: Joi.string().email().required(),
      });

      const data = { email: 'invalid-email' };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(3);
          
          const fields = errors.map((e: any) => e.field);
          expect(fields).toContain('name');
          expect(fields).toContain('age');
          expect(fields).toContain('email');
        }
      }
    });

    it('should handle nested object validation errors', () => {
      const schema = Joi.object({
        user: Joi.object({
          name: Joi.string().required(),
          age: Joi.number().required(),
        }).required(),
      });

      const data = { user: { name: 'John' } };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'user.age',
            type: 'any.required',
          });
        }
      }
    });

    it('should handle object type validation errors', () => {
      const schema = Joi.object({
        links: Joi.object().required(),
      });

      const data = { links: 'not an object' };

      expect(() => validateOrThrow(schema, data)).toThrow(ValidationError);
      
      try {
        validateOrThrow(schema, data);
      } catch (error) {
        if (error instanceof ValidationError) {
          const errors = error.details?.errors as any[];
          expect(errors).toHaveLength(1);
          expect(errors[0]).toMatchObject({
            field: 'links',
            type: 'object.base',
          });
        }
      }
    });
  });

  describe('边界情况', () => {
    it('should handle empty object validation', () => {
      const schema = Joi.object({});
      const data = {};
      
      const result = validateOrThrow(schema, data);
      expect(result).toEqual({});
    });

    it('should handle null data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      expect(() => validateOrThrow(schema, null)).toThrow(ValidationError);
    });

    it('should handle undefined data', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      expect(() => validateOrThrow(schema, undefined)).toThrow(ValidationError);
    });

    it('should handle array data when object expected', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
      });

      expect(() => validateOrThrow(schema, [])).toThrow(ValidationError);
    });
  });

  describe('类型推断', () => {
    it('should return correctly typed data', () => {
      interface UserData {
        name: string;
        age: number;
      }

      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required(),
      });

      const data = { name: 'John', age: 25 };
      const result = validateOrThrow<UserData>(schema, data);

      // TypeScript should infer the correct type
      expect(result.name).toBe('John');
      expect(result.age).toBe(25);
    });
  });
});
