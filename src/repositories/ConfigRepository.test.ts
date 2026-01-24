/**
 * ConfigRepository 单元测试
 */

import { ConfigRepository } from './ConfigRepository';
import { Config } from '../models/Config';
import { DatabaseError } from '../errors/DatabaseError';

// Mock Config 模型
jest.mock('../models/Config');
jest.mock('../config/logger');

describe('ConfigRepository', () => {
  let repository: ConfigRepository;

  beforeEach(() => {
    repository = new ConfigRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建配置', async () => {
      const mockData = {
        title: '测试配置',
        author: '测试作者',
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      const mockConfig = { id: 1, ...mockData };
      (Config.create as jest.Mock).mockResolvedValue(mockConfig);

      const result = await repository.create(mockData);

      expect(result).toEqual(mockConfig);
      expect(Config.create).toHaveBeenCalledWith(mockData);
    });

    it('创建失败时应该抛出 DatabaseError', async () => {
      const mockData = {
        title: '测试配置',
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      (Config.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      await expect(repository.create(mockData)).rejects.toThrow(DatabaseError);
    });
  });

  describe('findById', () => {
    it('应该返回配置', async () => {
      const mockConfig = {
        id: 1,
        title: '测试配置',
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      (Config.findByPk as jest.Mock).mockResolvedValue(mockConfig);

      const result = await repository.findById(1);

      expect(result).toEqual(mockConfig);
      expect(Config.findByPk).toHaveBeenCalledWith(1);
    });

    it('配置不存在时应该返回 null', async () => {
      (Config.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('应该返回分页的配置列表', async () => {
      const mockConfigs = [
        { id: 1, title: '配置1', author: null, description: null, keywords: null, links: null, permissions: null },
        { id: 2, title: '配置2', author: null, description: null, keywords: null, links: null, permissions: null },
      ];

      (Config.findAll as jest.Mock).mockResolvedValue(mockConfigs);

      const result = await repository.findAll({ page: 1, pageSize: 20 });

      expect(result).toEqual(mockConfigs);
      expect(Config.findAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        order: [['id', 'DESC']],
      });
    });
  });

  describe('count', () => {
    it('应该返回配置总数', async () => {
      (Config.count as jest.Mock).mockResolvedValue(10);

      const result = await repository.count();

      expect(result).toBe(10);
    });
  });

  describe('update', () => {
    it('应该成功更新配置', async () => {
      const mockConfig = {
        id: 1,
        title: '原标题',
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
        update: jest.fn().mockResolvedValue(undefined),
      };

      (Config.findByPk as jest.Mock).mockResolvedValue(mockConfig);

      const result = await repository.update(1, { title: '新标题' });

      expect(mockConfig.update).toHaveBeenCalledWith({ title: '新标题' });
      expect(result).toEqual(mockConfig);
    });

    it('配置不存在时应该返回 null', async () => {
      (Config.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.update(999, { title: '新标题' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除配置', async () => {
      const mockConfig = {
        id: 1,
        destroy: jest.fn().mockResolvedValue(undefined),
      };

      (Config.findByPk as jest.Mock).mockResolvedValue(mockConfig);

      const result = await repository.delete(1);

      expect(mockConfig.destroy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('配置不存在时应该返回 false', async () => {
      (Config.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });
  });
});
