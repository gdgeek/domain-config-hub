/**
 * DomainV2Service 单元测试
 */

import { DomainV2Service } from './DomainV2Service';
import { DomainV2Repository } from '../repositories/DomainV2Repository';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';

// Mock repositories
jest.mock('../repositories/DomainV2Repository');
jest.mock('../repositories/ConfigRepository');
jest.mock('../config/logger');

describe('DomainV2Service', () => {
  let domainService: DomainV2Service;
  let mockDomainRepository: jest.Mocked<DomainV2Repository>;
  let mockConfigRepository: jest.Mocked<ConfigRepository>;

  beforeEach(() => {
    mockDomainRepository = new DomainV2Repository() as jest.Mocked<DomainV2Repository>;
    mockConfigRepository = new ConfigRepository() as jest.Mocked<ConfigRepository>;
    domainService = new DomainV2Service(mockDomainRepository, mockConfigRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('应该成功创建域名', async () => {
      const input = {
        domain: 'example.com',
        configId: 1,
      };

      const mockConfig = {
        id: 1,
        title: '测试配置',
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        config: mockConfig,
      };

      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(null);
      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockDomainRepository.create = jest.fn().mockResolvedValue({ id: 1, ...input });
      mockDomainRepository.findById = jest.fn().mockResolvedValue(mockDomain);

      const result = await domainService.create(input);

      expect(result.domain).toBe('example.com');
      expect(result.configId).toBe(1);
      expect(result.config).toBeDefined();
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('example.com');
      expect(mockConfigRepository.findById).toHaveBeenCalledWith(1);
    });

    it('域名已存在时应该抛出 ConflictError', async () => {
      const input = {
        domain: 'example.com',
        configId: 1,
      };

      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue({ id: 1, domain: 'example.com' });

      await expect(domainService.create(input)).rejects.toThrow(ConflictError);
      expect(mockConfigRepository.findById).not.toHaveBeenCalled();
    });

    it('配置不存在时应该抛出 NotFoundError', async () => {
      const input = {
        domain: 'example.com',
        configId: 999,
      };

      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(null);
      mockConfigRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(domainService.create(input)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getById', () => {
    it('应该返回域名及配置', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        config: {
          id: 1,
          title: '测试配置',
          author: null,
          description: null,
          keywords: null,
          links: null,
          permissions: null,
        },
      };

      mockDomainRepository.findById = jest.fn().mockResolvedValue(mockDomain);

      const result = await domainService.getById(1);

      expect(result).toBeDefined();
      expect(result!.domain).toBe('example.com');
      expect(result!.config).toBeDefined();
    });

    it('域名不存在时应该返回 null', async () => {
      mockDomainRepository.findById = jest.fn().mockResolvedValue(null);

      const result = await domainService.getById(999);

      expect(result).toBeNull();
    });
  });

  describe('getByDomain', () => {
    it('应该通过域名返回记录', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 1,
        config: {
          id: 1,
          title: '测试配置',
          author: null,
          description: null,
          keywords: null,
          links: null,
          permissions: null,
        },
      };

      mockDomainRepository.findByDomain = jest.fn().mockResolvedValue(mockDomain);

      const result = await domainService.getByDomain('example.com');

      expect(result).toBeDefined();
      expect(result!.domain).toBe('example.com');
    });
  });

  describe('list', () => {
    it('应该返回分页的域名列表', async () => {
      const mockDomains = [
        { id: 1, domain: 'site1.com', configId: 1, config: { id: 1, title: '配置1' } },
        { id: 2, domain: 'site2.com', configId: 1, config: { id: 1, title: '配置1' } },
      ];

      mockDomainRepository.findAll = jest.fn().mockResolvedValue(mockDomains);
      mockDomainRepository.count = jest.fn().mockResolvedValue(2);

      const result = await domainService.list({ page: 1, pageSize: 20 });

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
    it('应该成功更新域名', async () => {
      const mockConfig = {
        id: 2,
        title: '新配置',
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      const mockDomain = {
        id: 1,
        domain: 'example.com',
        configId: 2,
        config: mockConfig,
      };

      mockConfigRepository.findById = jest.fn().mockResolvedValue(mockConfig);
      mockDomainRepository.update = jest.fn().mockResolvedValue(mockDomain);

      const result = await domainService.update(1, { configId: 2 });

      expect(result).toBeDefined();
      expect(result!.configId).toBe(2);
      expect(mockConfigRepository.findById).toHaveBeenCalledWith(2);
    });

    it('配置不存在时应该抛出 NotFoundError', async () => {
      mockConfigRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(domainService.update(1, { configId: 999 })).rejects.toThrow(NotFoundError);
    });

    it('域名不存在时应该返回 null', async () => {
      mockDomainRepository.update = jest.fn().mockResolvedValue(null);

      const result = await domainService.update(999, {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除域名', async () => {
      mockDomainRepository.delete = jest.fn().mockResolvedValue(true);

      const result = await domainService.delete(1);

      expect(result).toBe(true);
      expect(mockDomainRepository.delete).toHaveBeenCalledWith(1);
    });

    it('域名不存在时应该抛出 NotFoundError', async () => {
      mockDomainRepository.delete = jest.fn().mockResolvedValue(false);

      await expect(domainService.delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
