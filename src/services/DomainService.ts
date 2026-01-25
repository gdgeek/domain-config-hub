/**
 * DomainService
 * 
 * 域名业务逻辑层
 * 处理域名相关的业务逻辑，支持配置关联
 */

import { DomainRepository } from '../repositories/DomainRepository';
import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainAttributes } from '../models/Domain';
import { ConflictError } from '../errors/ConflictError';
import { NotFoundError } from '../errors/NotFoundError';
import { logger } from '../config/logger';

/**
 * 域名输入接口
 */
export interface DomainInput {
  domain: string;
  configId: number;
  homepage?: string | null;
}

/**
 * 域名输出接口
 */
export interface DomainOutput {
  id: number;
  domain: string;
  homepage?: string | null;
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
 * DomainService 类
 */
export class DomainService {
  constructor(
    private domainRepository: DomainRepository,
    private configRepository: ConfigRepository
  ) {}

  /**
   * 创建域名
   */
  async create(input: DomainInput): Promise<DomainOutput> {
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
  async getById(id: number): Promise<DomainOutput | null> {
    logger.info('查询域名', { id });

    const domain = await this.domainRepository.findById(id);
    if (!domain) {
      return null;
    }

    return this.toOutput(domain);
  }

  /**
   * 从 URL 或域名字符串中提取纯域名
   * 例如：
   * - https://www.baidu.com/a/v -> www.baidu.com
   * - www.baidu.com -> www.baidu.com
   * - baidu.com -> baidu.com
   */
  private extractDomain(input: string): string {
    let domain = input.trim().toLowerCase();
    
    // 移除协议（http://, https://）
    domain = domain.replace(/^https?:\/\//i, '');
    
    // 移除路径、查询参数和锚点
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    domain = domain.split('#')[0];
    
    // 移除端口号
    domain = domain.split(':')[0];
    
    return domain;
  }

  /**
   * 从完整域名中提取根域名
   * 例如：
   * - www.baidu.com -> baidu.com
   * - abc.baidu.com -> baidu.com
   * - baidu.com -> baidu.com
   * - www.abc.baidu.com -> baidu.com
   */
  private extractRootDomain(domain: string): string {
    const parts = domain.split('.');
    
    // 如果只有一个部分，直接返回
    if (parts.length <= 1) {
      return domain;
    }
    
    // 如果有两个部分，直接返回（已经是根域名）
    if (parts.length === 2) {
      return domain;
    }
    
    // 如果有三个或更多部分，返回最后两个部分
    // 例如：www.baidu.com -> baidu.com
    // 例如：abc.def.baidu.com -> baidu.com
    return parts.slice(-2).join('.');
  }

  /**
   * 通过域名获取（支持智能匹配）
   * 
   * 匹配逻辑：
   * 1. 首先尝试精确匹配输入的域名
   * 2. 如果没找到，提取根域名再次查询
   * 
   * 示例：
   * - 数据库中有 baidu.com
   * - 查询 www.baidu.com -> 匹配到 baidu.com
   * - 查询 abc.baidu.com -> 匹配到 baidu.com
   * - 查询 https://www.baidu.com/a/v -> 匹配到 baidu.com
   * 
   * @returns 返回域名信息 + config 数据
   */
  async getByDomain(input: string): Promise<any | null> {
    // 提取纯域名（移除协议、路径等）
    const cleanDomain = this.extractDomain(input);
    
    logger.info('通过域名查询', { 
      originalInput: input,
      cleanDomain,
    });

    // 1. 首先尝试精确匹配
    let domainRecord = await this.domainRepository.findByDomain(cleanDomain);
    
    if (domainRecord) {
      logger.info('精确匹配成功', { domain: cleanDomain });
      return this.formatDomainResponse(domainRecord);
    }

    // 2. 如果精确匹配失败，尝试匹配根域名
    const rootDomain = this.extractRootDomain(cleanDomain);
    
    // 如果根域名和清理后的域名相同，说明已经是根域名了，不需要再查询
    if (rootDomain === cleanDomain) {
      logger.info('域名不存在', { domain: cleanDomain });
      return null;
    }
    
    logger.info('尝试根域名匹配', { 
      cleanDomain,
      rootDomain,
    });
    
    domainRecord = await this.domainRepository.findByDomain(rootDomain);
    
    if (domainRecord) {
      logger.info('根域名匹配成功', { 
        inputDomain: cleanDomain,
        matchedDomain: rootDomain,
      });
      return this.formatDomainResponse(domainRecord);
    }

    logger.info('域名不存在', { 
      cleanDomain,
      rootDomain,
    });
    return null;
  }

  /**
   * 格式化域名响应，返回域名信息 + config 数据（嵌套结构）
   */
  private formatDomainResponse(domainRecord: any): any {
    if (!domainRecord) {
      return null;
    }

    // 如果是 Sequelize 实例，转换为纯对象
    const plainDomain = domainRecord.get ? domainRecord.get({ plain: true }) : domainRecord;
    
    // 提取 config 并清理
    const config = plainDomain.config ? this.sanitizeConfig(plainDomain.config) : null;
    
    // 返回嵌套结构
    return {
      domain: plainDomain.domain,
      homepage: plainDomain.homepage || null,
      config: config,
    };
  }

  /**
   * 清理 config 对象，移除时间戳和 ID 字段
   */
  private sanitizeConfig(config: any): any {
    if (!config) {
      return null;
    }

    // 如果是 Sequelize 实例，转换为纯对象
    const plainConfig = config.get ? config.get({ plain: true }) : config;

    // 创建新对象，排除 id, createdAt 和 updatedAt
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...cleanConfig } = plainConfig;
    return cleanConfig;
  }

  /**
   * 获取域名列表（分页）
   */
  async list(pagination: Pagination): Promise<PaginatedResult<DomainOutput>> {
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
  async update(id: number, input: Partial<DomainInput>): Promise<DomainOutput | null> {
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
   * 将 Domain 模型转换为输出格式
   */
  private toOutput(domain: DomainAttributes): DomainOutput {
    const output: DomainOutput = {
      id: domain.id,
      domain: domain.domain,
      homepage: domain.homepage,
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

export default new DomainService(
  require('../repositories/DomainRepository').default,
  require('../repositories/ConfigRepository').default
);
