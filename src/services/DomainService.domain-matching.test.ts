/**
 * DomainService 域名智能匹配测试
 */

import { DomainService } from './DomainService';
import { DomainRepository } from '../repositories/DomainRepository';
import { ConfigRepository } from '../repositories/ConfigRepository';

// Mock repositories
jest.mock('../repositories/DomainRepository');
jest.mock('../repositories/ConfigRepository');
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('DomainService - 域名智能匹配', () => {
  let domainService: DomainService;
  let mockDomainRepository: jest.Mocked<DomainRepository>;
  let mockConfigRepository: jest.Mocked<ConfigRepository>;

  beforeEach(() => {
    mockDomainRepository = new DomainRepository() as jest.Mocked<DomainRepository>;
    mockConfigRepository = new ConfigRepository() as jest.Mocked<ConfigRepository>;
    domainService = new DomainService(mockDomainRepository, mockConfigRepository);
  });

  describe('精确匹配', () => {
    it('应该精确匹配 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: {
          id: 1,
          title: 'Baidu',
          author: null,
          description: null,
          keywords: null,
          links: null,
          permissions: null,
        },
      };

      mockDomainRepository.findByDomain.mockResolvedValue(mockDomain as any);

      const result = await domainService.getByDomain('baidu.com');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledTimes(1);
    });
  });

  describe('子域名匹配', () => {
    it('应该将 www.baidu.com 匹配到 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: {
          id: 1,
          title: 'Baidu',
          author: null,
          description: null,
          keywords: null,
          links: null,
          permissions: null,
        },
      };

      // 第一次调用（精确匹配）返回 null
      // 第二次调用（根域名匹配）返回数据
      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('www.baidu.com');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledTimes(2);
    });

    it('应该将 abc.baidu.com 匹配到 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('abc.baidu.com');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('abc.baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('baidu.com');
    });

    it('应该将 www.abc.baidu.com 匹配到 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('www.abc.baidu.com');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.abc.baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('baidu.com');
    });
  });

  describe('URL 解析', () => {
    it('应该从 https://www.baidu.com/a/v 中提取域名并匹配', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('https://www.baidu.com/a/v');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.baidu.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('baidu.com');
    });

    it('应该从 http://abc.baidu.com/path?query=1 中提取域名并匹配', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('http://abc.baidu.com/path?query=1');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
    });

    it('应该从 https://www.baidu.com:8080/path 中提取域名并匹配', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('https://www.baidu.com:8080/path');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.baidu.com');
    });
  });

  describe('大小写不敏感', () => {
    it('应该将 WWW.BAIDU.COM 匹配到 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('WWW.BAIDU.COM');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.baidu.com');
    });

    it('应该将 HTTPS://WWW.BAIDU.COM/PATH 匹配到 baidu.com', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('HTTPS://WWW.BAIDU.COM/PATH');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
    });
  });

  describe('不存在的域名', () => {
    it('应该返回 null 当域名不存在时', async () => {
      mockDomainRepository.findByDomain.mockResolvedValue(null);

      const result = await domainService.getByDomain('notexist.com');

      expect(result).toBeNull();
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('notexist.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledTimes(1);
    });

    it('应该返回 null 当子域名和根域名都不存在时', async () => {
      mockDomainRepository.findByDomain.mockResolvedValue(null);

      const result = await domainService.getByDomain('www.notexist.com');

      expect(result).toBeNull();
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('www.notexist.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('notexist.com');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledTimes(2);
    });
  });

  describe('边界情况', () => {
    it('应该处理只有一个部分的域名', async () => {
      mockDomainRepository.findByDomain.mockResolvedValue(null);

      const result = await domainService.getByDomain('localhost');

      expect(result).toBeNull();
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledWith('localhost');
      expect(mockDomainRepository.findByDomain).toHaveBeenCalledTimes(1);
    });

    it('应该处理带有多个路径的 URL', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('https://www.baidu.com/a/b/c/d?x=1&y=2#anchor');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
    });

    it('应该处理空格', async () => {
      const mockDomain = {
        id: 1,
        domain: 'baidu.com',
        configId: 1,
        config: { id: 1, title: 'Baidu', author: null, description: null, keywords: null, links: null, permissions: null },
      };

      mockDomainRepository.findByDomain
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDomain as any);

      const result = await domainService.getByDomain('  www.baidu.com  ');

      expect(result).toBeTruthy();
      expect(result?.domain).toBe('baidu.com');
      expect(result?.config?.title).toBe('Baidu');
    });
  });
});
