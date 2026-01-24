/**
 * DomainService
 * 
 * 业务逻辑层，负责处理域名配置的业务规则和数据转换
 * 协调 Repository 和 Cache 层的操作
 * 
 * 需求: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.5, 3.7
 */

import { Domain } from '../models/Domain';
import { IDomainRepository, Pagination } from '../repositories/DomainRepository';
import { ICacheService } from './CacheService';
import { ConflictError } from '../errors/ConflictError';
import { DatabaseError } from '../errors/DatabaseError';
import { logger } from '../config/logger';

/**
 * 域名配置输入接口
 * 用于创建和更新操作
 */
export interface DomainInput {
  domain: string;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  keywords?: string | null;
  links?: object | null;
}

/**
 * 域名配置输出接口
 * 用于返回给客户端的数据格式
 */
export interface DomainOutput {
  id: number;
  domain: string;
  title: string | null;
  author: string | null;
  description: string | null;
  keywords: string | null;
  links: object | null;
}

/**
 * 分页结果接口
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * DomainService 接口
 */
export interface IDomainService {
  create(input: DomainInput): Promise<DomainOutput>;
  getById(id: number): Promise<DomainOutput | null>;
  getByDomain(domain: string): Promise<DomainOutput | null>;
  list(pagination: Pagination): Promise<PaginatedResult<DomainOutput>>;
  update(id: number, input: Partial<DomainInput>): Promise<DomainOutput | null>;
  delete(id: number): Promise<boolean>;
}

/**
 * DomainService 实现类
 * 
 * 提供域名配置的业务逻辑处理
 * 包含缓存管理、数据转换和业务规则验证
 */
export class DomainService implements IDomainService {
  constructor(
    private readonly repository: IDomainRepository,
    private readonly cache: ICacheService
  ) {}

  /**
   * 将 Domain 实体转换为输出格式
   * 
   * @param domain - Domain 实体
   * @returns DomainOutput 对象
   */
  private toOutput(domain: Domain): DomainOutput {
    return {
      id: domain.id,
      domain: domain.domain,
      title: domain.title,
      author: domain.author,
      description: domain.description,
      keywords: domain.keywords,
      links: domain.links,
    };
  }

  /**
   * 创建新的域名配置
   * 
   * 需求 3.1: WHEN 创建新的域名配置时提供有效数据 THEN Domain_Config_Service SHALL 在数据库中创建记录并返回创建的配置
   * 需求 3.2: WHEN 创建域名配置时域名已存在 THEN Domain_Config_Service SHALL 返回 409 冲突状态码
   * 
   * @param input - 域名配置输入数据
   * @returns 创建的域名配置
   * @throws ConflictError - 域名已存在时抛出
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async create(input: DomainInput): Promise<DomainOutput> {
    try {
      // 检查域名是否已存在
      const existing = await this.repository.findByDomain(input.domain);
      if (existing) {
        logger.warn('尝试创建已存在的域名配置', { domain: input.domain });
        throw new ConflictError(`域名 '${input.domain}' 已存在`, 'DUPLICATE_DOMAIN');
      }

      // 创建域名配置
      const domain = await this.repository.create(input);
      
      logger.info('域名配置创建成功', { id: domain.id, domain: domain.domain });
      
      return this.toOutput(domain);
    } catch (error) {
      // 如果是已知错误类型，直接抛出
      if (error instanceof ConflictError || error instanceof DatabaseError) {
        throw error;
      }
      
      // 处理数据库唯一约束冲突（Repository 可能抛出的 DatabaseError）
      if (error instanceof DatabaseError && error.code === 'DUPLICATE_DOMAIN') {
        throw new ConflictError(`域名 '${input.domain}' 已存在`, 'DUPLICATE_DOMAIN');
      }
      
      // 其他未知错误
      logger.error('创建域名配置失败', { error, input });
      throw new DatabaseError('创建域名配置失败', 'DATABASE_ERROR');
    }
  }

  /**
   * 通过 ID 获取域名配置
   * 
   * 需求 1.1: WHEN 调用者请求一个存在的域名配置 THEN Domain_Config_Service SHALL 返回该域名的完整配置信息
   * 需求 1.2: WHEN 调用者请求一个不存在的域名配置 THEN Domain_Config_Service SHALL 返回 404 状态码
   * 
   * @param id - 域名配置 ID
   * @returns 域名配置或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async getById(id: number): Promise<DomainOutput | null> {
    try {
      const domain = await this.repository.findById(id);
      
      if (!domain) {
        logger.debug('域名配置不存在', { id });
        return null;
      }
      
      return this.toOutput(domain);
    } catch (error) {
      logger.error('查询域名配置失败', { error, id });
      throw error;
    }
  }

  /**
   * 通过域名获取配置（含缓存逻辑）
   * 
   * 需求 1.1: WHEN 调用者请求一个存在的域名配置 THEN Domain_Config_Service SHALL 返回该域名的完整配置信息
   * 需求 1.2: WHEN 调用者请求一个不存在的域名配置 THEN Domain_Config_Service SHALL 返回 404 状态码
   * 需求 2.1: WHERE Redis 缓存已启用，WHEN 查询域名配置 THEN Cache_Layer SHALL 首先检查缓存是否存在该域名的配置
   * 需求 2.2: WHERE Redis 缓存已启用，WHEN 缓存命中 THEN Domain_Config_Service SHALL 直接返回缓存数据而不查询数据库
   * 需求 2.3: WHERE Redis 缓存已启用，WHEN 缓存未命中 THEN Domain_Config_Service SHALL 查询数据库并将结果存入缓存
   * 
   * @param domain - 域名
   * @returns 域名配置或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async getByDomain(domain: string): Promise<DomainOutput | null> {
    try {
      // 尝试从缓存获取
      const cached = await this.cache.get<DomainOutput>(domain);
      if (cached) {
        logger.debug('从缓存返回域名配置', { domain });
        return cached;
      }

      // 缓存未命中，从数据库查询
      const domainEntity = await this.repository.findByDomain(domain);
      
      if (!domainEntity) {
        logger.debug('域名配置不存在', { domain });
        return null;
      }
      
      const output = this.toOutput(domainEntity);
      
      // 存入缓存
      await this.cache.set(domain, output);
      
      logger.debug('从数据库返回域名配置并缓存', { domain });
      return output;
    } catch (error) {
      logger.error('查询域名配置失败', { error, domain });
      throw error;
    }
  }

  /**
   * 获取域名配置列表（分页）
   * 
   * 需求 3.7: WHEN 查询域名配置列表 THEN Domain_Config_Service SHALL 支持分页参数（page、pageSize）
   * 
   * @param pagination - 分页参数
   * @returns 分页结果
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async list(pagination: Pagination): Promise<PaginatedResult<DomainOutput>> {
    try {
      // 并行查询数据和总数
      const [domains, total] = await Promise.all([
        this.repository.findAll(pagination),
        this.repository.count(),
      ]);

      // 转换为输出格式
      const data = domains.map(domain => this.toOutput(domain));

      // 计算总页数
      const totalPages = Math.ceil(total / pagination.pageSize);

      logger.debug('查询域名配置列表成功', {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      });

      return {
        data,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('查询域名配置列表失败', { error, pagination });
      throw error;
    }
  }

  /**
   * 更新域名配置（含缓存失效）
   * 
   * 需求 3.3: WHEN 更新域名配置时提供有效数据 THEN Domain_Config_Service SHALL 更新数据库记录并返回更新后的配置
   * 需求 3.4: WHEN 更新不存在的域名配置 THEN Domain_Config_Service SHALL 返回 404 状态码
   * 需求 2.4: WHERE Redis 缓存已启用，WHEN 域名配置被更新或删除 THEN Cache_Layer SHALL 使该域名的缓存失效
   * 
   * @param id - 域名配置 ID
   * @param input - 要更新的数据
   * @returns 更新后的域名配置或 null（不存在时）
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async update(id: number, input: Partial<DomainInput>): Promise<DomainOutput | null> {
    try {
      // 更新数据库
      const domain = await this.repository.update(id, input);
      
      if (!domain) {
        logger.debug('域名配置不存在，无法更新', { id });
        return null;
      }

      // 使缓存失效
      await this.cache.delete(domain.domain);
      
      logger.info('域名配置更新成功', { id, domain: domain.domain });
      
      return this.toOutput(domain);
    } catch (error) {
      logger.error('更新域名配置失败', { error, id, input });
      throw error;
    }
  }

  /**
   * 删除域名配置（含缓存失效）
   * 
   * 需求 3.5: WHEN 删除域名配置 THEN Domain_Config_Service SHALL 从数据库中移除记录并返回成功响应
   * 需求 3.6: WHEN 删除不存在的域名配置 THEN Domain_Config_Service SHALL 返回 404 状态码
   * 需求 2.4: WHERE Redis 缓存已启用，WHEN 域名配置被更新或删除 THEN Cache_Layer SHALL 使该域名的缓存失效
   * 
   * @param id - 域名配置 ID
   * @returns true（删除成功）或 false（不存在）
   * @throws DatabaseError - 数据库操作失败时抛出
   */
  async delete(id: number): Promise<boolean> {
    try {
      // 先查询域名配置以获取域名（用于缓存失效）
      const domain = await this.repository.findById(id);
      
      if (!domain) {
        logger.debug('域名配置不存在，无法删除', { id });
        return false;
      }

      // 删除数据库记录
      const deleted = await this.repository.delete(id);
      
      if (deleted) {
        // 使缓存失效
        await this.cache.delete(domain.domain);
        
        logger.info('域名配置删除成功', { id, domain: domain.domain });
      }
      
      return deleted;
    } catch (error) {
      logger.error('删除域名配置失败', { error, id });
      throw error;
    }
  }
}

/**
 * 导出默认实例
 * 注意：实际使用时应通过依赖注入传入 repository 和 cache
 */
export default DomainService;
