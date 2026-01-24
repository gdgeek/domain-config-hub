import {
  domainParamSchema,
  createDomainSchema,
  updateDomainSchema,
  paginationSchema,
  idParamSchema,
} from './schemas';

describe('Validation Schemas', () => {
  describe('domainParamSchema', () => {
    it('should validate a valid domain parameter', () => {
      const result = domainParamSchema.validate({ domain: 'example.com' });
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ domain: 'example.com' });
    });

    it('should reject empty domain', () => {
      const result = domainParamSchema.validate({ domain: '' });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('域名不能为空');
    });

    it('should reject missing domain', () => {
      const result = domainParamSchema.validate({});
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('域名是必需的');
    });

    it('should reject domain exceeding 255 characters', () => {
      const longDomain = 'a'.repeat(256);
      const result = domainParamSchema.validate({ domain: longDomain });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('域名长度不能超过255字符');
    });

    it('should accept domain with exactly 255 characters', () => {
      const domain = 'a'.repeat(255);
      const result = domainParamSchema.validate({ domain });
      expect(result.error).toBeUndefined();
      expect(result.value.domain).toBe(domain);
    });
  });

  describe('createDomainSchema', () => {
    it('should validate a complete valid domain configuration', () => {
      const data = {
        domain: 'example.com',
        title: 'Example Site',
        author: 'John Doe',
        description: 'A test site',
        keywords: 'test, example',
        links: { home: 'https://example.com' },
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should validate with only required domain field', () => {
      const data = { domain: 'example.com' };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value.domain).toBe('example.com');
    });

    it('should accept null values for optional fields', () => {
      const data = {
        domain: 'example.com',
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: null,
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should accept empty strings for optional fields', () => {
      const data = {
        domain: 'example.com',
        title: '',
        author: '',
        description: '',
        keywords: '',
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing domain field', () => {
      const data = { title: 'Example' };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('域名是必需的');
    });

    it('should reject empty domain', () => {
      const data = { domain: '' };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('域名不能为空');
    });

    it('should reject title exceeding 255 characters', () => {
      const data = {
        domain: 'example.com',
        title: 'a'.repeat(256),
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('标题长度不能超过255字符');
    });

    it('should reject author exceeding 255 characters', () => {
      const data = {
        domain: 'example.com',
        author: 'a'.repeat(256),
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('作者长度不能超过255字符');
    });

    it('should reject description exceeding 255 characters', () => {
      const data = {
        domain: 'example.com',
        description: 'a'.repeat(256),
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('描述长度不能超过255字符');
    });

    it('should reject keywords exceeding 255 characters', () => {
      const data = {
        domain: 'example.com',
        keywords: 'a'.repeat(256),
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('关键词长度不能超过255字符');
    });

    it('should reject invalid links (non-object)', () => {
      const data = {
        domain: 'example.com',
        links: 'not an object',
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('links必须是有效的JSON对象');
    });

    it('should accept complex links object', () => {
      const data = {
        domain: 'example.com',
        links: {
          home: 'https://example.com',
          about: 'https://example.com/about',
          nested: {
            contact: 'https://example.com/contact',
          },
        },
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value.links).toEqual(data.links);
    });

    it('should accept empty links object', () => {
      const data = {
        domain: 'example.com',
        links: {},
      };
      const result = createDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value.links).toEqual({});
    });
  });

  describe('updateDomainSchema', () => {
    it('should validate all optional fields', () => {
      const data = {
        title: 'Updated Title',
        author: 'Jane Doe',
        description: 'Updated description',
        keywords: 'updated, keywords',
        links: { home: 'https://updated.com' },
      };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should validate with empty object (no updates)', () => {
      const result = updateDomainSchema.validate({});
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({});
    });

    it('should validate with single field update', () => {
      const data = { title: 'New Title' };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should accept null values', () => {
      const data = {
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: null,
      };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should accept empty strings', () => {
      const data = {
        title: '',
        author: '',
        description: '',
        keywords: '',
      };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeUndefined();
    });

    it('should reject title exceeding 255 characters', () => {
      const data = { title: 'a'.repeat(256) };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('标题长度不能超过255字符');
    });

    it('should reject author exceeding 255 characters', () => {
      const data = { author: 'a'.repeat(256) };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('作者长度不能超过255字符');
    });

    it('should reject description exceeding 255 characters', () => {
      const data = { description: 'a'.repeat(256) };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('描述长度不能超过255字符');
    });

    it('should reject keywords exceeding 255 characters', () => {
      const data = { keywords: 'a'.repeat(256) };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('关键词长度不能超过255字符');
    });

    it('should reject invalid links (non-object)', () => {
      const data = { links: 'not an object' };
      const result = updateDomainSchema.validate(data);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('links必须是有效的JSON对象');
    });

    it('should reject domain field in update', () => {
      const data = { domain: 'new-domain.com', title: 'Title' };
      const result = updateDomainSchema.validate(data);
      // Domain field should not be allowed in update schema
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('"domain" is not allowed');
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination parameters', () => {
      const data = { page: 2, pageSize: 50 };
      const result = paginationSchema.validate(data);
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual(data);
    });

    it('should apply default values when parameters are missing', () => {
      const result = paginationSchema.validate({});
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ page: 1, pageSize: 20 });
    });

    it('should apply default page when only pageSize is provided', () => {
      const result = paginationSchema.validate({ pageSize: 30 });
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ page: 1, pageSize: 30 });
    });

    it('should apply default pageSize when only page is provided', () => {
      const result = paginationSchema.validate({ page: 3 });
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ page: 3, pageSize: 20 });
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.validate({ page: 0 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('页码必须大于等于1');
    });

    it('should reject negative page', () => {
      const result = paginationSchema.validate({ page: -1 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('页码必须大于等于1');
    });

    it('should reject pageSize less than 1', () => {
      const result = paginationSchema.validate({ pageSize: 0 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('每页大小必须大于等于1');
    });

    it('should reject pageSize greater than 100', () => {
      const result = paginationSchema.validate({ pageSize: 101 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('每页大小不能超过100');
    });

    it('should accept pageSize of exactly 100', () => {
      const result = paginationSchema.validate({ pageSize: 100 });
      expect(result.error).toBeUndefined();
      expect(result.value.pageSize).toBe(100);
    });

    it('should accept pageSize of exactly 1', () => {
      const result = paginationSchema.validate({ pageSize: 1 });
      expect(result.error).toBeUndefined();
      expect(result.value.pageSize).toBe(1);
    });

    it('should reject non-integer page', () => {
      const result = paginationSchema.validate({ page: 1.5 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('页码必须是整数');
    });

    it('should reject non-integer pageSize', () => {
      const result = paginationSchema.validate({ pageSize: 20.5 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('每页大小必须是整数');
    });

    it('should reject non-numeric page', () => {
      const result = paginationSchema.validate({ page: 'abc' });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('页码必须是数字');
    });

    it('should reject non-numeric pageSize', () => {
      const result = paginationSchema.validate({ pageSize: 'xyz' });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('每页大小必须是数字');
    });
  });

  describe('idParamSchema', () => {
    it('should validate a valid positive integer ID', () => {
      const result = idParamSchema.validate({ id: 123 });
      expect(result.error).toBeUndefined();
      expect(result.value).toEqual({ id: 123 });
    });

    it('should reject missing ID', () => {
      const result = idParamSchema.validate({});
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ID是必需的');
    });

    it('should reject zero ID', () => {
      const result = idParamSchema.validate({ id: 0 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ID必须是正数');
    });

    it('should reject negative ID', () => {
      const result = idParamSchema.validate({ id: -1 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ID必须是正数');
    });

    it('should reject non-integer ID', () => {
      const result = idParamSchema.validate({ id: 1.5 });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ID必须是整数');
    });

    it('should reject non-numeric ID', () => {
      const result = idParamSchema.validate({ id: 'abc' });
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ID必须是数字');
    });

    it('should accept large positive integer ID', () => {
      const result = idParamSchema.validate({ id: 999999999 });
      expect(result.error).toBeUndefined();
      expect(result.value.id).toBe(999999999);
    });
  });
});
