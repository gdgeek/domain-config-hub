/**
 * Translation Service
 * 
 * 提供翻译内容的 CRUD 操作，包括创建、更新、查询和删除翻译
 * 集成缓存管理和语言解析功能
 * 
 * Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 8.2, 8.3, 8.5, 8.6, 8.7
 */

import { Translation } from '../models/Translation';
import { CacheManager } from './CacheManager';
import { LanguageResolver } from './LanguageResolver';
import { ValidationError } from '../errors/ValidationError';
import { NotFoundError } from '../errors/NotFoundError';
import { ConflictError } from '../errors/ConflictError';
import { logger } from '../config/logger';

/**
 * 创建翻译的 DTO
 */
export interface CreateTranslationDTO {
  configId: number;
  languageCode: string;
  title: string;
  author: string;
  description: string;
  keywords: string[];
}

/**
 * 更新翻译的 DTO
 */
export interface UpdateTranslationDTO {
  title?: string;
  author?: string;
  description?: string;
  keywords?: string[];
}

/**
 * 翻译响应接口
 */
export interface TranslationResponse {
  id: number;
  configId: number;
  languageCode: string;
  title: string;
  author: string;
  description: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 翻译服务类
 * 
 * 提供翻译内容的完整管理功能，包括：
 * - 创建和更新翻译
 * - 查询翻译（支持缓存和语言降级）
 * - 删除翻译（保护默认语言）
 * - 缓存管理
 */
export class TranslationService {
  /**
   * 创建翻译服务实例
   * 
   * @param translationModel - Translation Sequelize 模型
   * @param cacheManager - 缓存管理器
   * @param languageResolver - 语言解析器
   */
  constructor(
    private translationModel: typeof Translation,
    private cacheManager: CacheManager,
    private languageResolver: LanguageResolver
  ) {}

  /**
   * 创建新的翻译
   * 
   * 验证语言代码、必填字段、字段长度，检测重复，创建翻译并失效缓存
   * 
   * Requirements: 4.1, 4.5, 8.2, 8.3, 8.5, 8.6, 8.7
   * 
   * @param data - 创建翻译的数据
   * @returns 创建的翻译响应
   * @throws ValidationError - 语言代码不支持、字段验证失败
   * @throws ConflictError - 翻译已存在
   */
  async createTranslation(data: CreateTranslationDTO): Promise<TranslationResponse> {
    // 1. 验证和规范化语言代码
    const normalizedLang = this.languageResolver.normalizeLanguageCode(data.languageCode);
    if (!this.languageResolver.isSupported(normalizedLang)) {
      throw new ValidationError(
        `Unsupported language: ${data.languageCode}`,
        'VALIDATION_ERROR',
        {
          languageCode: data.languageCode,
          supported: this.languageResolver.getSupportedLanguages(),
        }
      );
    }

    // 2. 验证必填字段
    this.validateRequiredFields(data);

    // 3. 验证字段长度
    this.validateFieldLengths(data);

    // 4. 验证 keywords 格式
    this.validateKeywordsFormat(data.keywords);

    // 5. 检查重复
    const existing = await this.translationModel.findOne({
      where: {
        configId: data.configId,
        languageCode: normalizedLang,
      },
    });

    if (existing) {
      throw new ConflictError(
        `Translation already exists for config ${data.configId} and language ${normalizedLang}`,
        'CONFLICT'
      );
    }

    // 6. 创建翻译
    const translation = await this.translationModel.create({
      ...data,
      languageCode: normalizedLang,
    });

    // 7. 失效缓存
    await this.invalidateCache(data.configId, normalizedLang);

    logger.info('Translation created', {
      configId: data.configId,
      languageCode: normalizedLang,
      translationId: translation.id,
    });

    return this.toResponse(translation);
  }

  /**
   * 更新现有翻译
   * 
   * 查找翻译，验证更新数据，更新翻译并失效缓存
   * 
   * Requirements: 4.2, 4.5, 8.2, 8.5, 8.6, 8.7
   * 
   * @param configId - 配置 ID
   * @param languageCode - 语言代码
   * @param data - 更新数据
   * @returns 更新后的翻译响应
   * @throws NotFoundError - 翻译不存在
   * @throws ValidationError - 字段验证失败
   */
  async updateTranslation(
    configId: number,
    languageCode: string,
    data: UpdateTranslationDTO
  ): Promise<TranslationResponse> {
    // 1. 规范化语言代码
    const normalizedLang = this.languageResolver.normalizeLanguageCode(languageCode);

    // 2. 查找翻译
    const translation = await this.translationModel.findOne({
      where: { configId, languageCode: normalizedLang },
    });

    if (!translation) {
      throw new NotFoundError(
        `Translation not found for config ${configId} and language ${normalizedLang}`,
        'NOT_FOUND'
      );
    }

    // 3. 验证更新数据
    if (data.title !== undefined) {
      this.validateFieldLength('title', data.title, 200);
    }
    if (data.description !== undefined) {
      this.validateFieldLength('description', data.description, 1000);
    }
    if (data.keywords !== undefined) {
      this.validateKeywordsFormat(data.keywords);
    }

    // 4. 更新翻译
    await translation.update(data);

    // 5. 失效缓存
    await this.invalidateCache(configId, normalizedLang);

    logger.info('Translation updated', {
      configId,
      languageCode: normalizedLang,
      translationId: translation.id,
    });

    return this.toResponse(translation);
  }

  /**
   * 获取指定语言的翻译
   * 
   * 优先从缓存获取，缓存未命中时从数据库查询并缓存
   * 
   * Requirements: 3.1, 6.1, 6.2, 6.6
   * 
   * @param configId - 配置 ID
   * @param languageCode - 语言代码
   * @returns 翻译响应，如果不存在返回 null
   */
  async getTranslation(configId: number, languageCode: string): Promise<TranslationResponse | null> {
    const normalizedLang = this.languageResolver.normalizeLanguageCode(languageCode);

    // 1. 尝试从缓存获取
    const cacheKey = this.getCacheKey(configId, normalizedLang);
    const cached = await this.cacheManager.get<TranslationResponse>(cacheKey);
    if (cached) {
      logger.debug('Translation cache hit', { configId, languageCode: normalizedLang });
      return cached;
    }

    // 2. 从数据库查询
    const translation = await this.translationModel.findOne({
      where: { configId, languageCode: normalizedLang },
    });

    if (!translation) {
      logger.debug('Translation not found', { configId, languageCode: normalizedLang });
      return null;
    }

    // 3. 缓存结果
    const response = this.toResponse(translation);
    await this.cacheManager.set(cacheKey, response, 3600);

    logger.debug('Translation cached', { configId, languageCode: normalizedLang });

    return response;
  }

  /**
   * 获取翻译，如果不存在则降级到默认语言
   * 
   * 实现语言降级机制，记录降级事件
   * 
   * Requirements: 3.1, 3.3, 3.4, 3.5
   * 
   * @param configId - 配置 ID
   * @param languageCode - 请求的语言代码
   * @returns 翻译和实际使用的语言代码
   * @throws NotFoundError - 默认语言翻译也不存在
   */
  async getTranslationWithFallback(
    configId: number,
    languageCode: string
  ): Promise<{ translation: TranslationResponse; actualLanguage: string }> {
    const normalizedLang = this.languageResolver.normalizeLanguageCode(languageCode);

    // 1. 尝试获取请求的语言
    let translation = await this.getTranslation(configId, normalizedLang);
    if (translation) {
      return { translation, actualLanguage: normalizedLang };
    }

    // 2. 降级到默认语言
    const defaultLang = this.languageResolver.getDefaultLanguage();
    translation = await this.getTranslation(configId, defaultLang);

    if (!translation) {
      throw new NotFoundError(
        `No translation found for config ${configId}`,
        'NOT_FOUND'
      );
    }

    // 3. 记录降级事件
    logger.info('Language fallback occurred', {
      configId,
      requestedLanguage: normalizedLang,
      returnedLanguage: defaultLang,
    });

    return { translation, actualLanguage: defaultLang };
  }

  /**
   * 获取配置的所有翻译
   * 
   * Requirements: 4.3
   * 
   * @param configId - 配置 ID
   * @returns 所有翻译的数组
   */
  async getAllTranslations(configId: number): Promise<TranslationResponse[]> {
    const translations = await this.translationModel.findAll({
      where: { configId },
      order: [['languageCode', 'ASC']],
    });

    return translations.map(t => this.toResponse(t));
  }

  /**
   * 删除翻译
   * 
   * 保护默认语言翻译（如果存在其他翻译），删除后失效缓存
   * 
   * Requirements: 4.4, 4.7
   * 
   * @param configId - 配置 ID
   * @param languageCode - 语言代码
   * @throws ValidationError - 尝试删除默认语言且存在其他翻译
   * @throws NotFoundError - 翻译不存在
   */
  async deleteTranslation(configId: number, languageCode: string): Promise<void> {
    const normalizedLang = this.languageResolver.normalizeLanguageCode(languageCode);

    // 1. 检查是否为默认语言
    if (normalizedLang === this.languageResolver.getDefaultLanguage()) {
      const count = await this.translationModel.count({
        where: { configId },
      });

      if (count > 1) {
        throw new ValidationError(
          'Cannot delete default language translation while other translations exist',
          'VALIDATION_ERROR',
          {
            languageCode: normalizedLang,
            translationCount: count,
          }
        );
      }
    }

    // 2. 删除翻译
    const deleted = await this.translationModel.destroy({
      where: { configId, languageCode: normalizedLang },
    });

    if (deleted === 0) {
      throw new NotFoundError(
        `Translation not found for config ${configId} and language ${normalizedLang}`,
        'NOT_FOUND'
      );
    }

    // 3. 失效缓存
    await this.invalidateCache(configId, normalizedLang);

    logger.info('Translation deleted', {
      configId,
      languageCode: normalizedLang,
    });
  }

  /**
   * 验证必填字段
   * 
   * Requirements: 8.2
   * 
   * @param data - 翻译数据
   * @throws ValidationError - 必填字段缺失或为空
   */
  private validateRequiredFields(data: CreateTranslationDTO): void {
    const requiredFields: (keyof CreateTranslationDTO)[] = ['title', 'author', 'description', 'keywords'];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = data[field];
      if (value === undefined || value === null) {
        missingFields.push(field);
      } else if (typeof value === 'string' && value.trim() === '') {
        missingFields.push(field);
      } else if (Array.isArray(value) && value.length === 0) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new ValidationError(
        'Required fields are missing or empty',
        'VALIDATION_ERROR',
        { missingFields }
      );
    }
  }

  /**
   * 验证字段长度
   * 
   * Requirements: 8.5, 8.6
   * 
   * @param data - 翻译数据
   * @throws ValidationError - 字段长度超出限制
   */
  private validateFieldLengths(data: CreateTranslationDTO): void {
    this.validateFieldLength('title', data.title, 200);
    this.validateFieldLength('description', data.description, 1000);
  }

  /**
   * 验证单个字段长度
   * 
   * @param fieldName - 字段名
   * @param value - 字段值
   * @param maxLength - 最大长度
   * @throws ValidationError - 字段长度超出限制
   */
  private validateFieldLength(fieldName: string, value: string, maxLength: number): void {
    if (value.length > maxLength) {
      throw new ValidationError(
        `Field ${fieldName} exceeds maximum length of ${maxLength} characters`,
        'VALIDATION_ERROR',
        {
          field: fieldName,
          maxLength,
          actualLength: value.length,
        }
      );
    }
  }

  /**
   * 验证 keywords 格式
   * 
   * Requirements: 8.7
   * 
   * @param keywords - 关键词数组
   * @throws ValidationError - keywords 格式无效
   */
  private validateKeywordsFormat(keywords: any): void {
    if (!Array.isArray(keywords)) {
      throw new ValidationError(
        'Keywords must be an array',
        'VALIDATION_ERROR',
        { keywords }
      );
    }

    for (let i = 0; i < keywords.length; i++) {
      if (typeof keywords[i] !== 'string') {
        throw new ValidationError(
          'All keywords must be strings',
          'VALIDATION_ERROR',
          {
            invalidKeyword: keywords[i],
            index: i,
          }
        );
      }
    }
  }

  /**
   * 获取缓存键
   * 
   * Requirements: 6.2
   * 
   * @param configId - 配置 ID
   * @param languageCode - 语言代码
   * @returns 缓存键
   */
  private getCacheKey(configId: number, languageCode: string): string {
    return `config:${configId}:lang:${languageCode}`;
  }

  /**
   * 失效缓存
   * 
   * Requirements: 6.3
   * 
   * @param configId - 配置 ID
   * @param languageCode - 语言代码
   */
  private async invalidateCache(configId: number, languageCode: string): Promise<void> {
    const cacheKey = this.getCacheKey(configId, languageCode);
    await this.cacheManager.delete(cacheKey);
  }

  /**
   * 失效配置的所有语言缓存
   * 
   * 当配置被删除时，需要清除所有语言的缓存
   * 
   * Requirements: 6.4
   * 
   * @param configId - 配置 ID
   */
  async invalidateAllCachesForConfig(configId: number): Promise<void> {
    const pattern = `config:${configId}:lang:*`;
    await this.cacheManager.deletePattern(pattern);
    
    logger.info('Invalidated all caches for config', { configId });
  }

  /**
   * 将 Translation 模型转换为响应对象
   * 
   * @param translation - Translation 模型实例
   * @returns 翻译响应对象
   */
  private toResponse(translation: Translation): TranslationResponse {
    return {
      id: translation.id,
      configId: translation.configId,
      languageCode: translation.languageCode,
      title: translation.title,
      author: translation.author,
      description: translation.description,
      keywords: translation.keywords,
      createdAt: translation.createdAt,
      updatedAt: translation.updatedAt,
    };
  }
}

/**
 * 创建默认的 TranslationService 实例
 * 
 * @param cacheManager - 缓存管理器
 * @param languageResolver - 语言解析器
 * @returns TranslationService 实例
 */
export function createTranslationService(
  cacheManager: CacheManager,
  languageResolver: LanguageResolver
): TranslationService {
  return new TranslationService(Translation, cacheManager, languageResolver);
}
