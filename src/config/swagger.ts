/**
 * Swagger/OpenAPI 配置模块
 * 
 * 配置 OpenAPI 3.0 规范，定义 API 文档和数据模型
 * 需求: 5.1, 5.2, 5.3
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './env';

/**
 * OpenAPI 3.0 规范配置
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '域名配置服务 API',
    version: '1.0.0',
    description: '域名配置服务是一个 Node.js 后端服务，通过访问域名返回数据库中存储的配置内容。该服务提供 Redis 缓存支持以提高性能，并遵循三层架构模式（Routes → Services → Repositories）。',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'ISC',
      url: 'https://opensource.org/licenses/ISC',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}${config.apiPrefix}`,
      description: '开发环境',
    },
    {
      url: `https://api.example.com${config.apiPrefix}`,
      description: '生产环境',
    },
  ],
  tags: [
    {
      name: 'Domains',
      description: '域名配置管理接口',
    },
    {
      name: 'Configs',
      description: '配置内容管理接口',
    },
    {
      name: 'Translations',
      description: '多语言翻译管理接口 🌍',
    },
    {
      name: 'Languages',
      description: '语言元数据接口',
    },
    {
      name: 'Sessions',
      description: '会话管理接口（RESTful 认证）',
    },
    {
      name: 'Health',
      description: '健康检查和监控接口',
    },
    {
      name: 'Admin',
      description: '管理界面接口（已废弃，请使用 Sessions）',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT 认证令牌。通过 /api/v1/auth/login 接口获取令牌后，在此处输入令牌即可测试需要认证的接口。',
      },
    },
    schemas: {
      // 配置对象
      Config: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'integer',
            description: '配置的唯一标识符',
            example: 1,
          },
          title: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站标题',
            example: 'Example Website',
          },
          author: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站作者',
            example: 'John Doe',
          },
          description: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站描述',
            example: 'This is an example website',
          },
          keywords: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站关键词',
            example: 'example, website, demo',
          },
          links: {
            type: 'object',
            nullable: true,
            description: '链接配置（JSON 对象）',
            example: {
              home: 'https://example.com',
              about: 'https://example.com/about',
            },
          },
          permissions: {
            type: 'object',
            nullable: true,
            description: '权限配置（JSON 对象）',
            example: {
              read: true,
              write: false,
            },
          },
        },
      },
      // 配置输入对象
      ConfigInput: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站标题',
            example: 'Example Website',
          },
          author: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站作者',
            example: 'John Doe',
          },
          description: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站描述',
            example: 'This is an example website',
          },
          keywords: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站关键词',
            example: 'example, website, demo',
          },
          links: {
            type: 'object',
            nullable: true,
            description: '链接配置（JSON 对象）',
            example: {
              home: 'https://example.com',
              about: 'https://example.com/about',
            },
          },
          permissions: {
            type: 'object',
            nullable: true,
            description: '权限配置（JSON 对象）',
            example: {
              read: true,
              write: false,
            },
          },
        },
      },
      // 域名配置对象
      Domain: {
        type: 'object',
        required: ['id', 'domain'],
        properties: {
          id: {
            type: 'integer',
            description: '域名配置的唯一标识符',
            example: 1,
          },
          domain: {
            type: 'string',
            maxLength: 255,
            description: '域名（唯一）',
            example: 'example.com',
          },
          title: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站标题',
            example: 'Example Website',
          },
          author: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站作者',
            example: 'John Doe',
          },
          description: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站描述',
            example: 'This is an example website',
          },
          keywords: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站关键词',
            example: 'example, website, demo',
          },
          links: {
            type: 'object',
            nullable: true,
            description: '链接配置（JSON 对象）',
            example: {
              home: 'https://example.com',
              about: 'https://example.com/about',
            },
          },
          permissions: {
            type: 'object',
            nullable: true,
            description: '权限配置（JSON 对象）',
            example: {
              read: true,
              write: false,
            },
          },
        },
      },
      // 创建域名配置请求
      CreateDomainRequest: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: '域名（必需，唯一）',
            example: 'example.com',
          },
          title: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站标题',
            example: 'Example Website',
          },
          author: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站作者',
            example: 'John Doe',
          },
          description: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站描述',
            example: 'This is an example website',
          },
          keywords: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站关键词',
            example: 'example, website, demo',
          },
          links: {
            type: 'object',
            nullable: true,
            description: '链接配置（JSON 对象）',
            example: {
              home: 'https://example.com',
              about: 'https://example.com/about',
            },
          },
          permissions: {
            type: 'object',
            nullable: true,
            description: '权限配置（JSON 对象）',
            example: {
              read: true,
              write: false,
            },
          },
        },
      },
      // 更新域名配置请求
      UpdateDomainRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站标题',
            example: 'Updated Website Title',
          },
          author: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站作者',
            example: 'Jane Doe',
          },
          description: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站描述',
            example: 'Updated description',
          },
          keywords: {
            type: 'string',
            maxLength: 255,
            nullable: true,
            description: '网站关键词',
            example: 'updated, keywords',
          },
          links: {
            type: 'object',
            nullable: true,
            description: '链接配置（JSON 对象）',
            example: {
              home: 'https://example.com',
              contact: 'https://example.com/contact',
            },
          },
          permissions: {
            type: 'object',
            nullable: true,
            description: '权限配置（JSON 对象）',
            example: {
              read: true,
              write: true,
            },
          },
        },
      },
      // 分页信息
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: '当前页码',
            example: 1,
          },
          pageSize: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: '每页数据条数',
            example: 20,
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: '总数据条数',
            example: 100,
          },
          totalPages: {
            type: 'integer',
            minimum: 0,
            description: '总页数',
            example: 5,
          },
        },
      },
      // 分页响应
      PaginatedDomainsResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Domain',
            },
            description: '域名配置列表',
          },
          pagination: {
            $ref: '#/components/schemas/Pagination',
          },
        },
      },
      // 单个域名响应
      DomainResponse: {
        type: 'object',
        properties: {
          data: {
            $ref: '#/components/schemas/Domain',
          },
        },
      },
      // 删除成功响应
      DeleteResponse: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '操作结果消息',
            example: '域名配置已删除',
          },
        },
      },
      // 错误响应
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                description: '错误码',
                example: 'VALIDATION_ERROR',
                enum: [
                  'VALIDATION_ERROR',
                  'NOT_FOUND',
                  'CONFLICT',
                  'RATE_LIMIT_EXCEEDED',
                  'DATABASE_ERROR',
                  'INTERNAL_ERROR',
                  'UNAUTHORIZED',
                ],
              },
              message: {
                type: 'string',
                description: '错误消息',
                example: '请求数据验证失败',
              },
              details: {
                type: 'object',
                description: '错误详情（可选）',
                properties: {
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: {
                          type: 'string',
                          description: '错误字段',
                          example: 'domain',
                        },
                        message: {
                          type: 'string',
                          description: '字段错误消息',
                          example: '域名不能为空',
                        },
                        type: {
                          type: 'string',
                          description: '错误类型',
                          example: 'string.empty',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      // 健康检查响应
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '服务状态',
            example: 'healthy',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: '检查时间',
            example: '2024-01-01T00:00:00.000Z',
          },
          services: {
            type: 'object',
            properties: {
              database: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'connected',
                  },
                  message: {
                    type: 'string',
                    example: '数据库连接正常',
                  },
                },
              },
              redis: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    example: 'connected',
                  },
                  message: {
                    type: 'string',
                    example: 'Redis 连接正常',
                  },
                },
              },
            },
          },
        },
      },
      // 管理员登录请求
      AdminLoginRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          password: {
            type: 'string',
            description: '管理员密码',
            example: 'admin123',
          },
        },
      },
      // 管理员登录响应
      AdminLoginResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: '登录是否成功',
            example: true,
          },
          token: {
            type: 'string',
            description: '认证令牌',
            example: 'admin123',
          },
          message: {
            type: 'string',
            description: '响应消息',
            example: '登录成功',
          },
        },
      },
      // 翻译对象
      Translation: {
        type: 'object',
        required: ['id', 'configId', 'languageCode', 'title', 'author', 'description', 'keywords'],
        properties: {
          id: {
            type: 'integer',
            description: '翻译的唯一标识符',
            example: 1,
          },
          configId: {
            type: 'integer',
            description: '关联的配置 ID',
            example: 1,
          },
          languageCode: {
            type: 'string',
            description: '语言代码（BCP 47 格式）',
            example: 'zh-cn',
            enum: ['zh-cn', 'en-us', 'ja-jp'],
          },
          title: {
            type: 'string',
            maxLength: 200,
            description: '翻译的标题',
            example: '示例网站',
          },
          author: {
            type: 'string',
            maxLength: 100,
            description: '翻译的作者',
            example: '张三',
          },
          description: {
            type: 'string',
            maxLength: 1000,
            description: '翻译的描述',
            example: '这是一个示例网站的描述',
          },
          keywords: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: '翻译的关键词数组',
            example: ['示例', '网站', '测试'],
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: '创建时间',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: '更新时间',
            example: '2024-01-01T00:00:00.000Z',
          },
        },
      },
      // 创建翻译请求
      CreateTranslationRequest: {
        type: 'object',
        required: ['configId', 'languageCode', 'title', 'author', 'description', 'keywords'],
        properties: {
          configId: {
            type: 'integer',
            description: '关联的配置 ID',
            example: 1,
          },
          languageCode: {
            type: 'string',
            description: '语言代码（zh-cn, en-us, ja-jp）',
            example: 'zh-cn',
            enum: ['zh-cn', 'en-us', 'ja-jp'],
          },
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: '翻译的标题',
            example: '示例网站',
          },
          author: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: '翻译的作者',
            example: '张三',
          },
          description: {
            type: 'string',
            minLength: 1,
            maxLength: 1000,
            description: '翻译的描述',
            example: '这是一个示例网站的描述',
          },
          keywords: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 1,
            },
            minItems: 1,
            description: '翻译的关键词数组',
            example: ['示例', '网站', '测试'],
          },
        },
      },
      // 更新翻译请求
      UpdateTranslationRequest: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: '翻译的标题',
            example: '更新的标题',
          },
          author: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: '翻译的作者',
            example: '李四',
          },
          description: {
            type: 'string',
            minLength: 1,
            maxLength: 1000,
            description: '翻译的描述',
            example: '更新的描述',
          },
          keywords: {
            type: 'array',
            items: {
              type: 'string',
              minLength: 1,
            },
            minItems: 1,
            description: '翻译的关键词数组',
            example: ['更新', '关键词'],
          },
        },
      },
      // 语言元数据
      LanguageMetadata: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: '语言代码',
            example: 'zh-cn',
          },
          name: {
            type: 'string',
            description: '语言本地名称',
            example: '简体中文',
          },
          englishName: {
            type: 'string',
            description: '语言英文名称',
            example: 'Simplified Chinese',
          },
        },
      },
      // 语言列表响应
      LanguagesResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          data: {
            type: 'object',
            properties: {
              defaultLanguage: {
                type: 'string',
                description: '默认语言代码',
                example: 'zh-cn',
              },
              supportedLanguages: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/LanguageMetadata',
                },
                description: '支持的语言列表',
              },
            },
          },
        },
      },
    },
    responses: {
      // 400 验证错误
      ValidationError: {
        description: '请求数据验证失败',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'VALIDATION_ERROR',
                message: '请求数据验证失败',
                details: {
                  errors: [
                    {
                      field: 'domain',
                      message: '域名不能为空',
                      type: 'string.empty',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      // 404 资源不存在
      NotFound: {
        description: '请求的资源不存在',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'NOT_FOUND',
                message: '域名配置不存在',
              },
            },
          },
        },
      },
      // 409 资源冲突
      Conflict: {
        description: '资源冲突（如域名已存在）',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'CONFLICT',
                message: '域名已存在',
              },
            },
          },
        },
      },
      // 429 请求过于频繁
      RateLimitExceeded: {
        description: '请求过于频繁',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: '请求过于频繁，请稍后再试',
              },
            },
          },
        },
      },
      // 500 服务器内部错误
      InternalError: {
        description: '服务器内部错误',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'INTERNAL_ERROR',
                message: '服务器内部错误',
              },
            },
          },
        },
      },
      // 401 未授权
      Unauthorized: {
        description: '未授权访问',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse',
            },
            example: {
              error: {
                code: 'UNAUTHORIZED',
                message: '未授权访问',
              },
            },
          },
        },
      },
    },
    parameters: {
      // 域名路径参数
      DomainParam: {
        name: 'domain',
        in: 'path',
        required: true,
        description: '域名',
        schema: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
        },
        example: 'example.com',
      },
      // ID 路径参数
      IdParam: {
        name: 'id',
        in: 'path',
        required: true,
        description: '域名配置 ID',
        schema: {
          type: 'integer',
          minimum: 1,
        },
        example: 1,
      },
      // 页码查询参数
      PageParam: {
        name: 'page',
        in: 'query',
        required: false,
        description: '页码（从 1 开始）',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
        example: 1,
      },
      // 每页大小查询参数
      PageSizeParam: {
        name: 'pageSize',
        in: 'query',
        required: false,
        description: '每页数据条数',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 20,
        },
        example: 20,
      },
      // 语言代码路径参数
      LanguageCodeParam: {
        name: 'languageCode',
        in: 'path',
        required: true,
        description: '语言代码（zh-cn, en-us, ja-jp）',
        schema: {
          type: 'string',
          enum: ['zh-cn', 'en-us', 'ja-jp'],
        },
        example: 'zh-cn',
      },
      // Accept-Language 请求头
      AcceptLanguageHeader: {
        name: 'Accept-Language',
        in: 'header',
        required: false,
        description: '首选语言（支持 BCP 47 格式和权重）',
        schema: {
          type: 'string',
        },
        example: 'zh-CN,en-US;q=0.9,ja-JP;q=0.8',
      },
    },
  },
};

/**
 * Swagger JSDoc 配置选项
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  // API 路由文件路径（用于扫描 JSDoc 注释）
  // 开发环境使用 src 目录，生产环境使用 dist 目录
  apis: process.env.NODE_ENV === 'production' 
    ? [
        './dist/routes/*.js',
        './dist/app.js',
      ]
    : [
        './src/routes/*.ts',
        './src/app.ts',
      ],
};

/**
 * 生成 Swagger 规范
 */
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI 配置选项
 */
export const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '域名配置服务 API 文档',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};
