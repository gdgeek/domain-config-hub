/**
 * Swagger 配置模块单元测试
 */

import { swaggerSpec, swaggerUiOptions } from './swagger';

// Type assertion for swagger spec
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const spec = swaggerSpec as any;

describe('Swagger Configuration', () => {
  describe('swaggerSpec', () => {
    it('应该包含 OpenAPI 3.0.0 版本', () => {
      expect(spec.openapi).toBe('3.0.0');
    });

    it('应该包含 API 基本信息', () => {
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBe('域名配置服务 API');
      expect(spec.info.version).toBe('1.0.0');
      expect(spec.info.description).toContain('域名配置服务');
    });

    it('应该包含服务器配置', () => {
      expect(spec.servers).toBeDefined();
      expect(Array.isArray(spec.servers)).toBe(true);
      expect(spec.servers.length).toBeGreaterThan(0);
    });

    it('应该包含标签定义', () => {
      expect(spec.tags).toBeDefined();
      expect(Array.isArray(spec.tags)).toBe(true);
      
      const tagNames = spec.tags.map((tag: { name: string }) => tag.name);
      expect(tagNames).toContain('Domains');
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Admin');
    });

    describe('components.schemas', () => {
      it('应该定义 Domain 模式', () => {
        expect(spec.components.schemas.Domain).toBeDefined();
        expect(spec.components.schemas.Domain.type).toBe('object');
        expect(spec.components.schemas.Domain.required).toContain('id');
        expect(spec.components.schemas.Domain.required).toContain('domain');
        
        const properties = spec.components.schemas.Domain.properties;
        expect(properties.id).toBeDefined();
        expect(properties.domain).toBeDefined();
        expect(properties.title).toBeDefined();
        expect(properties.author).toBeDefined();
        expect(properties.description).toBeDefined();
        expect(properties.keywords).toBeDefined();
        expect(properties.links).toBeDefined();
        expect(properties.permissions).toBeDefined();
      });

      it('应该定义 CreateDomainRequest 模式', () => {
        expect(spec.components.schemas.CreateDomainRequest).toBeDefined();
        expect(spec.components.schemas.CreateDomainRequest.type).toBe('object');
        expect(spec.components.schemas.CreateDomainRequest.required).toContain('domain');
        
        const properties = spec.components.schemas.CreateDomainRequest.properties;
        expect(properties.domain).toBeDefined();
        expect(properties.domain.minLength).toBe(1);
        expect(properties.domain.maxLength).toBe(255);
      });

      it('应该定义 UpdateDomainRequest 模式', () => {
        expect(spec.components.schemas.UpdateDomainRequest).toBeDefined();
        expect(spec.components.schemas.UpdateDomainRequest.type).toBe('object');
        
        const properties = spec.components.schemas.UpdateDomainRequest.properties;
        expect(properties.title).toBeDefined();
        expect(properties.author).toBeDefined();
        expect(properties.description).toBeDefined();
        expect(properties.keywords).toBeDefined();
        expect(properties.links).toBeDefined();
        expect(properties.permissions).toBeDefined();
        
        // domain 字段不应该在更新模式中
        expect(properties.domain).toBeUndefined();
      });

      it('应该定义 Pagination 模式', () => {
        expect(spec.components.schemas.Pagination).toBeDefined();
        expect(spec.components.schemas.Pagination.type).toBe('object');
        
        const properties = spec.components.schemas.Pagination.properties;
        expect(properties.page).toBeDefined();
        expect(properties.pageSize).toBeDefined();
        expect(properties.total).toBeDefined();
        expect(properties.totalPages).toBeDefined();
      });

      it('应该定义 PaginatedDomainsResponse 模式', () => {
        expect(spec.components.schemas.PaginatedDomainsResponse).toBeDefined();
        
        const properties = spec.components.schemas.PaginatedDomainsResponse.properties;
        expect(properties.data).toBeDefined();
        expect(properties.data.type).toBe('array');
        expect(properties.pagination).toBeDefined();
      });

      it('应该定义 DomainResponse 模式', () => {
        expect(spec.components.schemas.DomainResponse).toBeDefined();
        
        const properties = spec.components.schemas.DomainResponse.properties;
        expect(properties.data).toBeDefined();
      });

      it('应该定义 ErrorResponse 模式', () => {
        expect(spec.components.schemas.ErrorResponse).toBeDefined();
        expect(spec.components.schemas.ErrorResponse.required).toContain('error');
        
        const errorProperties = spec.components.schemas.ErrorResponse.properties.error.properties;
        expect(errorProperties.code).toBeDefined();
        expect(errorProperties.message).toBeDefined();
        expect(errorProperties.details).toBeDefined();
        
        // 验证错误码枚举
        expect(errorProperties.code.enum).toContain('VALIDATION_ERROR');
        expect(errorProperties.code.enum).toContain('NOT_FOUND');
        expect(errorProperties.code.enum).toContain('CONFLICT');
        expect(errorProperties.code.enum).toContain('RATE_LIMIT_EXCEEDED');
        expect(errorProperties.code.enum).toContain('DATABASE_ERROR');
        expect(errorProperties.code.enum).toContain('INTERNAL_ERROR');
      });

      it('应该定义 HealthResponse 模式', () => {
        expect(spec.components.schemas.HealthResponse).toBeDefined();
        
        const properties = spec.components.schemas.HealthResponse.properties;
        expect(properties.status).toBeDefined();
        expect(properties.status.enum).toContain('healthy');
        expect(properties.status.enum).toContain('degraded');
        expect(properties.status.enum).toContain('unhealthy');
        expect(properties.timestamp).toBeDefined();
        expect(properties.services).toBeDefined();
      });

      it('应该定义 AdminLoginRequest 模式', () => {
        expect(spec.components.schemas.AdminLoginRequest).toBeDefined();
        expect(spec.components.schemas.AdminLoginRequest.required).toContain('password');
      });

      it('应该定义 AdminLoginResponse 模式', () => {
        expect(spec.components.schemas.AdminLoginResponse).toBeDefined();
        
        const properties = spec.components.schemas.AdminLoginResponse.properties;
        expect(properties.success).toBeDefined();
        expect(properties.token).toBeDefined();
        expect(properties.message).toBeDefined();
      });
    });

    describe('components.responses', () => {
      it('应该定义标准错误响应', () => {
        expect(spec.components.responses.ValidationError).toBeDefined();
        expect(spec.components.responses.NotFound).toBeDefined();
        expect(spec.components.responses.Conflict).toBeDefined();
        expect(spec.components.responses.RateLimitExceeded).toBeDefined();
        expect(spec.components.responses.InternalError).toBeDefined();
      });

      it('ValidationError 响应应该包含正确的描述和示例', () => {
        const response = spec.components.responses.ValidationError;
        expect(response.description).toContain('验证失败');
        expect(response.content['application/json']).toBeDefined();
        expect(response.content['application/json'].example).toBeDefined();
        expect(response.content['application/json'].example.error.code).toBe('VALIDATION_ERROR');
      });

      it('NotFound 响应应该包含正确的描述和示例', () => {
        const response = spec.components.responses.NotFound;
        expect(response.description).toContain('不存在');
        expect(response.content['application/json'].example.error.code).toBe('NOT_FOUND');
      });

      it('Conflict 响应应该包含正确的描述和示例', () => {
        const response = spec.components.responses.Conflict;
        expect(response.description).toContain('冲突');
        expect(response.content['application/json'].example.error.code).toBe('CONFLICT');
      });
    });

    describe('components.parameters', () => {
      it('应该定义 DomainParam 参数', () => {
        expect(spec.components.parameters.DomainParam).toBeDefined();
        expect(spec.components.parameters.DomainParam.name).toBe('domain');
        expect(spec.components.parameters.DomainParam.in).toBe('path');
        expect(spec.components.parameters.DomainParam.required).toBe(true);
        expect(spec.components.parameters.DomainParam.schema.minLength).toBe(1);
        expect(spec.components.parameters.DomainParam.schema.maxLength).toBe(255);
      });

      it('应该定义 IdParam 参数', () => {
        expect(spec.components.parameters.IdParam).toBeDefined();
        expect(spec.components.parameters.IdParam.name).toBe('id');
        expect(spec.components.parameters.IdParam.in).toBe('path');
        expect(spec.components.parameters.IdParam.required).toBe(true);
        expect(spec.components.parameters.IdParam.schema.type).toBe('integer');
      });

      it('应该定义分页参数', () => {
        expect(spec.components.parameters.PageParam).toBeDefined();
        expect(spec.components.parameters.PageParam.name).toBe('page');
        expect(spec.components.parameters.PageParam.in).toBe('query');
        expect(spec.components.parameters.PageParam.schema.default).toBe(1);
        
        expect(spec.components.parameters.PageSizeParam).toBeDefined();
        expect(spec.components.parameters.PageSizeParam.name).toBe('pageSize');
        expect(spec.components.parameters.PageSizeParam.in).toBe('query');
        expect(spec.components.parameters.PageSizeParam.schema.default).toBe(20);
        expect(spec.components.parameters.PageSizeParam.schema.maximum).toBe(100);
      });
    });
  });

  describe('swaggerUiOptions', () => {
    it('应该包含自定义 CSS', () => {
      expect(swaggerUiOptions.customCss).toBeDefined();
      expect(swaggerUiOptions.customCss).toContain('.swagger-ui');
    });

    it('应该包含自定义站点标题', () => {
      expect(swaggerUiOptions.customSiteTitle).toBe('域名配置服务 API 文档');
    });

    it('应该包含 Swagger UI 配置选项', () => {
      expect(swaggerUiOptions.swaggerOptions).toBeDefined();
      expect(swaggerUiOptions.swaggerOptions.persistAuthorization).toBe(true);
      expect(swaggerUiOptions.swaggerOptions.displayRequestDuration).toBe(true);
      expect(swaggerUiOptions.swaggerOptions.filter).toBe(true);
      expect(swaggerUiOptions.swaggerOptions.tryItOutEnabled).toBe(true);
    });
  });

  describe('OpenAPI 3.0 规范验证', () => {
    it('应该符合 OpenAPI 3.0 规范结构', () => {
      // 验证必需的顶级字段
      expect(spec.openapi).toBeDefined();
      expect(spec.info).toBeDefined();
      expect(spec.paths).toBeDefined();
      
      // 验证 info 对象必需字段
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });

    it('应该包含 components 定义', () => {
      expect(spec.components).toBeDefined();
      expect(spec.components.schemas).toBeDefined();
      expect(spec.components.responses).toBeDefined();
      expect(spec.components.parameters).toBeDefined();
    });

    it('所有 schema 引用应该有效', () => {
      // 验证 PaginatedDomainsResponse 引用 Domain 和 Pagination
      const paginatedResponse = spec.components.schemas.PaginatedDomainsResponse;
      expect(paginatedResponse.properties.data.items.$ref).toBe('#/components/schemas/Domain');
      expect(paginatedResponse.properties.pagination.$ref).toBe('#/components/schemas/Pagination');
      
      // 验证 DomainResponse 引用 Domain
      const domainResponse = spec.components.schemas.DomainResponse;
      expect(domainResponse.properties.data.$ref).toBe('#/components/schemas/Domain');
    });
  });

  describe('需求验证', () => {
    it('应该满足需求 5.1: 提供 Swagger UI 界面', () => {
      // Swagger UI 配置已定义
      expect(swaggerUiOptions).toBeDefined();
      expect(swaggerUiOptions.customSiteTitle).toBeDefined();
    });

    it('应该满足需求 5.2: 包含所有端点的请求参数、响应格式和错误码说明', () => {
      // 验证请求参数定义
      expect(spec.components.parameters).toBeDefined();
      expect(Object.keys(spec.components.parameters).length).toBeGreaterThan(0);
      
      // 验证响应格式定义
      expect(spec.components.schemas.DomainResponse).toBeDefined();
      expect(spec.components.schemas.PaginatedDomainsResponse).toBeDefined();
      
      // 验证错误码定义
      expect(spec.components.schemas.ErrorResponse).toBeDefined();
      expect(spec.components.responses.ValidationError).toBeDefined();
      expect(spec.components.responses.NotFound).toBeDefined();
      expect(spec.components.responses.Conflict).toBeDefined();
    });

    it('应该满足需求 5.3: 遵循 OpenAPI 3.0 规范', () => {
      expect(spec.openapi).toBe('3.0.0');
      
      // 验证必需的 OpenAPI 3.0 结构
      expect(spec.info).toBeDefined();
      expect(spec.info.title).toBeDefined();
      expect(spec.info.version).toBeDefined();
      expect(spec.components).toBeDefined();
    });
  });
});
