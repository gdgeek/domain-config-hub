/**
 * Domain 模型单元测试
 * 
 * 测试 Domain 模型的定义和配置
 */

import { Domain, DomainAttributes, DomainCreationAttributes } from './Domain';

describe('Domain Model', () => {
  describe('Model Definition', () => {
    it('should have correct table name', () => {
      expect(Domain.tableName).toBe('domain');
    });

    it('should have timestamps disabled', () => {
      const options = Domain.options;
      expect(options.timestamps).toBe(false);
    });

    it('should have all required attributes defined', () => {
      const attributes = Domain.getAttributes();
      
      expect(attributes).toHaveProperty('id');
      expect(attributes).toHaveProperty('domain');
      expect(attributes).toHaveProperty('title');
      expect(attributes).toHaveProperty('author');
      expect(attributes).toHaveProperty('description');
      expect(attributes).toHaveProperty('keywords');
      expect(attributes).toHaveProperty('links');
      expect(attributes).toHaveProperty('permissions');
    });
  });

  describe('Attribute Configuration', () => {
    it('should have id as primary key with auto increment', () => {
      const attributes = Domain.getAttributes();
      const idAttr = attributes.id;
      
      expect(idAttr.primaryKey).toBe(true);
      expect(idAttr.autoIncrement).toBe(true);
      expect(idAttr.allowNull).toBe(false);
    });

    it('should have domain as unique and not null', () => {
      const attributes = Domain.getAttributes();
      const domainAttr = attributes.domain;
      
      expect(domainAttr.unique).toBe(true);
      expect(domainAttr.allowNull).toBe(false);
    });

    it('should have title as nullable string', () => {
      const attributes = Domain.getAttributes();
      const titleAttr = attributes.title;
      
      expect(titleAttr.allowNull).toBe(true);
      expect(titleAttr.defaultValue).toBeNull();
    });

    it('should have author as nullable string', () => {
      const attributes = Domain.getAttributes();
      const authorAttr = attributes.author;
      
      expect(authorAttr.allowNull).toBe(true);
      expect(authorAttr.defaultValue).toBeNull();
    });

    it('should have description as nullable string', () => {
      const attributes = Domain.getAttributes();
      const descAttr = attributes.description;
      
      expect(descAttr.allowNull).toBe(true);
      expect(descAttr.defaultValue).toBeNull();
    });

    it('should have keywords as nullable string', () => {
      const attributes = Domain.getAttributes();
      const keywordsAttr = attributes.keywords;
      
      expect(keywordsAttr.allowNull).toBe(true);
      expect(keywordsAttr.defaultValue).toBeNull();
    });

    it('should have links as nullable JSON', () => {
      const attributes = Domain.getAttributes();
      const linksAttr = attributes.links;
      
      expect(linksAttr.allowNull).toBe(true);
      expect(linksAttr.defaultValue).toBeNull();
    });

    it('should have permissions as nullable JSON', () => {
      const attributes = Domain.getAttributes();
      const permissionsAttr = attributes.permissions;
      
      expect(permissionsAttr.allowNull).toBe(true);
      expect(permissionsAttr.defaultValue).toBeNull();
    });
  });

  describe('Index Configuration', () => {
    it('should have unique index on domain field', () => {
      const indexes = Domain.options.indexes;
      
      expect(indexes).toBeDefined();
      expect(indexes).toHaveLength(1);
      
      const domainIndex = indexes![0];
      expect(domainIndex.unique).toBe(true);
      expect(domainIndex.fields).toContain('domain');
      expect(domainIndex.name).toBe('domain');
    });
  });

  describe('Type Interfaces', () => {
    it('should allow creating DomainAttributes with all fields', () => {
      const attrs: DomainAttributes = {
        id: 1,
        domain: 'example.com',
        title: 'Example Title',
        author: 'John Doe',
        description: 'Example description',
        keywords: 'example, test',
        links: { home: 'https://example.com' },
        permissions: { read: true, write: false },
      };

      expect(attrs.id).toBe(1);
      expect(attrs.domain).toBe('example.com');
      expect(attrs.title).toBe('Example Title');
      expect(attrs.author).toBe('John Doe');
      expect(attrs.description).toBe('Example description');
      expect(attrs.keywords).toBe('example, test');
      expect(attrs.links).toEqual({ home: 'https://example.com' });
      expect(attrs.permissions).toEqual({ read: true, write: false });
    });

    it('should allow creating DomainAttributes with null optional fields', () => {
      const attrs: DomainAttributes = {
        id: 1,
        domain: 'example.com',
        title: null,
        author: null,
        description: null,
        keywords: null,
        links: null,
        permissions: null,
      };

      expect(attrs.id).toBe(1);
      expect(attrs.domain).toBe('example.com');
      expect(attrs.title).toBeNull();
      expect(attrs.author).toBeNull();
      expect(attrs.description).toBeNull();
      expect(attrs.keywords).toBeNull();
      expect(attrs.links).toBeNull();
      expect(attrs.permissions).toBeNull();
    });

    it('should allow creating DomainCreationAttributes without id', () => {
      const creationAttrs: DomainCreationAttributes = {
        domain: 'example.com',
        title: 'Example Title',
        author: 'John Doe',
        description: 'Example description',
        keywords: 'example, test',
        links: { home: 'https://example.com' },
      };

      expect(creationAttrs.domain).toBe('example.com');
      expect(creationAttrs.title).toBe('Example Title');
      expect(creationAttrs.id).toBeUndefined();
    });

    it('should allow creating DomainCreationAttributes with id', () => {
      const creationAttrs: DomainCreationAttributes = {
        id: 1,
        domain: 'example.com',
        title: 'Example Title',
        author: 'John Doe',
        description: 'Example description',
        keywords: 'example, test',
        links: { home: 'https://example.com' },
      };

      expect(creationAttrs.id).toBe(1);
      expect(creationAttrs.domain).toBe('example.com');
    });
  });
});
