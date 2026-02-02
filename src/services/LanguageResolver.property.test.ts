/**
 * Property-Based Tests for LanguageResolver
 * 
 * 使用 fast-check 进行属性测试，验证语言解析器的通用正确性属性
 * 
 * Requirements: 1.2, 2.1, 2.2, 2.3, 2.5, 8.1, 9.3
 */

import * as fc from 'fast-check';
import { Request } from 'express';
import { LanguageResolver } from './LanguageResolver';

describe('LanguageResolver - Property-Based Tests', () => {
  let resolver: LanguageResolver;

  beforeEach(() => {
    resolver = new LanguageResolver({
      defaultLanguage: 'zh-cn',
      supportedLanguages: ['zh-cn', 'en-us', 'ja-jp'],
    });
  });

  /**
   * Property 2: Language Code Validation and Normalization
   * 
   * For any language code input, the system should accept only valid BCP 47 format codes
   * (e.g., zh-CN, en-US, ja-JP), normalize them to lowercase with hyphen format
   * (zh-cn, en-us, ja-jp), and reject invalid codes with a 400 error.
   * 
   * **Validates: Requirements 1.2, 2.5, 8.1, 9.3**
   */
  describe('Property 2: Language Code Validation and Normalization', () => {
    // Arbitrary for valid BCP 47 language codes (simplified)
    const validLanguageCodeArbitrary = fc.tuple(
      fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'z'), { minLength: 2, maxLength: 3 }),
      fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'Z'), { minLength: 2, maxLength: 2 })
    ).map(([lang, region]) => `${lang}-${region}`);

    it('should normalize any valid language code to lowercase with hyphen', () => {
      fc.assert(
        fc.property(validLanguageCodeArbitrary, (code) => {
          const normalized = resolver.normalizeLanguageCode(code);
          
          // Property: normalized code should be lowercase
          expect(normalized).toBe(normalized.toLowerCase());
          
          // Property: normalized code should use hyphens, not underscores
          expect(normalized).not.toContain('_');
          
          // Property: normalized code should contain only lowercase letters and hyphens
          expect(normalized).toMatch(/^[a-z-]+$/);
        }),
        { numRuns: 100 }
      );
    });

    it('should normalize codes with underscores to hyphens', () => {
      fc.assert(
        fc.property(validLanguageCodeArbitrary, (code) => {
          // Replace hyphen with underscore
          const codeWithUnderscore = code.replace(/-/g, '_');
          const normalized = resolver.normalizeLanguageCode(codeWithUnderscore);
          
          // Property: result should not contain underscores
          expect(normalized).not.toContain('_');
          
          // Property: result should be lowercase
          expect(normalized).toBe(normalized.toLowerCase());
        }),
        { numRuns: 100 }
      );
    });

    it('should be idempotent - normalizing twice gives same result', () => {
      fc.assert(
        fc.property(validLanguageCodeArbitrary, (code) => {
          const normalized1 = resolver.normalizeLanguageCode(code);
          const normalized2 = resolver.normalizeLanguageCode(normalized1);
          
          // Property: normalizing is idempotent
          expect(normalized1).toBe(normalized2);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly validate supported vs unsupported languages', () => {
      const supportedCodes = ['zh-cn', 'en-us', 'ja-jp'];
      const supportedArbitrary = fc.constantFrom(...supportedCodes);
      
      fc.assert(
        fc.property(supportedArbitrary, (code) => {
          // Property: all supported codes should be recognized as supported
          expect(resolver.isSupported(code)).toBe(true);
          
          // Property: supported codes in different cases should still be recognized
          expect(resolver.isSupported(code.toUpperCase())).toBe(true);
          expect(resolver.isSupported(code.replace(/-/g, '_'))).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject unsupported language codes', () => {
      // Generate language codes that are definitely not in our supported list
      const unsupportedArbitrary = fc.tuple(
        fc.stringOf(fc.constantFrom('x', 'y', 'q'), { minLength: 2, maxLength: 2 }),
        fc.stringOf(fc.constantFrom('X', 'Y', 'Q'), { minLength: 2, maxLength: 2 })
      ).map(([lang, region]) => `${lang}-${region}`);

      fc.assert(
        fc.property(unsupportedArbitrary, (code) => {
          // Property: unsupported codes should be recognized as unsupported
          expect(resolver.isSupported(code)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Accept-Language Header Parsing
   * 
   * For any valid Accept-Language header (including quality values and multiple languages),
   * the system should correctly parse it and extract the highest-priority supported language code.
   * 
   * **Validates: Requirements 2.1**
   */
  describe('Property 5: Accept-Language Header Parsing', () => {
    const supportedLanguages = ['zh-cn', 'en-us', 'ja-jp'];
    const languageArbitrary = fc.constantFrom(...supportedLanguages);
    
    // Arbitrary for quality values (0.0 to 1.0)
    const qualityArbitrary = fc.double({ min: 0.0, max: 1.0, noNaN: true })
      .map(q => Math.round(q * 10) / 10); // Round to 1 decimal place

    it('should extract the highest quality supported language', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(languageArbitrary, qualityArbitrary), { minLength: 1, maxLength: 5 }),
          (languagesWithQuality) => {
            // Build Accept-Language header
            const header = languagesWithQuality
              .map(([lang, q]) => q === 1.0 ? lang : `${lang};q=${q}`)
              .join(',');
            
            const result = resolver.parseAcceptLanguage(header);
            
            // Property: result should be one of the supported languages
            expect(supportedLanguages).toContain(result);
            
            // Property: result should be the language with highest quality
            const maxQuality = Math.max(...languagesWithQuality.map(([, q]) => q));
            const expectedLanguages = languagesWithQuality
              .filter(([, q]) => q === maxQuality)
              .map(([lang]) => resolver.normalizeLanguageCode(lang));
            
            expect(expectedLanguages).toContain(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when no supported language is in header', () => {
      const unsupportedArbitrary = fc.constantFrom('fr-fr', 'de-de', 'es-es', 'it-it');
      
      fc.assert(
        fc.property(
          fc.array(unsupportedArbitrary, { minLength: 1, maxLength: 3 }),
          (languages) => {
            const header = languages.join(',');
            const result = resolver.parseAcceptLanguage(header);
            
            // Property: should return null when no supported language found
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle headers with and without quality values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(languageArbitrary, fc.boolean()),
            { minLength: 1, maxLength: 5 }
          ),
          (languagesWithQFlag) => {
            // Build header with some languages having q values and some not
            const header = languagesWithQFlag
              .map(([lang, hasQ], idx) => 
                hasQ ? `${lang};q=${0.9 - idx * 0.1}` : lang
              )
              .join(',');
            
            const result = resolver.parseAcceptLanguage(header);
            
            // Property: result should be a supported language
            expect(result).not.toBeNull();
            expect(supportedLanguages).toContain(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize language codes in Accept-Language header', () => {
      fc.assert(
        fc.property(languageArbitrary, (lang) => {
          // Create variations of the language code
          const variations = [
            lang.toUpperCase(),
            lang.replace(/-/g, '_'),
            lang.toUpperCase().replace(/-/g, '_'),
          ];
          
          for (const variation of variations) {
            const result = resolver.parseAcceptLanguage(variation);
            
            // Property: all variations should resolve to the same normalized code
            expect(result).toBe(resolver.normalizeLanguageCode(lang));
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 6: Language Request Priority
   * 
   * For any request with both Accept-Language header and language query parameter,
   * the query parameter should always take precedence over the header value.
   * 
   * **Validates: Requirements 2.3**
   */
  describe('Property 6: Language Request Priority', () => {
    const supportedLanguages = ['zh-cn', 'en-us', 'ja-jp'];
    const languageArbitrary = fc.constantFrom(...supportedLanguages);

    it('should always prioritize query parameter over Accept-Language header', () => {
      fc.assert(
        fc.property(
          languageArbitrary,
          languageArbitrary,
          (queryLang, headerLang) => {
            const req = {
              query: { lang: queryLang },
              headers: { 'accept-language': headerLang },
            } as unknown as Request;

            const result = resolver.resolveLanguage(req);
            
            // Property: result should match the query parameter (normalized)
            expect(result).toBe(resolver.normalizeLanguageCode(queryLang));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use Accept-Language when query parameter is absent', () => {
      fc.assert(
        fc.property(languageArbitrary, (headerLang) => {
          const req = {
            query: {},
            headers: { 'accept-language': headerLang },
          } as unknown as Request;

          const result = resolver.resolveLanguage(req);
          
          // Property: result should match the header language (normalized)
          expect(result).toBe(resolver.normalizeLanguageCode(headerLang));
        }),
        { numRuns: 100 }
      );
    });

    it('should use default language when both are absent', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const req = {
            query: {},
            headers: {},
          } as unknown as Request;

          const result = resolver.resolveLanguage(req);
          
          // Property: result should be the default language
          expect(result).toBe(resolver.getDefaultLanguage());
        }),
        { numRuns: 100 }
      );
    });

    it('should fall back correctly when query param is unsupported', () => {
      const unsupportedArbitrary = fc.constantFrom('fr-fr', 'de-de', 'es-es');
      
      fc.assert(
        fc.property(
          unsupportedArbitrary,
          languageArbitrary,
          (unsupportedLang, supportedLang) => {
            const req = {
              query: { lang: unsupportedLang },
              headers: { 'accept-language': supportedLang },
            } as unknown as Request;

            const result = resolver.resolveLanguage(req);
            
            // Property: should fall back to Accept-Language when query param is unsupported
            expect(result).toBe(resolver.normalizeLanguageCode(supportedLang));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 24: Query Parameter Language Resolution
   * 
   * For any request with a language query parameter, the system should use that
   * parameter value as the requested language, regardless of other language indicators.
   * 
   * **Validates: Requirements 2.2**
   */
  describe('Property 24: Query Parameter Language Resolution', () => {
    const supportedLanguages = ['zh-cn', 'en-us', 'ja-jp'];
    const languageArbitrary = fc.constantFrom(...supportedLanguages);

    it('should use query parameter regardless of Accept-Language header', () => {
      fc.assert(
        fc.property(
          languageArbitrary,
          fc.array(languageArbitrary, { minLength: 1, maxLength: 3 }),
          (queryLang, headerLangs) => {
            const req = {
              query: { lang: queryLang },
              headers: { 'accept-language': headerLangs.join(',') },
            } as unknown as Request;

            const result = resolver.resolveLanguage(req);
            
            // Property: result must be the query parameter value (normalized)
            expect(result).toBe(resolver.normalizeLanguageCode(queryLang));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should normalize query parameter language code', () => {
      fc.assert(
        fc.property(languageArbitrary, (lang) => {
          // Create variations with different cases and separators
          const variations = [
            lang,
            lang.toUpperCase(),
            lang.replace(/-/g, '_'),
            lang.toUpperCase().replace(/-/g, '_'),
          ];

          for (const variation of variations) {
            const req = {
              query: { lang: variation },
              headers: {},
            } as unknown as Request;

            const result = resolver.resolveLanguage(req);
            
            // Property: all variations should resolve to the same normalized code
            expect(result).toBe(resolver.normalizeLanguageCode(lang));
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle query parameter with various formats', () => {
      fc.assert(
        fc.property(
          languageArbitrary,
          fc.constantFrom('-', '_'),
          fc.constantFrom('lower', 'upper', 'mixed'),
          (lang, separator, caseType) => {
            let formattedLang = lang.replace(/-/g, separator);
            
            if (caseType === 'upper') {
              formattedLang = formattedLang.toUpperCase();
            } else if (caseType === 'mixed') {
              formattedLang = formattedLang.split('').map((c, i) => 
                i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()
              ).join('');
            }

            const req = {
              query: { lang: formattedLang },
              headers: {},
            } as unknown as Request;

            const result = resolver.resolveLanguage(req);
            
            // Property: should normalize to standard format
            expect(result).toBe(resolver.normalizeLanguageCode(lang));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Property: Consistency of getSupportedLanguages
   */
  describe('Additional Property: Consistency', () => {
    it('should return consistent supported languages list', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const languages1 = resolver.getSupportedLanguages();
          const languages2 = resolver.getSupportedLanguages();
          
          // Property: should return same content (but different array instances)
          expect(languages1).toEqual(languages2);
          expect(languages1.sort()).toEqual(languages2.sort());
        }),
        { numRuns: 100 }
      );
    });

    it('should have default language in supported languages or work independently', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const defaultLang = resolver.getDefaultLanguage();
          
          // Property: default language should be a valid language code
          expect(defaultLang).toMatch(/^[a-z-]+$/);
          expect(defaultLang).not.toContain('_');
          
          // Note: default language doesn't have to be in supported list
          // (though it's recommended in practice)
        }),
        { numRuns: 100 }
      );
    });
  });
});
