/**
 * DomainService 属性测试
 * 
 * 使用 fast-check 进行基于属性的测试，验证 DomainService 的正确性属性
 * 
 * **Validates: Requirements 1.1, 3.1, 3.2, 3.3, 3.5, 3.7**
 */

import fc from 'fast-check';
import { DomainService, DomainInput } from './DomainService';
import { IDomainRepository, Pagination } from '../repositories/DomainRepository';
import { ICacheService } from './CacheService';
import { Domain } from '../models/Domain';
import { ConflictError } from '../errors/ConflictError';

// Mock 日志模块
jest.mock('../config/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('DomainService - Property Tests', () => {
  let service: DomainService;
  let mockRepository: jest.Mocked<IDomainRepository>;
  let mockCache: jest.Mocked<ICacheService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建 mock repository
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDomain: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    // 创建 mock cache service
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      isEnabled: jest.fn(),
    };

    // 创建服务实例
    service = new DomainService(mockRepository, mockCache);
  });

  /**
   * 域名生成器
   * 生成有效的域名字符串（1-255字符）
   */
  const domainArbitrary = fc.string({ minLength: 1, maxLength: 255 })
    .filter(s => s.trim().length > 0);

  /**
   * 可选字符串生成器（最大255字符）
   */
  const optionalStringArbitrary = fc.option(
    fc.string({ maxLength: 255 }),
    { nil: null }
  );

  /**
   * 域名配置输入生成器
   */
  const domainInputArbitrary = fc.record({
    domain: domainArbitrary,
    title: optionalStringArbitrary,
    author: optionalStringArbitrary,
    description: optionalStringArbitrary,
    keywords: optionalStringArbitrary,
    links: fc.option(
      fc.dictionary(fc.string(), fc.string()),
      { nil: null }
    ),
  });

  /**
   * ID 生成器
   */
  const idArbitrary = fc.integer({ min: 1, max: 1000000 });

  /**
   * 分页参数生成器
   */
  const paginationArbitrary = fc.record({
    page: fc.integer({ min: 1, max: 100 }),
    pageSize: fc.integer({ min: 1, max: 100 }),
  });

  /**
   * 辅助函数：将 DomainInput 转换为 Domain 实体
   */
  const toDomainEntity = (id: number, input: DomainInput): Domain => {
    return {
      id,
      domain: input.domain,
      title: input.title ?? null,
      author: input.author ?? null,
      description: input.description ?? null,
      keywords: input.keywords ?? null,
      links: input.links ?? null,
    } as Domain;
  };

  describe('Property 1: 域名查询往返一致性', () => {
    /**
     * **Validates: Requirements 1.1, 3.1**
     * 
     * 属性: 对于任意有效的域名配置数据，创建该配置后通过域名查询，
     * 返回的数据应与创建时的输入数据一致（id 除外）
     * 
     * 这验证了：
     * - 1.1: 调用者请求一个存在的域名配置时返回完整配置信息
     * - 3.1: 创建新的域名配置时在数据库中创建记录并返回创建的配置
     */
    it('创建后通过域名查询应返回相同数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          idArbitrary,
          async (input, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟创建流程
            mockRepository.findByDomain.mockResolvedValueOnce(null); // 域名不存在
            const createdDomain = toDomainEntity(id, input);
            mockRepository.create.mockResolvedValue(createdDomain);

            // 创建域名配置
            const created = await service.create(input);

            // 验证创建返回的数据
            expect(created.domain).toBe(input.domain);
            expect(created.title).toBe(input.title ?? null);
            expect(created.author).toBe(input.author ?? null);
            expect(created.description).toBe(input.description ?? null);
            expect(created.keywords).toBe(input.keywords ?? null);
            expect(created.links).toEqual(input.links ?? null);

            // 模拟查询流程（缓存未命中）
            mockCache.get.mockResolvedValue(null);
            mockRepository.findByDomain.mockResolvedValue(createdDomain);

            // 通过域名查询
            const retrieved = await service.getByDomain(input.domain);

            // 验证查询返回的数据与创建时一致
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.domain).toBe(created.domain);
            expect(retrieved!.title).toBe(created.title);
            expect(retrieved!.author).toBe(created.author);
            expect(retrieved!.description).toBe(created.description);
            expect(retrieved!.keywords).toBe(created.keywords);
            expect(retrieved!.links).toEqual(created.links);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 1.1, 3.1**
     * 
     * 属性: 对于任意有效的域名配置数据，创建该配置后通过 ID 查询，
     * 返回的数据应与创建时的输入数据一致
     */
    it('创建后通过 ID 查询应返回相同数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          idArbitrary,
          async (input, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟创建流程
            mockRepository.findByDomain.mockResolvedValue(null);
            const createdDomain = toDomainEntity(id, input);
            mockRepository.create.mockResolvedValue(createdDomain);

            // 创建域名配置
            const created = await service.create(input);

            // 模拟通过 ID 查询
            mockRepository.findById.mockResolvedValue(createdDomain);

            // 通过 ID 查询
            const retrieved = await service.getById(created.id);

            // 验证查询返回的数据与创建时一致
            expect(retrieved).not.toBeNull();
            expect(retrieved).toEqual(created);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: 重复域名返回 409', () => {
    /**
     * **Validates: Requirements 3.2**
     * 
     * 属性: 对于任意已存在的域名，尝试创建相同域名的配置应返回 409 冲突状态码
     * 
     * 这验证了：
     * - 3.2: 创建域名配置时域名已存在则返回 409 冲突状态码
     */
    it('尝试创建已存在的域名应抛出 ConflictError', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          idArbitrary,
          async (input, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟域名已存在
            const existingDomain = toDomainEntity(id, input);
            mockRepository.findByDomain.mockResolvedValue(existingDomain);

            // 尝试创建相同域名的配置
            await expect(service.create(input)).rejects.toThrow(ConflictError);
            await expect(service.create(input)).rejects.toThrow(`域名 '${input.domain}' 已存在`);

            // 验证没有调用 create 方法
            expect(mockRepository.create).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.2**
     * 
     * 属性: 对于任意两个不同的域名配置，如果域名相同，第二次创建应失败
     */
    it('连续创建相同域名应在第二次失败', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          domainInputArbitrary,
          idArbitrary,
          async (input1, input2, id) => {
            // 确保域名相同但其他字段可能不同
            const input2WithSameDomain = { ...input2, domain: input1.domain };

            // 重置 mocks
            jest.clearAllMocks();

            // 第一次创建成功
            mockRepository.findByDomain.mockResolvedValueOnce(null);
            const createdDomain = toDomainEntity(id, input1);
            mockRepository.create.mockResolvedValue(createdDomain);

            await service.create(input1);

            // 第二次创建相同域名应失败
            mockRepository.findByDomain.mockResolvedValue(createdDomain);

            await expect(service.create(input2WithSameDomain)).rejects.toThrow(ConflictError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: 更新操作正确性', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * 属性: 对于任意存在的域名配置和有效的更新数据，更新后查询应返回更新后的数据
     * 
     * 这验证了：
     * - 3.3: 更新域名配置时提供有效数据则更新数据库记录并返回更新后的配置
     */
    it('更新后查询应返回更新后的数据', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          fc.record({
            title: optionalStringArbitrary,
            author: optionalStringArbitrary,
            description: optionalStringArbitrary,
            keywords: optionalStringArbitrary,
            links: fc.option(
              fc.dictionary(fc.string(), fc.string()),
              { nil: null }
            ),
          }),
          idArbitrary,
          async (originalInput, updateData, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 创建原始域名配置
            const originalDomain = toDomainEntity(id, originalInput);

            // 创建更新后的域名配置
            // 注意：只有在 updateData 中明确提供的字段才会被更新
            const updatedDomain = {
              ...originalDomain,
              ...(updateData.title !== undefined && { title: updateData.title }),
              ...(updateData.author !== undefined && { author: updateData.author }),
              ...(updateData.description !== undefined && { description: updateData.description }),
              ...(updateData.keywords !== undefined && { keywords: updateData.keywords }),
              ...(updateData.links !== undefined && { links: updateData.links }),
            } as Domain;

            // 模拟更新操作
            mockRepository.update.mockResolvedValue(updatedDomain);

            // 执行更新
            const updated = await service.update(id, updateData);

            // 验证更新返回的数据
            expect(updated).not.toBeNull();
            expect(updated!.id).toBe(id);
            expect(updated!.domain).toBe(originalInput.domain);

            // 验证更新的字段与 updatedDomain 一致
            expect(updated!.title).toBe(updatedDomain.title);
            expect(updated!.author).toBe(updatedDomain.author);
            expect(updated!.description).toBe(updatedDomain.description);
            expect(updated!.keywords).toBe(updatedDomain.keywords);
            expect(updated!.links).toEqual(updatedDomain.links);

            // 验证缓存失效被调用
            expect(mockCache.delete).toHaveBeenCalledWith(originalInput.domain);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.3, 3.4**
     * 
     * 属性: 对于任意不存在的 ID，更新操作应返回 null
     */
    it('更新不存在的域名配置应返回 null', async () => {
      await fc.assert(
        fc.asyncProperty(
          idArbitrary,
          fc.record({
            title: optionalStringArbitrary,
          }),
          async (id, updateData) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟域名配置不存在
            mockRepository.update.mockResolvedValue(null);

            // 执行更新
            const result = await service.update(id, updateData);

            // 验证返回 null
            expect(result).toBeNull();

            // 验证缓存失效没有被调用
            expect(mockCache.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: 删除操作正确性', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * 属性: 对于任意存在的域名配置，删除后查询应返回 null
     * 
     * 这验证了：
     * - 3.5: 删除域名配置时从数据库中移除记录并返回成功响应
     */
    it('删除后查询应返回 null', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          idArbitrary,
          async (input, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 创建域名配置
            const domain = toDomainEntity(id, input);

            // 模拟删除操作
            mockRepository.findById.mockResolvedValueOnce(domain); // 查询存在
            mockRepository.delete.mockResolvedValue(true);

            // 执行删除
            const deleted = await service.delete(id);

            // 验证删除成功
            expect(deleted).toBe(true);

            // 验证缓存失效被调用
            expect(mockCache.delete).toHaveBeenCalledWith(input.domain);

            // 模拟删除后查询
            mockRepository.findById.mockResolvedValue(null);
            const retrieved = await service.getById(id);

            // 验证查询返回 null
            expect(retrieved).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.6**
     * 
     * 属性: 对于任意不存在的 ID，删除操作应返回 false
     */
    it('删除不存在的域名配置应返回 false', async () => {
      await fc.assert(
        fc.asyncProperty(
          idArbitrary,
          async (id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟域名配置不存在
            mockRepository.findById.mockResolvedValue(null);

            // 执行删除
            const result = await service.delete(id);

            // 验证返回 false
            expect(result).toBe(false);

            // 验证没有调用 delete 方法
            expect(mockRepository.delete).not.toHaveBeenCalled();

            // 验证缓存失效没有被调用
            expect(mockCache.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.5**
     * 
     * 属性: 删除操作应使缓存失效
     */
    it('删除操作应使对应域名的缓存失效', async () => {
      await fc.assert(
        fc.asyncProperty(
          domainInputArbitrary,
          idArbitrary,
          async (input, id) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 创建域名配置
            const domain = toDomainEntity(id, input);

            // 模拟删除操作
            mockRepository.findById.mockResolvedValue(domain);
            mockRepository.delete.mockResolvedValue(true);

            // 执行删除
            await service.delete(id);

            // 验证缓存失效被调用，且使用正确的域名
            expect(mockCache.delete).toHaveBeenCalledWith(input.domain);
            expect(mockCache.delete).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: 分页功能正确性', () => {
    /**
     * **Validates: Requirements 3.7**
     * 
     * 属性: 对于任意有效的分页参数（page, pageSize），返回的数据条数应不超过 pageSize，
     * 且 pagination 信息应正确反映总数和总页数
     * 
     * 这验证了：
     * - 3.7: 查询域名配置列表时支持分页参数（page、pageSize）
     */
    it('返回的数据条数应不超过 pageSize', async () => {
      await fc.assert(
        fc.asyncProperty(
          paginationArbitrary,
          fc.array(domainInputArbitrary, { minLength: 0, maxLength: 200 }),
          async (pagination, inputs) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 创建域名实体列表
            const domains = inputs.map((input, index) => 
              toDomainEntity(index + 1, input)
            );

            // 计算当前页应返回的数据
            const offset = (pagination.page - 1) * pagination.pageSize;
            const pageData = domains.slice(offset, offset + pagination.pageSize);

            // 模拟分页查询
            mockRepository.findAll.mockResolvedValue(pageData);
            mockRepository.count.mockResolvedValue(domains.length);

            // 执行查询
            const result = await service.list(pagination);

            // 验证返回的数据条数不超过 pageSize
            expect(result.data.length).toBeLessThanOrEqual(pagination.pageSize);

            // 验证分页信息
            expect(result.pagination.page).toBe(pagination.page);
            expect(result.pagination.pageSize).toBe(pagination.pageSize);
            expect(result.pagination.total).toBe(domains.length);

            // 验证总页数计算正确
            const expectedTotalPages = Math.ceil(domains.length / pagination.pageSize);
            expect(result.pagination.totalPages).toBe(expectedTotalPages);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.7**
     * 
     * 属性: 分页信息应正确反映总数和总页数
     */
    it('分页信息应正确计算总页数', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // pageSize
          fc.integer({ min: 0, max: 1000 }), // total
          async (pageSize, total) => {
            // 重置 mocks
            jest.clearAllMocks();

            const pagination: Pagination = { page: 1, pageSize };

            // 模拟查询
            mockRepository.findAll.mockResolvedValue([]);
            mockRepository.count.mockResolvedValue(total);

            // 执行查询
            const result = await service.list(pagination);

            // 验证总页数计算正确
            const expectedTotalPages = Math.ceil(total / pageSize);
            expect(result.pagination.totalPages).toBe(expectedTotalPages);
            expect(result.pagination.total).toBe(total);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.7**
     * 
     * 属性: 当总数为 0 时，应返回空列表且总页数为 0
     */
    it('当没有数据时应返回空列表', async () => {
      await fc.assert(
        fc.asyncProperty(
          paginationArbitrary,
          async (pagination) => {
            // 重置 mocks
            jest.clearAllMocks();

            // 模拟空数据
            mockRepository.findAll.mockResolvedValue([]);
            mockRepository.count.mockResolvedValue(0);

            // 执行查询
            const result = await service.list(pagination);

            // 验证返回空列表
            expect(result.data).toEqual([]);
            expect(result.pagination.total).toBe(0);
            expect(result.pagination.totalPages).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **Validates: Requirements 3.7**
     * 
     * 属性: 对于任意页码，返回的数据应该是正确的子集
     */
    it('不同页码应返回不同的数据子集', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 5, max: 20 }), // pageSize
          fc.array(domainInputArbitrary, { minLength: 10, maxLength: 50 }),
          async (pageSize, inputs) => {
            // 创建域名实体列表
            const domains = inputs.map((input, index) => 
              toDomainEntity(index + 1, input)
            );

            const totalPages = Math.ceil(domains.length / pageSize);

            // 测试前两页（如果存在）
            for (let page = 1; page <= Math.min(2, totalPages); page++) {
              // 重置 mocks
              jest.clearAllMocks();

              const pagination: Pagination = { page, pageSize };
              const offset = (page - 1) * pageSize;
              const pageData = domains.slice(offset, offset + pageSize);

              // 模拟分页查询
              mockRepository.findAll.mockResolvedValue(pageData);
              mockRepository.count.mockResolvedValue(domains.length);

              // 执行查询
              const result = await service.list(pagination);

              // 验证返回的数据是正确的子集
              expect(result.data.length).toBe(pageData.length);
              expect(result.pagination.page).toBe(page);

              // 验证 repository 被调用时使用了正确的分页参数
              expect(mockRepository.findAll).toHaveBeenCalledWith(pagination);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
