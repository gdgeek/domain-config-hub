/**
 * Unit Tests for Language Metadata API
 * 
 * Tests the /api/v1/languages endpoint
 * 
 * Requirements: 9.2, 9.5
 */

import request from 'supertest';
import { createApp } from '../app';
import { Express } from 'express';

describe('Language Metadata API - Unit Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/languages', () => {
    it('should return the list of supported languages', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      expect(response.body).toHaveProperty('default');
      expect(response.body).toHaveProperty('supported');
      expect(Array.isArray(response.body.supported)).toBe(true);
    });

    it('should return zh-cn as the default language', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      expect(response.body.default).toBe('zh-cn');
    });

    it('should include all supported languages (zh-cn, en-us, ja-jp)', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const languageCodes = response.body.supported.map((lang: any) => lang.code);
      expect(languageCodes).toContain('zh-cn');
      expect(languageCodes).toContain('en-us');
      expect(languageCodes).toContain('ja-jp');
      expect(languageCodes.length).toBe(3);
    });

    it('should include language metadata with code, name, and englishName', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const languages = response.body.supported;
      expect(languages.length).toBeGreaterThan(0);

      languages.forEach((lang: any) => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('englishName');
        expect(typeof lang.code).toBe('string');
        expect(typeof lang.name).toBe('string');
        expect(typeof lang.englishName).toBe('string');
      });
    });

    it('should return correct metadata for zh-cn', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const zhCn = response.body.supported.find((lang: any) => lang.code === 'zh-cn');
      expect(zhCn).toBeDefined();
      expect(zhCn.name).toBe('中文（简体）');
      expect(zhCn.englishName).toBe('Chinese (Simplified)');
    });

    it('should return correct metadata for en-us', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const enUs = response.body.supported.find((lang: any) => lang.code === 'en-us');
      expect(enUs).toBeDefined();
      expect(enUs.name).toBe('English (US)');
      expect(enUs.englishName).toBe('English (US)');
    });

    it('should return correct metadata for ja-jp', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const jaJp = response.body.supported.find((lang: any) => lang.code === 'ja-jp');
      expect(jaJp).toBeDefined();
      expect(jaJp.name).toBe('日本語');
      expect(jaJp.englishName).toBe('Japanese');
    });

    it('should return consistent data structure on multiple requests', async () => {
      const response1 = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      const response2 = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      expect(response1.body).toEqual(response2.body);
    });

    it('should not require authentication', async () => {
      // No Authorization header provided
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      expect(response.body).toHaveProperty('default');
      expect(response.body).toHaveProperty('supported');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/api/v1/languages')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
