/**
 * Language Resolver Service
 * 
 * 负责从 HTTP 请求中解析语言代码，支持多种语言来源（查询参数、Accept-Language 头）
 * 并提供语言代码验证和规范化功能
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.5, 9.1
 */

import { Request } from 'express';

/**
 * 语言解析器配置接口
 */
export interface LanguageResolverConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
}

/**
 * 语言解析器类
 * 
 * 提供语言代码解析、验证和规范化功能
 */
export class LanguageResolver {
  private defaultLanguage: string;
  private supportedLanguages: Set<string>;

  /**
   * 构造函数
   * @param config 语言解析器配置
   */
  constructor(config: LanguageResolverConfig) {
    this.defaultLanguage = this.normalizeLanguageCode(config.defaultLanguage);
    this.supportedLanguages = new Set(
      config.supportedLanguages.map(lang => this.normalizeLanguageCode(lang))
    );
  }

  /**
   * 从请求中解析语言代码
   * 
   * 优先级：query param > Accept-Language header > default
   * 
   * @param req Express 请求对象
   * @returns 规范化的语言代码
   * 
   * Requirements: 2.1, 2.2, 2.3
   */
  resolveLanguage(req: Request): string {
    // 1. 检查查询参数（最高优先级）
    if (req.query.lang && typeof req.query.lang === 'string') {
      const normalized = this.normalizeLanguageCode(req.query.lang);
      // 如果支持该语言，返回它；否则继续尝试其他来源
      if (this.supportedLanguages.has(normalized)) {
        return normalized;
      }
    }

    // 2. 检查 Accept-Language 头
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage && typeof acceptLanguage === 'string') {
      const parsed = this.parseAcceptLanguage(acceptLanguage);
      if (parsed) {
        return parsed;
      }
    }

    // 3. 返回默认语言
    return this.defaultLanguage;
  }

  /**
   * 规范化语言代码为小写带连字符格式
   * 
   * 例如：
   * - zh_CN -> zh-cn
   * - ZH-CN -> zh-cn
   * - en_US -> en-us
   * 
   * @param code 原始语言代码
   * @returns 规范化的语言代码
   * 
   * Requirements: 2.5
   */
  normalizeLanguageCode(code: string): string {
    return code.toLowerCase().replace(/_/g, '-');
  }

  /**
   * 解析 Accept-Language 头并返回最佳匹配的支持语言
   * 
   * Accept-Language 格式示例：
   * - "en-US,en;q=0.9,zh-CN;q=0.8"
   * - "zh-CN,zh;q=0.9"
   * 
   * @param header Accept-Language 头的值
   * @returns 匹配的语言代码，如果没有匹配则返回 null
   * 
   * Requirements: 2.1
   */
  parseAcceptLanguage(header: string): string | null {
    // 解析 Accept-Language 头
    const languages = header.split(',').map(lang => {
      const parts = lang.trim().split(';');
      const code = parts[0].trim();
      
      // 提取 quality 值（q 参数）
      const qMatch = parts[1]?.match(/q=([\d.]+)/);
      let quality = 1.0;
      if (qMatch) {
        const parsed = parseFloat(qMatch[1]);
        quality = isNaN(parsed) ? 1.0 : parsed;
      }
      
      return { code, quality };
    });

    // 按 quality 值降序排序
    languages.sort((a, b) => b.quality - a.quality);

    // 查找第一个支持的语言
    for (const lang of languages) {
      const normalized = this.normalizeLanguageCode(lang.code);
      if (this.supportedLanguages.has(normalized)) {
        return normalized;
      }
    }

    return null;
  }

  /**
   * 验证语言代码是否被支持
   * 
   * @param languageCode 语言代码
   * @returns 如果支持返回 true，否则返回 false
   * 
   * Requirements: 9.1
   */
  isSupported(languageCode: string): boolean {
    const normalized = this.normalizeLanguageCode(languageCode);
    return this.supportedLanguages.has(normalized);
  }

  /**
   * 获取默认语言代码
   * 
   * @returns 默认语言代码
   * 
   * Requirements: 9.1
   */
  getDefaultLanguage(): string {
    return this.defaultLanguage;
  }

  /**
   * 获取所有支持的语言代码列表
   * 
   * @returns 支持的语言代码数组
   * 
   * Requirements: 9.1
   */
  getSupportedLanguages(): string[] {
    return Array.from(this.supportedLanguages);
  }
}

/**
 * 创建默认的语言解析器实例
 * 
 * 从环境变量读取配置：
 * - DEFAULT_LANGUAGE: 默认语言（默认值：zh-cn）
 * - SUPPORTED_LANGUAGES: 支持的语言列表，逗号分隔（默认值：zh-cn,en-us,ja-jp）
 * 
 * Requirements: 9.4
 */
export function createDefaultLanguageResolver(): LanguageResolver {
  const defaultLanguage = process.env.DEFAULT_LANGUAGE || 'zh-cn';
  const supportedLanguagesStr = process.env.SUPPORTED_LANGUAGES || 'zh-cn,en-us,ja-jp';
  const supportedLanguages = supportedLanguagesStr.split(',').map(lang => lang.trim());

  return new LanguageResolver({
    defaultLanguage,
    supportedLanguages,
  });
}
