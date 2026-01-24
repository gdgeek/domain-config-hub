/**
 * DomainService 单元测试
 * 
 * 测试业务逻辑层的核心功能
 */

import { DomainService, DomainInput, DomainOutput } from './DomainService';
import { IDomainRepository, Pagination } from '../repositories/DomainRepository';
import { ICacheService } from './CacheService';
import { Domain } from '../models/Domain';
import { ConflictError } from '../errors/ConflictError';
import { DatabaseError } from '../errors/DatabaseError';

// Mock Repository
const mockRepository: jest.Mocked<IDomainRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByDomain: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// Mock Cache Service
const mockCache: jest.Mocked<ICacheService> = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  isEnabled: jest.fn(),
};

describe('DomainService', () => {
  let service: DomainService;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 创建服务实例
    service = new DomainService(mockRepository, mockCache);
  });

  describe('create', () => {
    const input: DomainInput = {
      domain: 'example.com',
      title: 'Example',
      author: 'Test Author',
      description: 'Test Description',
      keywords: 'test, example',
      links: { home: 'https://example.com' },
    };

    it('应该成功创建域名配置', async () => {
      const mockDomain = {
        id: 1,
        ...input,
      } as Domain;

      mockRepository.findByDomain.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(mockDomain);

      const result = await service.create(input);

      expect(mockRepository.findByDomain).toHaveBeenCalledWith(input.domain);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(result).toEqual({
        id: 1,
        domain: input.domain,
        title: input.title,
        author: input.author,
        description: input.description,
        keywords: input.keywords,
        links: input.links,
      });
    });

    it('当域名已存在时应该抛出 ConflictError', async () => {
      const existingDomain = {
        id: 1,
        domain: input.domain,
        title: 'Existing',
        author: null,
        description: null,
        keywords: null,
        links: null,
      } as Domain;

      mockRepository.findByDomain.mockResolvedValue(existingDomain);

      await expect(service.create(input)).rejects.toThrow(ConflictError);
      await expect(service.create(input)).rejects.toThrow(`域名 '${input.domain}' 已存在`);
      
      expect(mockRepository.findByDomain).toHaveBeenCalledWith(input.domain);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('当数据库操作失败时应该抛出 DatabaseError', async () => {
      mockRepository.findByDomain.mockResolvedValue(null);
      mockRepository.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.create(input)).rejects.toThrow(DatabaseError);
      
      expect(mockRepository.findByDomain).toHaveBeenCalledWith(input.domain);
      expect(mockRepository.create).toHaveBeenCalledWith(input);
    });
  });

  describe('getById', () => {
    it('应该返回存在的域名配置', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'test',
        links: { home: 'https://example.com' },
      } as Domain;

      mockRepository.findById.mockResolvedValue(mockDomain);

      const result = await service.getById(1);

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'test',
        links: { home: 'https://example.com' },
      });
    });

    it('当域名配置不存在时应该返回 null', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getById(999);

      expect(mockRepository.findById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  describe('getByDomain', () => {
    const mockDomain = {
      id: 1,
      domain: 'example.com',
      title: 'Example',
      author: 'Test Author',
      description: 'Test Description',
      keywords: 'test',
      links: { home: 'https://example.com' },
    } as Domain;

    it('当缓存命中时应该从缓存返回数据', async () => {
      const cachedData: DomainOutput = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'test',
        links: { home: 'https://example.com' },
      };

      mockCache.get.mockResolvedValue(cachedData);

      const result = await service.getByDomain('example.com');

      expect(mockCache.get).toHaveBeenCalledWith('example.com');
      expect(mockRepository.findByDomain).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('当缓存未命中时应该从数据库查询并缓存', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepository.findByDomain.mockResolvedValue(mockDomain);

      const result = await service.getByDomain('example.com');

      expect(mockCache.get).toHaveBeenCalledWith('example.com');
      expect(mockRepository.findByDomain).toHaveBeenCalledWith('example.com');
      expect(mockCache.set).toHaveBeenCalledWith('example.com', {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'test',
        links: { home: 'https://example.com' },
      });
      expect(result).toEqual({
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: 'Test Author',
        description: 'Test Description',
        keywords: 'test',
        links: { home: 'https://example.com' },
      });
    });

    it('当域名配置不存在时应该返回 null', async () => {
      mockCache.get.mockResolvedValue(null);
      mockRepository.findByDomain.mockResolvedValue(null);

      const result = await service.getByDomain('nonexistent.com');

      expect(mockCache.get).toHaveBeenCalledWith('nonexistent.com');
      expect(mockRepository.findByDomain).toHaveBeenCalledWith('nonexistent.com');
      expect(mockCache.set).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('应该返回分页的域名配置列表', async () => {
      const mockDomains = [
        {
          id: 1,
          domain: 'example1.com',
          title: 'Example 1',
          author: null,
          description: null,
          keywords: null,
          links: null,
        },
        {
          id: 2,
          domain: 'example2.com',
          title: 'Example 2',
          author: null,
          description: null,
          keywords: null,
          links: null,
        },
      ] as Domain[];

      const pagination: Pagination = { page: 1, pageSize: 10 };

      mockRepository.findAll.mockResolvedValue(mockDomains);
      mockRepository.count.mockResolvedValue(2);

      const result = await service.list(pagination);

      expect(mockRepository.findAll).toHaveBeenCalledWith(pagination);
      expect(mockRepository.count).toHaveBeenCalled();
      expect(result).toEqual({
        data: [
          {
            id: 1,
            domain: 'example1.com',
            title: 'Example 1',
            author: null,
            description: null,
            keywords: null,
            links: null,
          },
          {
            id: 2,
            domain: 'example2.com',
            title: 'Example 2',
            author: null,
            description: null,
            keywords: null,
            links: null,
          },
        ],
        pagination: {
          page: 1,
          pageSize: 10,
          total: 2,
          totalPages: 1,
        },
      });
    });

    it('应该正确计算总页数', async () => {
      const pagination: Pagination = { page: 1, pageSize: 10 };

      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(25);

      const result = await service.list(pagination);

      expect(result.pagination.totalPages).toBe(3);
    });

    it('当没有数据时应该返回空列表', async () => {
      const pagination: Pagination = { page: 1, pageSize: 10 };

      mockRepository.findAll.mockResolvedValue([]);
      mockRepository.count.mockResolvedValue(0);

      const result = await service.list(pagination);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('update', () => {
    const updateInput: Partial<DomainInput> = {
      title: 'Updated Title',
      description: 'Updated Description',
    };

    it('应该成功更新域名配置并使缓存失效', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        title: 'Updated Title',
        author: 'Test Author',
        description: 'Updated Description',
        keywords: 'test',
        links: null,
      } as Domain;

      mockRepository.update.mockResolvedValue(mockDomain);

      const result = await service.update(1, updateInput);

      expect(mockRepository.update).toHaveBeenCalledWith(1, updateInput);
      expect(mockCache.delete).toHaveBeenCalledWith('example.com');
      expect(result).toEqual({
        id: 1,
        domain: 'example.com',
        title: 'Updated Title',
        author: 'Test Author',
        description: 'Updated Description',
        keywords: 'test',
        links: null,
      });
    });

    it('当域名配置不存在时应该返回 null', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await service.update(999, updateInput);

      expect(mockRepository.update).toHaveBeenCalledWith(999, updateInput);
      expect(mockCache.delete).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该成功删除域名配置并使缓存失效', async () => {
      const mockDomain = {
        id: 1,
        domain: 'example.com',
        title: 'Example',
        author: null,
        description: null,
        keywords: null,
        links: null,
      } as Domain;

      mockRepository.findById.mockResolvedValue(mockDomain);
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.delete(1);

      expect(mockRepository.findById).toHaveBeenCalledWith(1);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
      expect(mockCache.delete).toHaveBeenCalledWith('example.com');
      expect(result).toBe(true);
    });

    it('当域名配置不存在时应该返回 false', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.delete(999);

      expect(mockRepository.findById).toHaveBeenCalledWith(999);
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(mockCache.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
});
