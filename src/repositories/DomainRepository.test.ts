/**
 * DomainRepository 单元测试
 */

import { DomainRepository } from './DomainRepository';
import { DatabaseError } from '../errors/DatabaseError';

// Mock 模型 - 在导入 repository 之前
jest.mock('../models/Domain', () => ({
  Domain: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('../models/Config', () => ({
  Config: jest.fn(),
}));

jest.mock('../config/logger');

// 导入 mocked 模型
import { Domain } from '../models/Domain';
import { Config } from '../models/Config';

describe('DomainRepository', () => {
  let repository: DomainRepository;

  beforeEach(() => {
    repository = new DomainRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建域名', async () => {
      const mockData = {
        domain: 'example.com',
        configId: 1,
      };

      const mockDomain = { id: 1, ...mockData };
      (Domain.create as jest.Mock).mockResolvedValue(mockDomain);

      const result = await repository.create(mockData);

      expect(result).toEqual(mockDomain);
      expect(Domain.create).toHaveBeenCalledWith(mockData);
    });

    it('创建失败时应该抛出 DatabaseError', async () => {
      const mockData = {
        domain: 'example.com',
        configId: 1,
      };

      (Domain.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.create(mockData)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById', () => {
    it('应该返回域名及关联的配置', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        config: {
          id: 1,
          title: '测试配置',
        },
      };

      (Domain.findByPk as jest.Mock).mockResolvedValue(mockDomain);

      const result = await repository.findById(1);

      expect(result).toEqual(mockDomain);
      expect(Domain.findByPk).toHaveBeenCalledWith(1, {
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    });

    it('域名不存在时应该返回 null', async () => {
      (Domain.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByDomain', () => {
    it('应该通过域名返回记录及关联的配置', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        config: {
          id: 1,
          title: '测试配置',
        },
      };

      (Domain.findOne as jest.Mock).mockResolvedValue(mockDomain);

      const result = await repository.findByDomain('example.com');

      expect(result).toEqual(mockDomain);
      expect(Domain.findOne).toHaveBeenCalledWith({
        where: { domain: 'example.com' },
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    });
  });

  describe('findAll', () => {
    it('应该返回分页的域名列表及关联的配置', async () => {
      const mockDomains = [
        { id: 1, domain: 'site1.com', configId: 1, config: { id: 1, title: '配置1' } },
        { id: 2, domain: 'site2.com', configId: 1, config: { id: 1, title: '配置1' } },
      ];

      (Domain.findAll as jest.Mock).mockResolvedValue(mockDomains);

      const result = await repository.findAll({ page: 1, pageSize: 20 });

      expect(result).toEqual(mockDomains);
      expect(Domain.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: [['id', 'DESC']],
        include: [{
          model: Config,
          as: 'config',
        }],
      });
    });
  });

  describe('count', () => {
    it('应该返回域名总数', async () => {
      (Domain.count as jest.Mock).mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
    });
  });

  describe('update', () => {
    it('应该成功更新域名', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        update: jest.fn().mockResolvedValue(undefined),
        reload: jest.fn().mockResolvedValue(undefined),
      };

      (Domain.findByPk as jest.Mock).mockResolvedValue(mockDomain);

      const result = await repository.update(1, { configId: 2 });

      expect(mockDomain.update).toHaveBeenCalledWith({ configId: 2 });
      expect(mockDomain.reload).toHaveBeenCalledWith({
        include: [{
          model: Config,
          as: 'config',
        }],
      });
      expect(result).toEqual(mockDomain);
    });

    it('域名不存在时应该返回 null', async () => {
      (Domain.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.update(999, { configId: 2 });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除域名', async () => {
      const mockDomain = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      (Domain.findByPk as jest.Mock).mockResolvedValue(mockDomain);

      const result = await repository.delete(1);

      expect(mockDomain.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('域名不存在时应该返回 false', async () => {
      (Domain.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('countByConfigId', () => {
    it('应该返回使用指定配置的域名数量', async () => {
      (Domain.count as jest.Mock).mockResolvedValue(3);

      const result = await repository.countByConfigId(1);

      expect(result).toBe(3);
      expect(Domain.count).toHaveBeenCalledWith({
        where: { configId: 1 },
      });
    });
  });
});
