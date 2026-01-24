/**
 * DomainV2Service
 * 
 * 域名业务逻辑层（双表版本）
 * 处理域名相关的业务逻辑，支持配置关联
 */

import { DomainV2Repository } from '../repositories/DomainV2Repository';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainV2Attributes } from '../models/DomainV2';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { logger } from '../config/logger';

/**
 * 域名输入接口
 */
export interface DomainV2Input {
  domain: string;
  configId: number;
}

/**
 * 域名输出接口
 */
export interface DomainV2Output {
  id: number;
  domain: string;
  configId: number;
  config?: {
    id: number;
    title: string | null;
    author: string | null;
    description: string | null;
    keywords: string | null;
    links: object | null;
    permissions: object | null;
  };
  createdAt?: Date;
  updatedAt?: Date;
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
 * 分页参数接口
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * DomainV2Service 类
 */
export class DomainV2Service {
  constructor(
    private domainRepository: DomainV2Repository,
    private configRepository: ConfigRepository
  ) {}

  /**
   * 创建域名
   */
  async create(input: DomainV2Input): Promise<DomainV2Output> {
    logger.info('创建域名', { input });

    // 检查域名是否已存在
    const existing = await this.domainRepository.findByDomain(input.domain);
    if (existing) {
      throw new ConflictError('域名已存在', 'DOMAIN_ALREADY_EXISTS');
    }

    // 检查配置是否存在
    const config = await this.configRepository.findById(input.configId);
    if (!config) {
      throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
    }

    const domain = await this.domainRepository.create(input);
    
    // 重新加载以包含关联的配置
    const domainWithConfig = await this.domainRepository.findById(domain.id);
    return this.toOutput(domainWithConfig!);
  }

  /**
   * 通过 ID 获取域名
   */
  async getById(id: number): Promise<DomainV2Output | null> {
    logger.info('查询域名', { id });

    const domain = await this.domainRepository.findById(id);
    if (!domain) {
      return null;
    }

    return this.toOutput(domain);
  }

  /**
   * 通过域名获取
   */
  async getByDomain(domain: string): Promise<DomainV2Output | null> {
    logger.info('通过域名查询', { domain });

    const domainRecord = await this.domainRepository.findByDomain(domain);
    if (!domainRecord) {
      return null;
    }

    return this.toOutput(domainRecord);
  }

  /**
   * 获取域名列表（分页）
   */
  async list(pagination: Pagination): Promise<PaginatedResult<DomainV2Output>> {
    logger.info('查询域名列表', { pagination });

    const [domains, total] = await Promise.all([
      this.domainRepository.findAll(pagination),
      this.domainRepository.count(),
    ]);

    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: domains.map(domain => this.toOutput(domain)),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * 更新域名
   */
  async update(id: number, input: Partial<DomainV2Input>): Promise<DomainV2Output | null> {
    logger.info('更新域名', { id, input });

    // 如果要更新 configId，检查配置是否存在
    if (input.configId !== undefined) {
      const config = await this.configRepository.findById(input.configId);
      if (!config) {
        throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
      }
    }

    const domain = await this.domainRepository.update(id, input);
    if (!domain) {
      return null;
    }

    return this.toOutput(domain);
  }

  /**
   * 删除域名
   */
  async delete(id: number): Promise<boolean> {
    logger.info('删除域名', { id });

    const deleted = await this.domainRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('域名不存在', 'DOMAIN_NOT_FOUND');
    }

    return true;
  }

  /**
   * 将 DomainV2 模型转换为输出格式
   */
  private toOutput(domain: DomainV2Attributes): DomainV2Output {
    const output: DomainV2Output = {
      id: domain.id,
      domain: domain.domain,
      configId: domain.configId,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };

    // 如果包含关联的配置，添加到输出
    if (domain.config) {
      output.config = {
        id: domain.config.id,
        title: domain.config.title,
        author: domain.config.author,
        description: domain.config.description,
        keywords: domain.config.keywords,
        links: domain.config.links,
        permissions: domain.config.permissions,
      };
    }

    return output;
  }
}

export default new DomainV2Service(
  require('../repositories/DomainV2Repository').default,
  require('../repositories/ConfigRepository').default
);
