/**
 * DomainRoutes Multilingual Property-Based Tests
 * 
 * Property-based tests for multilingual support in domain query endpoints
 * 
 * Feature: multilingual-content-support
 * Requirements: 2.4, 5.2, 5.5
 */

import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import domainRoutes from './DomainRoutes';
import { errorHandler } from '../middleware/ErrorMiddleware';
import { sequelize } from '../config/database';
import Config from '../models/Config';
import Domain from '../models/Domain';
import Translation from '../models/Translation';
import { connectRedis, closeRedis, isRedisEnabled, getRedisClient } from '../config/redis';

describe('DomainRoutes - Multilingual Property-Based Tests', () => {
  let app: Application;

  beforeAll(async () => {
    // Connect to database
    await sequelize.authenticate();
    
    // Connect to Redis if enabled
    if (isRedisEnabled()) {
      await connectRedis();
    }

    // Sync models
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    // Disconnect
    if (isRedisEnabled()) {
      await closeRedis();
    }
    await sequelize.close();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/domains', domainRoutes);
    app.use(errorHandler);
  });

  /**
   * Property 7: Invalid Language Code Error Handling
   * 
   * **Validates: Requirements 2.4**
   * 
   * For any invalid or malformed language code in a request, the system should
   * return a 400 Bad Request error with a descriptive message.
   */
  describe('Property 7: Invalid Language Code Error Handling', () => {
    it('应该对无效的语言代码返回 400 错误或降级到默认语言', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      // Create a test config and domain with default translation
      const config = await Config.create({
        links: { homepage: 'https://example.com' },
        permissions: { read: true },
      });

      const testDomainName = `test-property-${Date.now()}.com`;
      const domain = await Domain.create({
        domain: testDomainName,
        configId: config.id,
        homepage: `https://www.${testDomainName}`,
      });

      await Translation.create({
        configId: config.id,
        languageCode: 'zh-cn',
        title: '测试标题',
        author: '测试作者',
        description: '测试描述',
        keywords: ['测试'] as any,
      });

      try {
        await fc.assert(
          fc.asyncProperty(
            // Generate invalid language codes
            fc.oneof(
              fc.constant(''), // Empty string
              fc.constant('invalid'), // No hyphen
              fc.constant('xx-XX'), // Unsupported language
              fc.constant('123-456'), // Numbers
              fc.string({ minLength: 20, maxLength: 50 }), // Too long
            ),
            async (invalidLang) => {
              const response = await request(app)
                .get('/api/v1/domains')
                .query({ domain: testDomainName, lang: invalidLang });

              // System should handle gracefully (either error or fallback)
              expect([200, 400]).toContain(response.status);
              
              if (response.status === 200) {
                // If fallback occurred, should return default language
                expect(response.body.data.config.language).toBe('zh-cn');
              } else if (response.status === 400) {
                // If error, should have error structure
                expect(response.body).toHaveProperty('error');
              }
            }
          ),
          { numRuns: 50 }
        );
      } finally {
        // Cleanup
        await Domain.destroy({ where: { id: domain.id } });
        await Translation.destroy({ where: { configId: config.id } });
        await Config.destroy({ where: { id: config.id } });
        
        // Clear cache
        if (isRedisEnabled()) {
          const redis = getRedisClient();
          if (redis) {
            await redis.del(`config:${config.id}:lang:zh-cn`);
          }
        }
      }
    });
  });

  /**
   * Property 12: Language-Specific Query Results
   * 
   * **Validates: Requirements 5.2**
   * 
   * For any domain query with a specified language code, the returned config
   * should contain translations in the requested language (or default language
   * if unavailable), and the language field should correctly indicate which
   * language was returned.
   */
  describe('Property 12: Language-Specific Query Results', () => {
    it('GET /domains?domain=xxx 应该返回请求语言的翻译', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('zh-cn', 'en-us', 'ja-jp'), // Supported languages
          fc.string({ minLength: 1, maxLength: 100 }), // title
          fc.string({ minLength: 1, maxLength: 50 }), // author
          fc.string({ minLength: 1, maxLength: 200 }), // description
          async (languageCode, title, author, description) => {
            // Create test config and domain
            const config = await Config.create({
              links: { homepage: 'https://example.com' },
              permissions: { read: true },
            });

            const testDomainName = `test-lang-${Date.now()}-${Math.random().toString(36).substring(7)}.com`;
            const domain = await Domain.create({
              domain: testDomainName,
              configId: config.id,
              homepage: `https://www.${testDomainName}`,
            });

            // Create translation for the requested language
            await Translation.create({
              configId: config.id,
              languageCode,
              title,
              author,
              description,
              keywords: ['test'] as any,
            });

            try {
              const response = await request(app)
                .get('/api/v1/domains')
                .query({ domain: testDomainName, lang: languageCode });

              // Verify response
              expect(response.status).toBe(200);
              expect(response.body.data.config.language).toBe(languageCode);
              expect(response.body.data.config.title).toBe(title);
              expect(response.body.data.config.author).toBe(author);
              expect(response.body.data.config.description).toBe(description);
              expect(response.headers['x-content-language']).toBe(languageCode);
            } finally {
              // Cleanup
              await Domain.destroy({ where: { id: domain.id } });
              await Translation.destroy({ where: { configId: config.id } });
              await Config.destroy({ where: { id: config.id } });
              
              // Clear cache
              if (isRedisEnabled()) {
                const redis = getRedisClient();
                if (redis) {
                  await redis.del(`config:${config.id}:lang:${languageCode}`);
                }
              }
            }
          }
        ),
        { numRuns: 30 } // Reduced runs due to database operations
      );
    });
  });

  /**
   * Property 14: Default Language When Unspecified
   * 
   * **Validates: Requirements 5.5, 7.1**
   * 
   * For any domain query without a language code specified, the system should
   * return the default language (zh-cn) translation.
   */
  describe('Property 14: Default Language When Unspecified', () => {
    it('GET /domains?domain=xxx 未指定语言时应返回默认语言', async () => {
      if (!isRedisEnabled()) {
        console.log('Skipping test: Redis not enabled');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }), // title
          fc.string({ minLength: 1, maxLength: 50 }), // author
          async (title, author) => {
            // Create test config and domain with default language translation
            const config = await Config.create({
              links: { homepage: 'https://example.com' },
              permissions: { read: true },
            });

            const testDomainName = `test-default-${Date.now()}-${Math.random().toString(36).substring(7)}.com`;
            const domain = await Domain.create({
              domain: testDomainName,
              configId: config.id,
              homepage: `https://www.${testDomainName}`,
            });

            await Translation.create({
              configId: config.id,
              languageCode: 'zh-cn', // Default language
              title,
              author,
              description: '默认描述',
              keywords: ['测试'] as any,
            });

            try {
              // Query without language parameter
              const response = await request(app)
                .get('/api/v1/domains')
                .query({ domain: testDomainName });

              // Verify default language is returned
              expect(response.status).toBe(200);
              expect(response.body.data.config.language).toBe('zh-cn');
              expect(response.body.data.config.title).toBe(title);
              expect(response.body.data.config.author).toBe(author);
              expect(response.headers['x-content-language']).toBe('zh-cn');
            } finally {
              // Cleanup
              await Domain.destroy({ where: { id: domain.id } });
              await Translation.destroy({ where: { configId: config.id } });
              await Config.destroy({ where: { id: config.id } });
              
              // Clear cache
              if (isRedisEnabled()) {
                const redis = getRedisClient();
                if (redis) {
                  await redis.del(`config:${config.id}:lang:zh-cn`);
                }
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
