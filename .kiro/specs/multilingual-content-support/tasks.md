# Implementation Plan: Multilingual Content Support

## Overview

本实现计划将多语言内容支持功能分解为增量式的开发任务。实现将从数据库架构开始，逐步构建数据访问层、服务层、API 层，最后进行集成和测试。每个任务都建立在前一个任务的基础上，确保代码的连续性和可测试性。

## Tasks

- [x] 1. 数据库架构和迁移
  - [x] 1.1 创建 translations 表的 Sequelize 迁移文件
    - 定义表结构：id, config_id, language_code, title, author, description, keywords, created_at, updated_at
    - 添加唯一复合索引：(config_id, language_code)
    - 添加外键约束：config_id -> configs.id (CASCADE DELETE)
    - 添加索引：language_code
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 1.2 创建数据迁移脚本将现有配置数据迁移到 translations 表
    - 从 configs 表读取现有的 title, author, description, keywords
    - 为每个配置创建默认语言（zh-cn）的翻译记录
    - 验证迁移完整性
    - _Requirements: 7.4_
  
  - [x] 1.3 编写数据库架构验证测试
    - 验证 translations 表结构正确
    - 验证索引和约束存在
    - 测试级联删除行为
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 2. Translation Model 和基础数据访问层
  - [x] 2.1 实现 Translation Sequelize 模型
    - 定义 TranslationAttributes 接口
    - 配置模型字段、类型和验证规则
    - 实现 keywords 字段的 JSON getter/setter
    - 配置与 Config 模型的关联关系
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 编写 Translation 模型的属性测试
    - **Property 1: Translation Storage Integrity**
    - **Validates: Requirements 1.1, 1.3**
  
  - [x] 2.3 编写 Translation 模型的单元测试
    - 测试模型创建和字段验证
    - 测试 keywords JSON 序列化/反序列化
    - 测试关联关系
    - _Requirements: 1.1, 1.3_

- [x] 3. Language Resolver Service
  - [x] 3.1 实现 LanguageResolver 类
    - 实现 resolveLanguage() 方法（优先级：query param > Accept-Language > default）
    - 实现 normalizeLanguageCode() 方法（转换为小写带连字符格式）
    - 实现 parseAcceptLanguage() 方法（解析 Accept-Language 头）
    - 实现 isSupported() 方法（验证语言代码是否支持）
    - 实现 getDefaultLanguage() 和 getSupportedLanguages() 方法
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 9.1_
  
  - [x] 3.2 编写 Language Resolver 的属性测试
    - **Property 2: Language Code Validation and Normalization**
    - **Property 5: Accept-Language Header Parsing**
    - **Property 6: Language Request Priority**
    - **Property 24: Query Parameter Language Resolution**
    - **Validates: Requirements 1.2, 2.1, 2.2, 2.3, 2.5**
  
  - [x] 3.3 编写 Language Resolver 的单元测试
    - 测试各种 Accept-Language 头格式
    - 测试语言代码规范化（zh_CN -> zh-cn, ZH-CN -> zh-cn）
    - 测试优先级规则
    - 测试边界情况（空头、无效格式）
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 4. Cache Manager 实现
  - [x] 4.1 实现 RedisCacheManager 类
    - 实现 get() 方法（从 Redis 获取并反序列化）
    - 实现 set() 方法（序列化并存储到 Redis，设置 TTL）
    - 实现 delete() 方法（删除单个缓存键）
    - 实现 deletePattern() 方法（批量删除匹配模式的键）
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 4.2 编写 Cache Manager 的属性测试
    - **Property 15: Cache Storage and Retrieval**
    - **Property 18: Cache TTL Configuration**
    - **Validates: Requirements 6.1, 6.2, 6.5, 6.6**
  
  - [x] 4.3 编写 Cache Manager 的单元测试
    - 测试缓存存储和检索
    - 测试 TTL 设置
    - 测试缓存删除
    - 测试模式匹配删除
    - 测试 Redis 连接错误处理
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Translation Service 核心功能
  - [x] 5.1 实现 TranslationService 的创建和更新方法
    - 实现 createTranslation() 方法（验证、创建、缓存失效）
    - 实现 updateTranslation() 方法（查找、更新、缓存失效）
    - 实现验证逻辑（语言代码、必填字段、字段长度）
    - 实现重复检测（409 Conflict）
    - _Requirements: 4.1, 4.2, 4.5, 8.2, 8.3, 8.5, 8.6, 8.7_
  
  - [x] 5.2 编写创建和更新方法的属性测试
    - **Property 2: Language Code Validation and Normalization**
    - **Property 10: Required Fields Validation**
    - **Property 19: Duplicate Translation Prevention**
    - **Property 21: Field Length Validation**
    - **Property 22: Keywords Format Validation**
    - **Property 23: Translation Round-Trip Consistency**
    - **Validates: Requirements 1.2, 4.1, 4.5, 5.1, 8.2, 8.3, 8.5, 8.6, 8.7**
  
  - [x] 5.3 实现 TranslationService 的查询和删除方法
    - 实现 getTranslation() 方法（缓存优先，数据库回退）
    - 实现 getTranslationWithFallback() 方法（语言降级机制）
    - 实现 getAllTranslations() 方法（获取配置的所有翻译）
    - 实现 deleteTranslation() 方法（默认语言保护、缓存失效）
    - _Requirements: 3.1, 3.3, 3.4, 4.3, 4.4, 4.7_
  
  - [x] 5.4 编写查询和删除方法的属性测试
    - **Property 8: Language Fallback Mechanism**
    - **Property 11: Default Language Protection**
    - **Property 16: Cache Invalidation on Update**
    - **Validates: Requirements 3.1, 3.4, 4.7, 6.3**
  
  - [x] 5.5 编写 Translation Service 的单元测试
    - 测试创建翻译的各种场景
    - 测试更新翻译
    - 测试查询翻译（缓存命中和未命中）
    - 测试语言降级
    - 测试删除翻译
    - 测试错误处理（404, 409, 400）
    - _Requirements: 3.1, 3.3, 4.1, 4.2, 4.3, 4.4, 4.7_

- [x] 6. Checkpoint - 核心服务层测试
  - 确保所有核心服务（LanguageResolver, CacheManager, TranslationService）的测试通过
  - 验证数据库操作正常
  - 验证缓存操作正常
  - 如有问题请询问用户

- [x] 7. Enhanced Config Service
  - [x] 7.1 增强 ConfigService 以支持多语言
    - 实现 getConfigById() 方法（合并配置和翻译）
    - 实现 getConfigByDomain() 方法（支持语言参数）
    - 实现 listConfigs() 方法（批量查询多语言）
    - 实现 mergeConfigWithTranslation() 辅助方法
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 7.2 编写 Config Service 的属性测试
    - **Property 12: Language-Specific Query Results**
    - **Property 13: Data Merging Correctness**
    - **Property 14: Default Language When Unspecified**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
  
  - [x] 7.3 编写 Config Service 的单元测试
    - 测试按 ID 查询配置（各种语言）
    - 测试按域名查询配置
    - 测试列表查询
    - 测试数据合并逻辑
    - 测试默认语言行为
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Translation Management API Routes
  - [x] 8.1 实现 Translation CRUD API 端点
    - POST /api/configs/:configId/translations（创建翻译）
    - PUT /api/configs/:configId/translations/:languageCode（更新翻译）
    - GET /api/configs/:configId/translations（获取所有翻译）
    - DELETE /api/configs/:configId/translations/:languageCode（删除翻译）
    - 实现请求验证中间件
    - 实现错误处理中间件
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 8.2 编写 Translation API 的集成测试
    - 测试创建翻译 API（成功和失败场景）
    - 测试更新翻译 API
    - 测试获取所有翻译 API
    - 测试删除翻译 API
    - 测试错误响应格式
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Enhanced Config Query API Routes
  - [x] 9.1 增强现有配置查询端点以支持多语言
    - 修改 GET /api/configs/:id（添加 lang 查询参数和 Accept-Language 支持）
    - 修改 GET /api/domains/:domain/config（添加语言支持）
    - 修改 GET /api/configs（添加语言支持）
    - 添加 X-Content-Language 响应头
    - 集成 LanguageResolver 中间件
    - _Requirements: 5.1, 5.2, 5.3, 2.1, 2.2, 3.4_
  
  - [x] 9.2 编写增强配置查询 API 的属性测试
    - **Property 7: Invalid Language Code Error Handling**
    - **Property 12: Language-Specific Query Results**
    - **Property 14: Default Language When Unspecified**
    - **Validates: Requirements 2.4, 5.1, 5.2, 5.3, 5.5**
  
  - [x] 9.3 编写增强配置查询 API 的集成测试
    - 测试通过查询参数指定语言
    - 测试通过 Accept-Language 头指定语言
    - 测试语言降级行为
    - 测试 X-Content-Language 响应头
    - 测试无效语言代码错误
    - 测试向后兼容性（无语言参数）
    - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.4, 5.1, 5.2, 5.3, 5.5, 7.1, 7.3_

- [x] 10. Language Metadata API
  - [x] 10.1 实现语言元数据 API 端点
    - GET /api/languages（返回支持的语言列表和默认语言）
    - 包含语言元数据（code, name, englishName）
    - _Requirements: 9.2, 9.5_
  
  - [x] 10.2 编写语言元数据 API 的单元测试
    - 测试端点返回正确的语言列表
    - 测试元数据格式
    - 测试默认语言标识
    - _Requirements: 9.2, 9.5_

- [x] 11. Logging 和监控
  - [x] 11.1 实现语言降级事件日志记录
    - 在 TranslationService.getTranslationWithFallback() 中添加日志
    - 记录 config ID、请求的语言、返回的语言
    - 使用结构化日志格式
    - _Requirements: 3.5_
  
  - [x] 11.2 编写日志记录的属性测试
    - **Property 9: Fallback Logging**
    - **Validates: Requirements 3.5**

- [x] 12. 缓存集成和测试
  - [x] 12.1 集成缓存到 Translation Service 和 Config Service
    - 确保所有查询操作使用缓存
    - 确保所有写入操作失效缓存
    - 实现配置删除时的批量缓存失效
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_
  
  - [x] 12.2 编写缓存集成的属性测试
    - **Property 4: Referential Integrity and Cascade Deletion**
    - **Property 17: Batch Cache Invalidation**
    - **Validates: Requirements 1.5, 4.6, 6.4**
  
  - [x] 12.3 编写缓存集成的单元测试
    - 测试缓存命中和未命中场景
    - 测试缓存失效时机
    - 测试批量缓存失效
    - 测试缓存键格式
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [x] 13. 错误处理和验证完善
  - [x] 13.1 实现统一的错误处理中间件
    - 捕获并格式化 ValidationError（400）
    - 捕获并格式化 NotFoundError（404）
    - 捕获并格式化 ConflictError（409）
    - 捕获并格式化数据库约束错误（500）
    - 返回统一的错误响应格式
    - _Requirements: 8.4_
  
  - [x] 13.2 编写错误处理的属性测试
    - **Property 20: Database Constraint Error Handling**
    - **Validates: Requirements 8.4**
  
  - [x] 13.3 编写错误处理的单元测试
    - 测试各种错误类型的响应格式
    - 测试错误消息的描述性
    - 测试数据库错误的转换
    - _Requirements: 8.4_

- [x] 14. Checkpoint - 完整功能测试
  - 运行所有单元测试和属性测试
  - 验证所有 API 端点正常工作
  - 测试端到端流程（创建配置 -> 添加翻译 -> 查询不同语言）
  - 验证缓存行为
  - 验证错误处理
  - 如有问题请询问用户

- [x] 15. 向后兼容性验证
  - [x] 15.1 验证现有 API 端点的向后兼容性
    - 测试不带语言参数的现有 API 调用
    - 验证响应结构保持不变
    - 验证非翻译字段（links, permissions）功能正常
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [x] 15.2 编写向后兼容性测试
    - 测试旧客户端调用（无语言参数）
    - 测试响应格式兼容性
    - 测试非翻译字段保持不变
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 16. 配置和环境变量
  - [x] 16.1 实现语言配置管理
    - 从环境变量读取支持的语言列表
    - 从环境变量读取默认语言
    - 提供配置验证
    - 创建配置文档
    - _Requirements: 9.4_
  
  - [x] 16.2 编写配置管理的单元测试
    - 测试从环境变量加载配置
    - 测试配置验证
    - 测试默认值
    - _Requirements: 9.4_

- [x] 17. 文档和示例
  - [x] 17.1 创建 API 文档
    - 记录所有新的 API 端点
    - 提供请求/响应示例
    - 记录错误代码和消息
    - 记录语言代码格式和支持的语言
  
  - [x] 17.2 创建迁移指南
    - 记录数据迁移步骤
    - 提供现有客户端的升级指南
    - 记录配置变更
  
  - [x] 17.3 创建使用示例
    - 提供多语言内容管理的代码示例
    - 提供客户端集成示例
    - 提供常见场景的最佳实践

- [x] 18. 最终集成测试和验收
  - [x] 18.1 运行完整的端到端测试套件
    - 测试完整的用户流程
    - 测试多语言内容的创建、查询、更新、删除
    - 测试缓存行为
    - 测试错误场景
    - 测试性能（缓存命中率）
  
  - [x] 18.2 性能测试和优化
    - 测试数据库查询性能
    - 测试缓存命中率
    - 优化慢查询
    - 验证索引效果
  
  - [x] 18.3 最终验收检查
    - 确保所有需求都已实现
    - 确保所有测试通过
    - 确保代码质量符合标准
    - 确保文档完整
    - 如有问题请询问用户

## Notes

- 每个任务都引用了具体的需求编号以确保可追溯性
- Checkpoint 任务确保增量验证
- 属性测试验证通用正确性属性（每个测试至少 100 次迭代）
- 单元测试验证具体示例和边界情况
- 使用 fast-check 库进行属性测试
- 使用 Jest + Supertest 进行单元测试和集成测试
