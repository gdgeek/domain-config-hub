# LanguageResolver Service

## Overview

The `LanguageResolver` service is responsible for resolving language codes from HTTP requests, supporting multiple language sources (query parameters, Accept-Language headers), and providing language code validation and normalization functionality.

## Features

### 1. Language Resolution
- **Priority Order**: Query parameter > Accept-Language header > Default language
- **Automatic Normalization**: Converts language codes to lowercase with hyphen format
- **Fallback Support**: Returns default language when requested language is not supported

### 2. Language Code Normalization
- Converts underscores to hyphens (e.g., `zh_CN` → `zh-cn`)
- Converts to lowercase (e.g., `ZH-CN` → `zh-cn`)
- Idempotent operation (normalizing twice gives same result)

### 3. Accept-Language Header Parsing
- Parses standard Accept-Language headers with quality values
- Respects quality values (q parameter) for language prioritization
- Returns the highest-priority supported language
- Handles malformed headers gracefully

### 4. Language Validation
- Validates if a language code is supported
- Normalizes before validation for consistent results

## Usage

### Basic Usage

```typescript
import { LanguageResolver, createDefaultLanguageResolver } from './services/LanguageResolver';

// Create resolver with default configuration
const resolver = createDefaultLanguageResolver();

// Or create with custom configuration
const customResolver = new LanguageResolver({
  defaultLanguage: 'zh-cn',
  supportedLanguages: ['zh-cn', 'en-us', 'ja-jp'],
});
```

### Resolving Language from Request

```typescript
import { Request } from 'express';

// In an Express route handler
app.get('/api/configs/:id', (req: Request, res: Response) => {
  const language = resolver.resolveLanguage(req);
  // language will be one of: zh-cn, en-us, ja-jp (or default)
  
  // Use the language to fetch appropriate translation
  // ...
});
```

### Examples

#### Query Parameter Priority
```typescript
// Request: GET /api/configs/1?lang=en-us
// Headers: Accept-Language: zh-CN
const req = {
  query: { lang: 'en-us' },
  headers: { 'accept-language': 'zh-CN' }
};
resolver.resolveLanguage(req); // Returns: 'en-us'
```

#### Accept-Language Header
```typescript
// Request: GET /api/configs/1
// Headers: Accept-Language: en-US,zh-CN;q=0.9,ja-JP;q=0.8
const req = {
  query: {},
  headers: { 'accept-language': 'en-US,zh-CN;q=0.9,ja-JP;q=0.8' }
};
resolver.resolveLanguage(req); // Returns: 'en-us'
```

#### Default Language Fallback
```typescript
// Request: GET /api/configs/1
// No language specified
const req = {
  query: {},
  headers: {}
};
resolver.resolveLanguage(req); // Returns: 'zh-cn' (default)
```

### Language Code Normalization

```typescript
resolver.normalizeLanguageCode('zh_CN');  // Returns: 'zh-cn'
resolver.normalizeLanguageCode('EN-US');  // Returns: 'en-us'
resolver.normalizeLanguageCode('JA_jp');  // Returns: 'ja-jp'
```

### Language Validation

```typescript
resolver.isSupported('zh-cn');    // Returns: true
resolver.isSupported('ZH_CN');    // Returns: true (normalized first)
resolver.isSupported('fr-fr');    // Returns: false
```

### Getting Configuration

```typescript
resolver.getDefaultLanguage();      // Returns: 'zh-cn'
resolver.getSupportedLanguages();   // Returns: ['zh-cn', 'en-us', 'ja-jp']
```

## Configuration

### Default Configuration

The default configuration supports three languages:
- **zh-cn** (Chinese Simplified) - Default language
- **en-us** (English US)
- **ja-jp** (Japanese)

### Custom Configuration

You can create a custom resolver with different languages:

```typescript
const resolver = new LanguageResolver({
  defaultLanguage: 'en-us',
  supportedLanguages: ['en-us', 'en-gb', 'fr-fr', 'de-de'],
});
```

## Requirements Satisfied

- **Requirement 2.1**: Parse Accept-Language header to extract requested language code
- **Requirement 2.2**: Use query parameter value as requested language code
- **Requirement 2.3**: Prioritize query parameter over Accept-Language header
- **Requirement 2.5**: Normalize language codes to lowercase with hyphen format
- **Requirement 9.1**: Maintain list of supported language codes and provide validation

## Testing

The service is thoroughly tested with both unit tests and property-based tests:

### Unit Tests (40 tests)
- Language code normalization (various formats)
- Accept-Language header parsing (simple, complex, with quality values)
- Language resolution priority (query param > header > default)
- Language validation
- Edge cases and error handling

### Property-Based Tests (18 tests)
- **Property 2**: Language Code Validation and Normalization
- **Property 5**: Accept-Language Header Parsing
- **Property 6**: Language Request Priority
- **Property 24**: Query Parameter Language Resolution

All tests run with 100 iterations to ensure correctness across a wide range of inputs.

## Implementation Details

### Language Code Format

The service follows the BCP 47 standard for language codes:
- Format: `language-region` (e.g., `zh-cn`, `en-us`)
- Always lowercase
- Always uses hyphens (not underscores)

### Accept-Language Header Format

Supports standard Accept-Language header format:
```
Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,ja-JP;q=0.7
```

- Multiple languages separated by commas
- Optional quality values (q parameter) from 0.0 to 1.0
- Default quality is 1.0 if not specified
- Languages sorted by quality in descending order

### Fallback Behavior

1. If query parameter is present and supported → use it
2. Else if Accept-Language header is present and contains supported language → use highest priority supported language
3. Else → use default language

## Files

- `src/services/LanguageResolver.ts` - Main implementation
- `src/services/LanguageResolver.unit.test.ts` - Unit tests
- `src/services/LanguageResolver.property.test.ts` - Property-based tests
- `src/services/LanguageResolver.README.md` - This documentation

## Next Steps

This service will be used by:
- Translation Service (for language validation and normalization)
- Config Service (for resolving language from requests)
- API Routes (for language resolution middleware)
