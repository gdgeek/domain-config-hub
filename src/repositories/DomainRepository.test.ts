/**
 * DomainRepository 单元测试
 * 
 * 测试数据访问层的 CRUD 操作和错误处理
 * 使用 Mock 避免依赖真实数据库
 * 
 * 需求: 3.1, 3.3, 3.5
 */

import { DomainRepository } from './DomainRepository';
import { Domain } from '../models/Domain';
import { DatabaseError } from '../errors/DatabaseError';

// Mock Domain 模型
jest.mock('../models/Domain');
jest.mock('../config/logger');

describe('DomainRepository', () => {
  let repository: DomainRepository;
  let mockDomain: jest.Mocked<typeof Domain>;

  beforeEach(() => {
    repository = new DomainRepository();
    mockDomain = Domain as jest.Mocked<typeof Domain>;
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建域名配置', async () => {
      const data = {
        domain: 'example.com',
        title: 'Example Site',
        author: 'John Doe',
        description: 'A test site',
        keywords: 'test, example',
        links: { home: '/' },
      };

      const mockCreated = {
        id: 1,
        ...data,
      } as Domain;

      mockDomain.create = jest.fn().mockResolvedValue(mockCreated);

      const result = await repository.create(data);

      expect(mockDomain.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(mockCreated);
      expect(result.id).toBe(1);
      expect(result.domain).toBe(data.domain);
    });

    it('应该成功创建只包含必填字段的域名配置', async () => {
      const data = {
        domain: 'minimal.com',
      };

      const mockCreated = {
        id: 2,
        domain: 'minimal.com',
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: null,
      } as Domain;

      mockDomain.create = jest.fn().mockResolvedValue(mockCreated);

      const result = await repository.create(data);

      expect(mockDomain.create).toHaveBeenCalledWith(data);
      expect(result.domain).toBe(data.domain);
      expect(result.title).toBeNull();
    });

    it('应该在域名重复时抛出 DatabaseError', async () => {
      const data = {
        domain: 'duplicate.com',
        title: 'Test',
      };

      const error: any = new Error('Validation error');
      error.name = 'SequelizeUniqueConstraintError';
      mockDomain.create = jest.fn().mockRejectedValue(error);

      await expect(repository.create(data)).rejects.toThrow(DatabaseError);
      await expect(repository.create(data)).rejects.toThrow('已存在');
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      const data = {
        domain: 'error.com',
      };

      mockDomain.create = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      await expect(repository.create(data)).rejects.toThrow(DatabaseError);
      await expect(repository.create(data)).rejects.toThrow('创建域名配置失败');
    });
  });

  describe('findById', () => {
    it('应该通过 ID 找到域名配置', async () => {
      const mockFound = {
        id: 1,
        domain: 'findbyid.com',
        title: 'Find By ID Test',
        author: null,
        description: null,
        keywords: null,
        links: null,
      } as Domain;

      mockDomain.findByPk = jest.fn().mockResolvedValue(mockFound);

      const result = await repository.findById(1);

      expect(mockDomain.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFound);
      expect(result?.id).toBe(1);
      expect(result?.domain).toBe('findbyid.com');
    });

    it('应该在 ID 不存在时返回 null', async () => {
      mockDomain.findByPk = jest.fn().mockResolvedValue(null);

      const result = await repository.findById(99999);

      expect(mockDomain.findByPk).toHaveBeenCalledWith(99999);
      expect(result).toBeNull();
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.findById(1)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findByDomain', () => {
    it('应该通过域名找到配置', async () => {
      const mockFound = {
        id: 1,
        domain: 'findbydomain.com',
        title: 'Find By Domain Test',
        author: null,
        description: null,
        keywords: null,
        links: null,
      } as Domain;

      mockDomain.findOne = jest.fn().mockResolvedValue(mockFound);

      const result = await repository.findByDomain('findbydomain.com');

      expect(mockDomain.findOne).toHaveBeenCalledWith({
        where: { domain: 'findbydomain.com' },
      });
      expect(result).toEqual(mockFound);
      expect(result?.domain).toBe('findbydomain.com');
    });

    it('应该在域名不存在时返回 null', async () => {
      mockDomain.findOne = jest.fn().mockResolvedValue(null);

      const result = await repository.findByDomain('nonexistent.com');

      expect(mockDomain.findOne).toHaveBeenCalledWith({
        where: { domain: 'nonexistent.com' },
      });
      expect(result).toBeNull();
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.findByDomain('error.com')).rejects.toThrow(DatabaseError);
    });
  });

  describe('findAll', () => {
    it('应该返回第一页数据', async () => {
      const mockDomains = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        domain: `test${i + 1}.com`,
        title: `Test ${i + 1}`,
        author: null,
        description: null,
        keywords: null,
        links: null,
      })) as Domain[];

      mockDomain.findAll = jest.fn().mockResolvedValue(mockDomains);

      const result = await repository.findAll({ page: 1, pageSize: 10 });

      expect(mockDomain.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
        order: [['id', 'ASC']],
      });
      expect(result).toHaveLength(10);
      expect(result[0].domain).toBe('test1.com');
    });

    it('应该返回第二页数据', async () => {
      const mockDomains = Array.from({ length: 10 }, (_, i) => ({
        id: i + 11,
        domain: `test${i + 11}.com`,
        title: `Test ${i + 11}`,
        author: null,
        description: null,
        keywords: null,
        links: null,
      })) as Domain[];

      mockDomain.findAll = jest.fn().mockResolvedValue(mockDomains);

      const result = await repository.findAll({ page: 2, pageSize: 10 });

      expect(mockDomain.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
        order: [['id', 'ASC']],
      });
      expect(result).toHaveLength(10);
      expect(result[0].domain).toBe('test11.com');
    });

    it('应该在超出范围时返回空数组', async () => {
      mockDomain.findAll = jest.fn().mockResolvedValue([]);

      const result = await repository.findAll({ page: 10, pageSize: 10 });

      expect(mockDomain.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 90,
        order: [['id', 'ASC']],
      });
      expect(result).toHaveLength(0);
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.findAll({ page: 1, pageSize: 10 })).rejects.toThrow(DatabaseError);
    });
  });

  describe('count', () => {
    it('应该返回 0 当没有数据时', async () => {
      mockDomain.count = jest.fn().mockResolvedValue(0);

      const result = await repository.count();

      expect(mockDomain.count).toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('应该返回正确的总数', async () => {
      mockDomain.count = jest.fn().mockResolvedValue(3);

      const result = await repository.count();

      expect(mockDomain.count).toHaveBeenCalled();
      expect(result).toBe(3);
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.count = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.count()).rejects.toThrow(DatabaseError);
    });
  });

  describe('update', () => {
    it('应该成功更新域名配置', async () => {
      const mockDomainInstance = {
        id: 1,
        domain: 'update.com',
        title: 'Original Title',
        author: 'Original Author',
        description: null,
        keywords: null,
        links: null,
        update: jest.fn().mockResolvedValue({
          id: 1,
          domain: 'update.com',
          title: 'Updated Title',
          author: 'Original Author',
          description: 'New Description',
          keywords: null,
          links: null,
        }),
      } as any;

      mockDomain.findByPk = jest.fn().mockResolvedValue(mockDomainInstance);

      const result = await repository.update(1, {
        title: 'Updated Title',
        description: 'New Description',
      });

      expect(mockDomain.findByPk).toHaveBeenCalledWith(1);
      expect(mockDomainInstance.update).toHaveBeenCalledWith({
        title: 'Updated Title',
        description: 'New Description',
      });
      expect(result).toBeDefined();
    });

    it('应该在 ID 不存在时返回 null', async () => {
      mockDomain.findByPk = jest.fn().mockResolvedValue(null);

      const result = await repository.update(99999, {
        title: 'Updated Title',
      });

      expect(mockDomain.findByPk).toHaveBeenCalledWith(99999);
      expect(result).toBeNull();
    });

    it('应该能够更新为 null 值', async () => {
      const mockDomainInstance = {
        id: 1,
        domain: 'updatenull.com',
        title: 'Original Title',
        author: null,
        description: null,
        keywords: null,
        links: null,
        update: jest.fn().mockResolvedValue({
          id: 1,
          domain: 'updatenull.com',
          title: null,
          author: null,
          description: null,
          keywords: null,
          links: null,
        }),
      } as any;

      mockDomain.findByPk = jest.fn().mockResolvedValue(mockDomainInstance);

      const result = await repository.update(1, {
        title: null,
      });

      expect(mockDomainInstance.update).toHaveBeenCalledWith({ title: null });
      expect(result).toBeDefined();
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.update(1, { title: 'Test' })).rejects.toThrow(DatabaseError);
    });
  });

  describe('delete', () => {
    it('应该成功删除域名配置', async () => {
      const mockDomainInstance = {
        id: 1,
        domain: 'delete.com',
        title: 'To Be Deleted',
        author: null,
        description: null,
        keywords: null,
        links: null,
        destroy: jest.fn().mockResolvedValue(undefined),
      } as any;

      mockDomain.findByPk = jest.fn().mockResolvedValue(mockDomainInstance);

      const result = await repository.delete(1);

      expect(mockDomain.findByPk).toHaveBeenCalledWith(1);
      expect(mockDomainInstance.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('应该在 ID 不存在时返回 false', async () => {
      mockDomain.findByPk = jest.fn().mockResolvedValue(null);

      const result = await repository.delete(99999);

      expect(mockDomain.findByPk).toHaveBeenCalledWith(99999);
      expect(result).toBe(false);
    });

    it('应该在数据库错误时抛出 DatabaseError', async () => {
      mockDomain.findByPk = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(repository.delete(1)).rejects.toThrow(DatabaseError);
    });
  });
});
