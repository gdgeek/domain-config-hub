/**
 * ConfigService 单元测试
 */

import { ConfigService } from './ConfigService';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainV2Repository } from '../repositories/DomainV2Repository';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

// Mock repositories
jest.mock('../repositories/ConfigRepository');
jest.mock('../repositories/DomainV2Repository');

describe('ConfigService', () => {
  let configService: ConfigService;
  let mockConfigRepository: jest.Mocked<ConfigRepository>;
  let mockDomainRepository: jest.Mocked<DomainV2Repository>;

  beforeEach(() => {
    mockConfigRepository = new ConfigRepository() as jest.Mocked<ConfigRepository>;
    mockDomainRepository = new DomainV2Repository() as jest.Mocked<DomainV2Repository>;
    configService = new ConfigService(mockConfigRepository, mockDomainRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建配置', async () => {
      const input = {
        title: '测试配置',
        author: '测试作者',
      };

      const mockConfig = {
        id: 1,
        ...input,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      mockConfigRepository.create = jest.fn().mockResolvedValue(mockConfig);

      const result = await configService.create(input);

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('getById', () => {
    it('应该返回配置', async () => {
      const mockConfig = {
        id: 1,
        title: '测试配置',
        author: '测试作者',
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);

      const result = await configService.getById(1);

      expect(result).toEqual(mockConfig);
      expect(mockConfigRepository.findById).toHaveBeenCalledWith(1);
    });

    it('配置不存在时应该返回 null', async () => {
      mockConfigRepository.findById = jest.fn().mockResolvedValue(null);

      const result = await configService.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('应该返回分页的配置列表', async () => {
      const mockConfigs = [
        { id: 1, title: '配置1', author: null, description: null, keywords: null, links: null, permissions: null },
        { id: 2, title: '配置2', author: null, description: null, keywords: null, links: null, permissions: null },
      ];

      mockConfigRepository.findAll = jest.fn().mockResolvedValue(mockConfigs);
      mockConfigRepository.count = jest.fn().mockResolvedValue(2);

      const result = await configService.list({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
    });
  });

  describe('update', () => {
    it('应该成功更新配置', async () => {
      const mockConfig = {
        id: 1,
        title: '更新后的配置',
        author: '测试作者',
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      mockConfigRepository.update = jest.fn().mockResolvedValue(mockConfig);

      const result = await configService.update(1, { title: '更新后的配置' });

      expect(result).toEqual(mockConfig);
    });

    it('配置不存在时应该返回 null', async () => {
      mockConfigRepository.update = jest.fn().mockResolvedValue(null);

      const result = await configService.update(999, { title: '更新' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除配置', async () => {
      mockDomainRepository.countByConfigId = jest.fn().mockResolvedValue(0);
      mockConfigRepository.delete = jest.fn().mockResolvedValue(true);

      const result = await configService.delete(1);

      expect(result).toBe(true);
      expect(mockDomainRepository.countByConfigId).toHaveBeenCalledWith(1);
      expect(mockConfigRepository.delete).toHaveBeenCalledWith(1);
    });

    it('配置被使用时应该抛出 ConflictError', async () => {
      mockDomainRepository.countByConfigId = jest.fn().mockResolvedValue(3);

      await expect(configService.delete(1)).rejects.toThrow(ConflictError);
      expect(mockConfigRepository.delete).not.toHaveBeenCalled();
    });

    it('配置不存在时应该抛出 NotFoundError', async () => {
      mockDomainRepository.countByConfigId = jest.fn().mockResolvedValue(0);
      mockConfigRepository.delete = jest.fn().mockResolvedValue(false);

      await expect(configService.delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
