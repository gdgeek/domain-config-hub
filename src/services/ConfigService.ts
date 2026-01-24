/**
 * ConfigService
 * 
 * 配置业务逻辑层
 * 处理配置相关的业务逻辑
 */

import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainV2Repository } from '../repositories/DomainV2Repository';
import { ConfigAttributes } from '../models/Config';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { logger } from '../config/logger';

/**
 * 配置输入接口
 */
export interface ConfigInput {
  title?: string | null;
  author?: string | null;
  description?: string | null;
  keywords?: string | null;
  links?: object | null;
  permissions?: object | null;
}

/**
 * 配置输出接口
 */
export interface ConfigOutput {
  id: number;
  title: string | null;
  author: string | null;
  description: string | null;
  keywords: string | null;
  links: object | null;
  permissions: object | null;
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
 * ConfigService 类
 */
export class ConfigService {
  constructor(
    private configRepository: ConfigRepository,
    private domainRepository: DomainV2Repository
  ) {}

  /**
   * 创建配置
   */
  async create(input: ConfigInput): Promise<ConfigOutput> {
    logger.info('创建配置', { input });

    const config = await this.configRepository.create(input);
    return this.toOutput(config);
  }

  /**
   * 通过 ID 获取配置
   */
  async getById(id: number): Promise<ConfigOutput | null> {
    logger.info('查询配置', { id });

    const config = await this.configRepository.findById(id);
    if (!config) {
      return null;
    }

    return this.toOutput(config);
  }

  /**
   * 获取配置列表（分页）
   */
  async list(pagination: Pagination): Promise<PaginatedResult<ConfigOutput>> {
    logger.info('查询配置列表', { pagination });

    const [configs, total] = await Promise.all([
      this.configRepository.findAll(pagination),
      this.configRepository.count(),
    ]);

    const totalPages = Math.ceil(total / pagination.pageSize);

    return {
      data: configs.map(config => this.toOutput(config)),
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * 更新配置
   */
  async update(id: number, input: Partial<ConfigInput>): Promise<ConfigOutput | null> {
    logger.info('更新配置', { id, input });

    const config = await this.configRepository.update(id, input);
    if (!config) {
      return null;
    }

    return this.toOutput(config);
  }

  /**
   * 删除配置
   */
  async delete(id: number): Promise<boolean> {
    logger.info('删除配置', { id });

    // 检查是否有域名正在使用此配置
    const domainCount = await this.domainRepository.countByConfigId(id);
    if (domainCount > 0) {
      throw new ConflictError(
        `无法删除配置，有 ${domainCount} 个域名正在使用此配置`,
        'CONFIG_IN_USE'
      );
    }

    const deleted = await this.configRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('配置不存在', 'CONFIG_NOT_FOUND');
    }

    return true;
  }

  /**
   * 将 Config 模型转换为输出格式
   */
  private toOutput(config: ConfigAttributes): ConfigOutput {
    return {
      id: config.id,
      title: config.title,
      author: config.author,
      description: config.description,
      keywords: config.keywords,
      links: config.links,
      permissions: config.permissions,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}

export default new ConfigService(
  require('../repositories/ConfigRepository').default,
  require('../repositories/DomainV2Repository').default
);
