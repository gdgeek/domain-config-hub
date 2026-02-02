/**
 * ConfigService
 * 
 * 配置业务逻辑层
 * 处理配置相关的业务逻辑
 * 
 * Enhanced with multilingual support (Requirements: 5.1, 5.2, 5.3, 5.4, 5.5)
 */

import { ConfigRepository } from '../repositories/ConfigRepository';
import { DomainRepository } from '../repositories/DomainRepository';
import { ConfigAttributes, ConfigCreationAttributes } from '../models/Config';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { logger } from '../config/logger';
import { TranslationService, TranslationResponse } from './TranslationService';
import { LanguageResolver } from './LanguageResolver';

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
 * 配置输出接口（旧版本，保持向后兼容）
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
 * 配置输出接口（带翻译内容）
 * 
 * Requirements: 5.4
 */
export interface ConfigWithTranslation {
  id: number;
  // Non-translatable fields from configs table
  links: object | null;
  permissions: object | null;
  createdAt: Date;
  updatedAt: Date;
  // Translatable fields from translations table
  title: string;
  author: string;
  description: string;
  keywords: string[];
  // Metadata
  language: string;
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
 * 
 * Enhanced with multilingual support
 */
export class ConfigService {
  constructor(
    private configRepository: ConfigRepository,
    private domainRepository: DomainRepository,
    private translationService?: TranslationService,
    private languageResolver?: LanguageResolver
  ) {}

  /**
   * 通过 ID 获取配置（带翻译）
   * 
   * 合并配置的非翻译字段和指定语言的翻译内容
   * 
   * Requirements: 5.1, 5.4, 5.5
   * 
   * @param id - 配置 ID
   * @param languageCode - 可选的语言代码，如果未指定则使用默认语言
   * @returns 带翻译的配置对象
   * @throws NotFoundError - 配置不存在
   */
  async getConfigById(id: number, languageCode?: string): Promise<ConfigWithTranslation> {
    // 检查是否启用了多语言支持
    if (!this.translationService || !this.languageResolver) {
      throw new Error('Multilingual support is not enabled');
    }

    logger.info('查询配置（多语言）', { id, languageCode });

    // 1. 获取基础配置
    const config = await this.configRepository.findById(id);
    if (!config) {
      throw new NotFoundError(`Config not found: ${id}`, 'CONFIG_NOT_FOUND');
    }

    // 2. 确定语言
    const lang = languageCode || this.languageResolver.getDefaultLanguage();

    // 3. 获取翻译（带降级）
    const { translation, actualLanguage } = await this.translationService.getTranslationWithFallback(id, lang);

    // 4. 合并配置和翻译
    return this.mergeConfigWithTranslation(config, translation, actualLanguage);
  }

  /**
   * 通过域名获取配置（带翻译）
   * 
   * 查找域名对应的配置，并返回指定语言的翻译内容
   * 
   * Requirements: 5.2, 5.4, 5.5
   * 
   * @param domain - 域名
   * @param languageCode - 可选的语言代码，如果未指定则使用默认语言
   * @returns 带翻译的配置对象
   * @throws NotFoundError - 域名或配置不存在
   */
  async getConfigByDomain(domain: string, languageCode?: string): Promise<ConfigWithTranslation> {
    // 检查是否启用了多语言支持
    if (!this.translationService || !this.languageResolver) {
      throw new Error('Multilingual support is not enabled');
    }

    logger.info('通过域名查询配置（多语言）', { domain, languageCode });

    // 1. 获取域名记录
    const domainRecord = await this.domainRepository.findByDomain(domain);
    if (!domainRecord) {
      throw new NotFoundError(`Domain not found: ${domain}`, 'DOMAIN_NOT_FOUND');
    }

    // 2. 通过配置 ID 获取配置和翻译
    return this.getConfigById(domainRecord.configId, languageCode);
  }

  /**
   * 获取配置列表（带翻译）
   * 
   * 返回所有配置的指定语言翻译版本
   * 
   * Requirements: 5.3, 5.4, 5.5
   * 
   * @param languageCode - 可选的语言代码，如果未指定则使用默认语言
   * @returns 带翻译的配置对象数组
   */
  async listConfigs(languageCode?: string): Promise<ConfigWithTranslation[]> {
    // 检查是否启用了多语言支持
    if (!this.translationService || !this.languageResolver) {
      throw new Error('Multilingual support is not enabled');
    }

    logger.info('查询配置列表（多语言）', { languageCode });

    // 1. 获取所有配置
    const configs = await this.configRepository.findAll({ page: 1, pageSize: 1000 });

    // 2. 确定语言
    const lang = languageCode || this.languageResolver.getDefaultLanguage();

    // 3. 并行获取所有配置的翻译
    const results = await Promise.all(
      configs.map(async config => {
        try {
          const { translation, actualLanguage } = await this.translationService!.getTranslationWithFallback(
            config.id,
            lang
          );
          return this.mergeConfigWithTranslation(config, translation, actualLanguage);
        } catch (error) {
          // 如果某个配置没有翻译，记录警告但继续处理其他配置
          logger.warn('Failed to get translation for config', {
            configId: config.id,
            languageCode: lang,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })
    );

    // 4. 过滤掉失败的配置
    return results.filter((result): result is ConfigWithTranslation => result !== null);
  }

  /**
   * 合并配置和翻译
   * 
   * 将配置的非翻译字段和翻译的可翻译字段合并为一个对象
   * 
   * Requirements: 5.4
   * 
   * @param config - 配置对象
   * @param translation - 翻译对象
   * @param language - 实际使用的语言代码
   * @returns 合并后的配置对象
   */
  private mergeConfigWithTranslation(
    config: ConfigAttributes,
    translation: TranslationResponse,
    language: string
  ): ConfigWithTranslation {
    return {
      id: config.id,
      links: config.links,
      permissions: config.permissions,
      createdAt: config.createdAt!,
      updatedAt: config.updatedAt!,
      title: translation.title,
      author: translation.author,
      description: translation.description,
      keywords: translation.keywords,
      language,
    };
  }

  /**
   * 创建配置
   */
  async create(input: ConfigInput): Promise<ConfigOutput> {
    logger.info('创建配置', { input });

    // 转换 undefined 为 null
    const data: ConfigCreationAttributes = {
      title: input.title ?? null,
      author: input.author ?? null,
      description: input.description ?? null,
      keywords: input.keywords ?? null,
      links: input.links ?? null,
      permissions: input.permissions ?? null,
    };

    const config = await this.configRepository.create(data);
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

    // 如果启用了多语言支持，失效所有语言的缓存
    if (this.translationService) {
      await this.translationService.invalidateAllCachesForConfig(id);
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
  require('../repositories/DomainRepository').default
);
