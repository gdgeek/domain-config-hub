/**
 * Translation Model - Property-Based Tests
 * 
 * 使用 fast-check 进行属性测试，验证 Translation 模型的通用正确性属性
 * 每个测试至少 100 次迭代
 * 
 * Feature: multilingual-content-support
 */

import * as fc from 'fast-check';
import { Translation } from './Translation';
import { Config } from './Config';
import { sequelize } from '../config/database';

/**
 * 数据库连接状态
 */
let dbConnected = false;

/**
 * 测试前设置：尝试连接并同步数据库
 */
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    dbConnected = true;
  } catch (error) {
    console.warn('Database not available for property tests. Tests will be skipped.');
    dbConnected = false;
  }
});

/**
 * 每个测试后清理数据
 */
afterEach(async () => {
  if (dbConnected) {
    await Translation.destroy({ where: {}, truncate: true, cascade: true });
    await Config.destroy({ where: {}, truncate: true, cascade: true });
  }
});

/**
 * 测试后关闭数据库连接
 */
afterAll(async () => {
  if (dbConnected) {
    await sequelize.close();
  }
});

/**
 * 自定义 Arbitraries（生成器）
 */

/**
 * 生成有效的 BCP 47 语言代码
 * 格式：xx-xx（小写字母）
 */
const languageCodeArbitrary = fc.constantFrom(
  'zh-cn',
  'en-us',
  'ja-jp',
  'fr-fr',
  'de-de',
  'es-es',
  'it-it',
  'pt-br',
  'ru-ru',
  'ko-kr'
);

/**
 * 生成有效的标题（1-200 字符）
 */
const titleArbitrary = fc.string({ minLength: 1, maxLength: 200 });

/**
 * 生成有效的作者名（1-100 字符）
 */
const authorArbitrary = fc.string({ minLength: 1, maxLength: 100 });

/**
 * 生成有效的描述（1-1000 字符）
 */
const descriptionArbitrary = fc.string({ minLength: 1, maxLength: 1000 });

/**
 * 生成有效的关键词数组
 */
const keywordsArbitrary = fc.array(
  fc.string({ minLength: 1, maxLength: 50 }),
  { minLength: 0, maxLength: 20 }
);

/**
 * 生成完整的翻译数据（不包含 configId）
 */
const translationDataArbitrary = fc.record({
  languageCode: languageCodeArbitrary,
  title: titleArbitrary,
  author: authorArbitrary,
  description: descriptionArbitrary,
  keywords: keywordsArbitrary,
});

/**
 * Property 1: Translation Storage Integrity
 * 
 * For any valid translation data (config ID, language code, title, author, description, keywords),
 * when a translation is created, it should be stored in the database with all fields intact
 * and retrievable with the same values.
 * 
 * **Validates: Requirements 1.1, 1.3**
 */
describe('Property 1: Translation Storage Integrity', () => {
  it('should store and retrieve translations with all fields intact', async () => {
    if (!dbConnected) {
      console.log('Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(translationDataArbitrary, async (translationData) => {
        // 创建一个测试用的 Config
        const config = await Config.create({
          title: 'Test Config',
          author: 'Test Author',
          description: 'Test Description',
          keywords: 'test',
          links: null,
          permissions: null,
        });

        // 创建翻译
        const createdTranslation = await Translation.create({
          configId: config.id,
          languageCode: translationData.languageCode,
          title: translationData.title,
          author: translationData.author,
          description: translationData.description,
          keywords: translationData.keywords,
        });

        // 从数据库检索翻译
        const retrievedTranslation = await Translation.findByPk(createdTranslation.id);

        // 验证翻译存在
        expect(retrievedTranslation).not.toBeNull();

        if (retrievedTranslation) {
          // 验证所有字段完整性
          expect(retrievedTranslation.configId).toBe(config.id);
          expect(retrievedTranslation.languageCode).toBe(translationData.languageCode);
          expect(retrievedTranslation.title).toBe(translationData.title);
          expect(retrievedTranslation.author).toBe(translationData.author);
          expect(retrievedTranslation.description).toBe(translationData.description);
          expect(retrievedTranslation.keywords).toEqual(translationData.keywords);
          
          // 验证自动生成的字段
          expect(retrievedTranslation.id).toBe(createdTranslation.id);
          expect(retrievedTranslation.createdAt).toBeInstanceOf(Date);
          expect(retrievedTranslation.updatedAt).toBeInstanceOf(Date);
        }

        // 清理测试数据
        await Translation.destroy({ where: { id: createdTranslation.id } });
        await Config.destroy({ where: { id: config.id } });
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain data integrity for multiple translations of the same config', async () => {
    if (!dbConnected) {
      console.log('Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.array(translationDataArbitrary, { minLength: 1, maxLength: 5 }),
        async (translationsData) => {
          // 创建一个测试用的 Config
          const config = await Config.create({
            title: 'Test Config',
            author: 'Test Author',
            description: 'Test Description',
            keywords: 'test',
            links: null,
            permissions: null,
          });

          // 确保每个翻译有唯一的语言代码
          const uniqueTranslations = translationsData.reduce((acc, curr) => {
            if (!acc.find(t => t.languageCode === curr.languageCode)) {
              acc.push(curr);
            }
            return acc;
          }, [] as typeof translationsData);

          // 创建多个翻译
          await Promise.all(
            uniqueTranslations.map(data =>
              Translation.create({
                configId: config.id,
                languageCode: data.languageCode,
                title: data.title,
                author: data.author,
                description: data.description,
                keywords: data.keywords,
              })
            )
          );

          // 检索所有翻译
          const retrievedTranslations = await Translation.findAll({
            where: { configId: config.id },
          });

          // 验证翻译数量
          expect(retrievedTranslations.length).toBe(uniqueTranslations.length);

          // 验证每个翻译的完整性
          for (let i = 0; i < uniqueTranslations.length; i++) {
            const original = uniqueTranslations[i];
            const retrieved = retrievedTranslations.find(
              t => t.languageCode === original.languageCode
            );

            expect(retrieved).toBeDefined();
            if (retrieved) {
              expect(retrieved.configId).toBe(config.id);
              expect(retrieved.languageCode).toBe(original.languageCode);
              expect(retrieved.title).toBe(original.title);
              expect(retrieved.author).toBe(original.author);
              expect(retrieved.description).toBe(original.description);
              expect(retrieved.keywords).toEqual(original.keywords);
            }
          }

          // 清理测试数据
          await Translation.destroy({ where: { configId: config.id } });
          await Config.destroy({ where: { id: config.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly serialize and deserialize keywords array', async () => {
    if (!dbConnected) {
      console.log('Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        keywordsArbitrary,
        languageCodeArbitrary,
        async (keywords, languageCode) => {
          // 创建一个测试用的 Config
          const config = await Config.create({
            title: 'Test Config',
            author: 'Test Author',
            description: 'Test Description',
            keywords: 'test',
            links: null,
            permissions: null,
          });

          // 创建翻译
          const createdTranslation = await Translation.create({
            configId: config.id,
            languageCode: languageCode,
            title: 'Test Title',
            author: 'Test Author',
            description: 'Test Description',
            keywords: keywords,
          });

          // 从数据库检索翻译
          const retrievedTranslation = await Translation.findByPk(createdTranslation.id);

          // 验证 keywords 数组完整性
          expect(retrievedTranslation).not.toBeNull();
          if (retrievedTranslation) {
            expect(Array.isArray(retrievedTranslation.keywords)).toBe(true);
            expect(retrievedTranslation.keywords).toEqual(keywords);
            
            // 验证每个关键词都是字符串
            retrievedTranslation.keywords.forEach(keyword => {
              expect(typeof keyword).toBe('string');
            });
          }

          // 清理测试数据
          await Translation.destroy({ where: { id: createdTranslation.id } });
          await Config.destroy({ where: { id: config.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve field values across updates', async () => {
    if (!dbConnected) {
      console.log('Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        translationDataArbitrary,
        translationDataArbitrary,
        async (initialData, updatedData) => {
          // 确保使用相同的语言代码
          const languageCode = initialData.languageCode;
          const finalUpdatedData = { ...updatedData, languageCode };

          // 创建一个测试用的 Config
          const config = await Config.create({
            title: 'Test Config',
            author: 'Test Author',
            description: 'Test Description',
            keywords: 'test',
            links: null,
            permissions: null,
          });

          // 创建初始翻译
          const translation = await Translation.create({
            configId: config.id,
            languageCode: initialData.languageCode,
            title: initialData.title,
            author: initialData.author,
            description: initialData.description,
            keywords: initialData.keywords,
          });

          // 更新翻译
          await translation.update({
            title: finalUpdatedData.title,
            author: finalUpdatedData.author,
            description: finalUpdatedData.description,
            keywords: finalUpdatedData.keywords,
          });

          // 从数据库重新检索
          const retrievedTranslation = await Translation.findByPk(translation.id);

          // 验证更新后的值
          expect(retrievedTranslation).not.toBeNull();
          if (retrievedTranslation) {
            expect(retrievedTranslation.title).toBe(finalUpdatedData.title);
            expect(retrievedTranslation.author).toBe(finalUpdatedData.author);
            expect(retrievedTranslation.description).toBe(finalUpdatedData.description);
            expect(retrievedTranslation.keywords).toEqual(finalUpdatedData.keywords);
            
            // 验证不变的字段
            expect(retrievedTranslation.configId).toBe(config.id);
            expect(retrievedTranslation.languageCode).toBe(languageCode);
            expect(retrievedTranslation.id).toBe(translation.id);
          }

          // 清理测试数据
          await Translation.destroy({ where: { id: translation.id } });
          await Config.destroy({ where: { id: config.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain referential integrity with Config', async () => {
    if (!dbConnected) {
      console.log('Skipping test: Database not available');
      return;
    }

    await fc.assert(
      fc.asyncProperty(translationDataArbitrary, async (translationData) => {
        // 创建一个测试用的 Config
        const config = await Config.create({
          title: 'Test Config',
          author: 'Test Author',
          description: 'Test Description',
          keywords: 'test',
          links: null,
          permissions: null,
        });

        // 创建翻译
        const translation = await Translation.create({
          configId: config.id,
          languageCode: translationData.languageCode,
          title: translationData.title,
          author: translationData.author,
          description: translationData.description,
          keywords: translationData.keywords,
        });

        // 通过关联查询 Config
        const translationWithConfig = await Translation.findByPk(translation.id, {
          include: [{ model: Config, as: 'config' }],
        });

        // 验证关联关系
        expect(translationWithConfig).not.toBeNull();
        if (translationWithConfig) {
          const associatedConfig = (translationWithConfig as any).config;
          expect(associatedConfig).toBeDefined();
          expect(associatedConfig.id).toBe(config.id);
        }

        // 清理测试数据
        await Translation.destroy({ where: { id: translation.id } });
        await Config.destroy({ where: { id: config.id } });
      }),
      { numRuns: 100 }
    );
  });
});
