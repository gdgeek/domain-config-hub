# Requirements Document

## Introduction

本文档定义了域名配置管理服务的多语言内容支持功能需求。该功能将使系统能够存储和管理多种语言版本的配置内容，支持通过 API 请求获取指定语言的内容，并在请求的语言不可用时提供合理的降级机制。

## Glossary

- **System**: 域名配置管理服务（Domain Configuration Management Service）
- **Config**: 配置对象，包含 title、author、description、keywords 等字段
- **Language_Code**: 语言代码，遵循 BCP 47 标准（如 zh-CN、en-US、ja-JP）
- **Default_Language**: 默认语言，当请求的语言不可用时使用的语言版本
- **Translatable_Field**: 可翻译字段，包括 title、author、description、keywords
- **Non_Translatable_Field**: 不可翻译字段，包括 links、permissions
- **Language_Fallback**: 语言降级机制，当请求的语言不存在时返回默认语言内容
- **Accept_Language_Header**: HTTP 请求头，用于指定客户端期望的语言
- **Translation**: 特定语言的内容翻译版本
- **Config_Repository**: 配置数据存储层，使用 MySQL 和 Sequelize ORM
- **Cache_Layer**: 缓存层，使用 Redis 存储多语言内容以提升性能

## Requirements

### Requirement 1: 多语言内容存储

**User Story:** 作为系统管理员，我希望能够在数据库中存储多种语言版本的配置内容，以便为不同语言的用户提供本地化体验。

#### Acceptance Criteria

1. THE System SHALL store translations for Translatable_Fields in a dedicated database table
2. WHEN a Translation is created, THE System SHALL validate that the Language_Code follows BCP 47 standard format
3. THE System SHALL associate each Translation with a specific Config and Language_Code
4. THE System SHALL allow multiple Translations for the same Config with different Language_Codes
5. THE System SHALL maintain referential integrity between configs table and translations table
6. THE System SHALL store Non_Translatable_Fields (links, permissions) in the configs table without translation support

### Requirement 2: 语言请求处理

**User Story:** 作为 API 客户端开发者，我希望能够通过 HTTP 请求头或查询参数指定所需的语言，以便获取相应语言版本的内容。

#### Acceptance Criteria

1. WHEN a request includes an Accept_Language_Header, THE System SHALL parse the header to extract the requested Language_Code
2. WHEN a request includes a language query parameter, THE System SHALL use the query parameter value as the requested Language_Code
3. IF both Accept_Language_Header and query parameter are present, THEN THE System SHALL prioritize the query parameter
4. WHEN the requested Language_Code is invalid, THE System SHALL return an error response with status code 400
5. THE System SHALL normalize Language_Codes to lowercase with hyphen format (e.g., zh-cn, en-us)

### Requirement 3: 语言降级机制

**User Story:** 作为 API 客户端，我希望当请求的语言不存在时能够获得默认语言的内容，而不是收到错误响应，以确保用户体验的连续性。

#### Acceptance Criteria

1. WHEN a requested Language_Code does not have a Translation, THE System SHALL return the Default_Language Translation
2. THE System SHALL configure zh-CN as the Default_Language
3. IF the Default_Language Translation does not exist for a Config, THEN THE System SHALL return an error response with status code 404
4. WHEN returning a fallback Translation, THE System SHALL include a response header indicating the actual language returned
5. THE System SHALL log Language_Fallback events for monitoring purposes

### Requirement 4: 多语言内容管理 API

**User Story:** 作为系统管理员，我希望通过 RESTful API 管理多语言内容，以便创建、更新、查询和删除不同语言版本的配置。

#### Acceptance Criteria

1. THE System SHALL provide an API endpoint to create a new Translation for a Config
2. THE System SHALL provide an API endpoint to update an existing Translation
3. THE System SHALL provide an API endpoint to retrieve all Translations for a specific Config
4. THE System SHALL provide an API endpoint to delete a Translation for a specific Language_Code
5. WHEN creating or updating a Translation, THE System SHALL validate that all required Translatable_Fields are provided
6. WHEN deleting a Config, THE System SHALL cascade delete all associated Translations
7. THE System SHALL prevent deletion of the Default_Language Translation if other Translations exist

### Requirement 5: 配置查询 API 多语言支持

**User Story:** 作为 API 客户端，我希望在查询配置时能够获取指定语言的内容，以便向最终用户展示本地化的配置信息。

#### Acceptance Criteria

1. WHEN querying a Config by ID, THE System SHALL return the Translation matching the requested Language_Code
2. WHEN querying a Config by domain, THE System SHALL return the Translation matching the requested Language_Code
3. WHEN listing multiple Configs, THE System SHALL return Translations matching the requested Language_Code for all Configs
4. THE System SHALL merge Non_Translatable_Fields from the configs table with Translatable_Fields from the translations table
5. IF no Language_Code is specified in the request, THEN THE System SHALL return the Default_Language Translation

### Requirement 6: 缓存策略

**User Story:** 作为系统架构师，我希望使用 Redis 缓存多语言内容，以便提升 API 响应性能并减少数据库查询负载。

#### Acceptance Criteria

1. WHEN a Translation is retrieved from the database, THE System SHALL cache it in Redis with a language-specific cache key
2. THE Cache_Layer SHALL use cache keys in the format "config:{configId}:lang:{languageCode}"
3. WHEN a Translation is updated or deleted, THE System SHALL invalidate the corresponding cache entry
4. WHEN a Config is deleted, THE System SHALL invalidate all cache entries for all Language_Codes associated with that Config
5. THE System SHALL set a cache TTL of 3600 seconds for Translation cache entries
6. WHEN a cache entry is not found, THE System SHALL retrieve the Translation from the database and populate the cache

### Requirement 7: 向后兼容性

**User Story:** 作为现有 API 客户端，我希望在系统添加多语言支持后，现有的 API 调用仍然能够正常工作，以避免破坏性变更。

#### Acceptance Criteria

1. WHEN an existing API endpoint is called without specifying a Language_Code, THE System SHALL return the Default_Language Translation
2. THE System SHALL maintain the existing response structure for Config objects
3. THE System SHALL support existing API endpoints without requiring changes to client code
4. WHEN migrating existing Configs, THE System SHALL create Default_Language Translations for all existing data
5. THE System SHALL preserve existing functionality for Non_Translatable_Fields (links, permissions)

### Requirement 8: 数据验证和错误处理

**User Story:** 作为系统开发者，我希望系统能够验证多语言内容的完整性和正确性，并在出现错误时提供清晰的错误信息。

#### Acceptance Criteria

1. WHEN creating a Translation, THE System SHALL validate that the Language_Code is supported
2. WHEN creating a Translation, THE System SHALL validate that all required Translatable_Fields are non-empty strings
3. IF a Translation already exists for a Config and Language_Code combination, THEN THE System SHALL return an error response with status code 409
4. WHEN a database constraint violation occurs, THE System SHALL return an error response with a descriptive message
5. THE System SHALL validate that title length does not exceed 200 characters
6. THE System SHALL validate that description length does not exceed 1000 characters
7. THE System SHALL validate that keywords is a valid JSON array of strings

### Requirement 9: 支持的语言配置

**User Story:** 作为系统管理员，我希望能够配置系统支持的语言列表，以便控制哪些语言可以被使用。

#### Acceptance Criteria

1. THE System SHALL maintain a list of supported Language_Codes including zh-CN, en-US, and ja-JP
2. THE System SHALL provide an API endpoint to retrieve the list of supported Language_Codes
3. WHEN a Translation is created with an unsupported Language_Code, THE System SHALL return an error response with status code 400
4. THE System SHALL allow configuration of supported Language_Codes through environment variables or configuration files
5. THE System SHALL include language metadata (native name, English name) in the supported languages list

### Requirement 10: 数据库架构设计

**User Story:** 作为数据库架构师，我希望设计一个高效且可扩展的数据库架构来存储多语言内容，以确保系统性能和可维护性。

#### Acceptance Criteria

1. THE System SHALL create a new translations table with columns: id, config_id, language_code, title, author, description, keywords, created_at, updated_at
2. THE System SHALL create a unique composite index on (config_id, language_code) in the translations table
3. THE System SHALL create a foreign key constraint from translations.config_id to configs.id with CASCADE delete
4. THE System SHALL create an index on translations.language_code for efficient language-based queries
5. THE System SHALL use Sequelize migrations to create and manage the translations table schema
6. THE System SHALL maintain the existing configs table structure for Non_Translatable_Fields
