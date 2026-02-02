# Multilingual Content Support API Documentation

## Overview

This document describes the multilingual content support API endpoints for the Domain Configuration Management Service. The system supports multiple languages for configuration content, with automatic fallback to default language when requested language is unavailable.

## Supported Languages

- **Default Language**: `zh-cn` (Chinese Simplified)
- **Supported Languages**: `zh-cn`, `en-us`, `ja-jp`

Languages can be configured via environment variables:
- `DEFAULT_LANGUAGE`: Set the default language (default: `zh-cn`)
- `SUPPORTED_LANGUAGES`: Comma-separated list of supported languages (default: `zh-cn,en-us,ja-jp`)

## Language Code Format

All language codes follow the BCP 47 standard and are normalized to lowercase with hyphen format:
- ✅ Correct: `zh-cn`, `en-us`, `ja-jp`
- ❌ Incorrect: `zh_CN`, `ZH-CN`, `zhCN`

## Translation Management API

### 1. Create Translation

Create a new translation for a configuration.

**Endpoint**: `POST /api/v1/configs/:configId/translations`

**Request Body**:
```json
{
  "languageCode": "en-us",
  "title": "Example Title",
  "author": "John Doe",
  "description": "This is an example description",
  "keywords": ["example", "test", "demo"]
}
```

**Response** (201 Created):
```json
{
  "id": 123,
  "configId": 456,
  "languageCode": "en-us",
  "title": "Example Title",
  "author": "John Doe",
  "description": "This is an example description",
  "keywords": ["example", "test", "demo"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid language code or validation error
- `404 Not Found`: Config not found
- `409 Conflict`: Translation already exists for this language

**Validation Rules**:
- `languageCode`: Must be a supported language code
- `title`: Required, max 200 characters
- `author`: Required, max 100 characters
- `description`: Required, max 1000 characters
- `keywords`: Required, must be an array of strings

---

### 2. Update Translation

Update an existing translation.

**Endpoint**: `PUT /api/v1/configs/:configId/translations/:languageCode`

**Request Body** (all fields optional):
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "keywords": ["updated", "keywords"]
}
```

**Response** (200 OK):
```json
{
  "id": 123,
  "configId": 456,
  "languageCode": "en-us",
  "title": "Updated Title",
  "author": "John Doe",
  "description": "Updated description",
  "keywords": ["updated", "keywords"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T11:45:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Validation error
- `404 Not Found`: Translation not found

---

### 3. Get All Translations for Config

Retrieve all translations for a specific configuration.

**Endpoint**: `GET /api/v1/configs/:configId/translations`

**Response** (200 OK):
```json
[
  {
    "id": 123,
    "configId": 456,
    "languageCode": "zh-cn",
    "title": "示例标题",
    "author": "张三",
    "description": "这是一个示例描述",
    "keywords": ["示例", "测试"],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  },
  {
    "id": 124,
    "configId": 456,
    "languageCode": "en-us",
    "title": "Example Title",
    "author": "John Doe",
    "description": "This is an example description",
    "keywords": ["example", "test"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

**Error Responses**:
- `404 Not Found`: Config not found

---

### 4. Delete Translation

Delete a translation for a specific language.

**Endpoint**: `DELETE /api/v1/configs/:configId/translations/:languageCode`

**Response** (204 No Content)

**Error Responses**:
- `400 Bad Request`: Cannot delete default language while other translations exist
- `404 Not Found`: Translation not found

**Important**: You cannot delete the default language translation (`zh-cn`) if other translations exist for the same config. Delete other translations first.

---

## Enhanced Config Query API

### 1. Get Config by ID (with language support)

Retrieve a configuration with translation in the specified language.

**Endpoint**: `GET /api/v1/configs/:id`

**Query Parameters**:
- `lang` (optional): Language code (e.g., `en-us`)

**Headers**:
- `Accept-Language` (optional): Standard HTTP header for language negotiation

**Priority**: Query parameter `lang` > `Accept-Language` header > Default language

**Response** (200 OK):
```json
{
  "id": 456,
  "title": "Example Title",
  "author": "John Doe",
  "description": "This is an example description",
  "keywords": ["example", "test"],
  "links": { "homepage": "https://example.com" },
  "permissions": { "read": true },
  "language": "en-us",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Response Headers**:
- `X-Content-Language`: Indicates the actual language returned (useful when fallback occurs)

**Examples**:

1. Request specific language via query parameter:
```bash
GET /api/v1/configs/456?lang=en-us
```

2. Request specific language via Accept-Language header:
```bash
GET /api/v1/configs/456
Accept-Language: en-US,zh-CN;q=0.9
```

3. Request without language (returns default):
```bash
GET /api/v1/configs/456
```

**Language Fallback**: If the requested language is not available, the system returns the default language (`zh-cn`) and sets `X-Content-Language: zh-cn`.

---

### 2. Get Config by Domain (with language support)

Retrieve a configuration by domain name with translation in the specified language.

**Endpoint**: `GET /api/v1/domains/:domain/config`

**Query Parameters**:
- `lang` (optional): Language code

**Headers**:
- `Accept-Language` (optional): Standard HTTP header

**Response**: Same as "Get Config by ID"

**Example**:
```bash
GET /api/v1/domains/example.com/config?lang=ja-jp
```

---

### 3. List Configs (with language support)

Retrieve a list of configurations with translations in the specified language.

**Endpoint**: `GET /api/v1/configs`

**Query Parameters**:
- `lang` (optional): Language code
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20, max: 100)

**Headers**:
- `Accept-Language` (optional): Standard HTTP header

**Response** (200 OK):
```json
[
  {
    "id": 456,
    "title": "Example Title",
    "author": "John Doe",
    "description": "This is an example description",
    "keywords": ["example", "test"],
    "links": { "homepage": "https://example.com" },
    "permissions": { "read": true },
    "language": "en-us",
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

---

## Language Metadata API

### Get Supported Languages

Retrieve the list of supported languages and default language.

**Endpoint**: `GET /api/v1/languages`

**Response** (200 OK):
```json
{
  "default": "zh-cn",
  "supported": [
    {
      "code": "zh-cn",
      "name": "中文（简体）",
      "englishName": "Chinese (Simplified)"
    },
    {
      "code": "en-us",
      "name": "English (US)",
      "englishName": "English (US)"
    },
    {
      "code": "ja-jp",
      "name": "日本語",
      "englishName": "Japanese"
    }
  ]
}
```

---

## Error Responses

All error responses follow a standard format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Optional additional details
    }
  }
}
```

### Common Error Codes

#### Validation Error (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Unsupported language code",
    "details": {
      "languageCode": "xx-XX",
      "supported": ["zh-cn", "en-us", "ja-jp"]
    }
  }
}
```

#### Not Found Error (404)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Translation not found for config 456 and language en-us"
  }
}
```

#### Conflict Error (409)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Translation already exists for config 456 and language en-us"
  }
}
```

#### Cannot Delete Default Language (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot delete default language translation while other translations exist",
    "details": {
      "languageCode": "zh-cn",
      "translationCount": 3
    }
  }
}
```

---

## Caching

The system uses Redis caching to improve performance:

- **Cache Key Format**: `config:{configId}:lang:{languageCode}`
- **Cache TTL**: 3600 seconds (1 hour)
- **Cache Invalidation**: Automatic on create, update, or delete operations

When a translation is updated or deleted, the corresponding cache entry is immediately invalidated.

---

## Backward Compatibility

The multilingual API is fully backward compatible with existing clients:

1. **No Language Parameter**: If no language is specified, the system returns the default language (`zh-cn`)
2. **Response Structure**: The response structure remains the same, with translatable fields merged into the config object
3. **Non-Translatable Fields**: Fields like `links` and `permissions` remain unchanged and are not affected by language selection

Existing API clients can continue to work without any modifications.

---

## Best Practices

### 1. Always Create Default Language First

When creating a new configuration, always create the default language (`zh-cn`) translation first:

```bash
# 1. Create config
POST /api/v1/configs
{ "links": {...}, "permissions": {...} }

# 2. Create default language translation
POST /api/v1/configs/456/translations
{
  "languageCode": "zh-cn",
  "title": "默认标题",
  "author": "作者",
  "description": "描述",
  "keywords": ["关键词"]
}

# 3. Create other language translations
POST /api/v1/configs/456/translations
{
  "languageCode": "en-us",
  "title": "English Title",
  ...
}
```

### 2. Handle Language Fallback

Always check the `X-Content-Language` response header to determine which language was actually returned:

```javascript
const response = await fetch('/api/v1/configs/456?lang=ja-jp');
const contentLanguage = response.headers.get('X-Content-Language');

if (contentLanguage !== 'ja-jp') {
  console.log(`Requested ja-jp but got ${contentLanguage} (fallback)`);
}
```

### 3. Use Accept-Language for Browser Clients

For browser-based clients, use the `Accept-Language` header which is automatically set by browsers:

```javascript
fetch('/api/v1/configs/456', {
  headers: {
    'Accept-Language': navigator.language
  }
});
```

### 4. Cache Considerations

When implementing client-side caching, include the language code in your cache key:

```javascript
const cacheKey = `config-${configId}-${languageCode}`;
```

---

## Rate Limiting

All API endpoints are subject to rate limiting:
- **Window**: 60 seconds
- **Max Requests**: 100 per window

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

---

## Support

For questions or issues related to the multilingual API, please refer to:
- [Migration Guide](./MULTILINGUAL_MIGRATION.md)
- [Usage Examples](./MULTILINGUAL_EXAMPLES.md)
- [Architecture Documentation](./architecture/multilingual-design.md)
