# Multilingual Content Support Migration Guide

## Overview

This guide helps you migrate your existing Domain Configuration Management Service to support multilingual content. The migration is designed to be backward compatible, ensuring existing API clients continue to work without modifications.

## Prerequisites

- MySQL 8.0 or higher
- Redis (optional, but recommended for production)
- Node.js 14 or higher
- Existing domain configuration service running

## Migration Steps

### Step 1: Database Schema Migration

Run the database migration scripts to create the `translations` table:

```bash
# Navigate to the project root
cd /path/to/domain-config-service

# Run migration 004: Create translations table
mysql -u root -p domain_config < migrations/004_create_translations_table.sql

# Verify the table was created
mysql -u root -p domain_config -e "SHOW TABLES LIKE 'translations';"
```

**What this does**:
- Creates the `translations` table with columns: `id`, `config_id`, `language_code`, `title`, `author`, `description`, `keywords`, `created_at`, `updated_at`
- Adds unique composite index on `(config_id, language_code)`
- Adds foreign key constraint with CASCADE delete
- Adds index on `language_code` for performance

### Step 2: Data Migration

Migrate existing configuration data to the translations table:

```bash
# Run migration 005: Migrate existing data
mysql -u root -p domain_config < migrations/005_migrate_config_data_to_translations.sql

# Verify the migration
mysql -u root -p domain_config < migrations/verify_005.sql
```

**What this does**:
- Copies existing `title`, `author`, `description`, `keywords` from `configs` table to `translations` table
- Creates default language (`zh-cn`) translations for all existing configs
- Preserves all existing data
- **Note**: The original columns in `configs` table are kept for backward compatibility

### Step 3: Environment Configuration

Add multilingual configuration to your `.env` file:

```bash
# Add these lines to your .env file
DEFAULT_LANGUAGE=zh-cn
SUPPORTED_LANGUAGES=zh-cn,en-us,ja-jp
```

**Configuration Options**:
- `DEFAULT_LANGUAGE`: The default language code (default: `zh-cn`)
- `SUPPORTED_LANGUAGES`: Comma-separated list of supported language codes (default: `zh-cn,en-us,ja-jp`)

### Step 4: Application Deployment

Deploy the updated application code:

```bash
# Pull the latest code
git pull origin main

# Install dependencies
npm install

# Build the application
npm run build

# Restart the service
pm2 restart domain-config-service
# OR
systemctl restart domain-config-service
```

### Step 5: Verification

Verify the multilingual functionality is working:

```bash
# Test 1: Get config without language (should return default zh-cn)
curl http://localhost:3000/api/v1/configs/1

# Test 2: Get config with specific language
curl http://localhost:3000/api/v1/configs/1?lang=en-us

# Test 3: Get supported languages
curl http://localhost:3000/api/v1/languages

# Test 4: Create a new translation
curl -X POST http://localhost:3000/api/v1/configs/1/translations \
  -H "Content-Type: application/json" \
  -d '{
    "languageCode": "en-us",
    "title": "English Title",
    "author": "John Doe",
    "description": "English description",
    "keywords": ["english", "test"]
  }'
```

## Rollback Procedure

If you need to rollback the migration:

```bash
# Rollback migration 005 (data migration)
mysql -u root -p domain_config < migrations/rollback_005.sql

# Rollback migration 004 (schema migration)
mysql -u root -p domain_config < migrations/rollback_004.sql
```

**Warning**: Rolling back will delete all translation data. Make sure to backup your database before rolling back.

## Client Migration Guide

### For Existing API Clients

**Good News**: No changes required! The API is fully backward compatible.

Existing API calls will continue to work:
```javascript
// This still works and returns default language (zh-cn)
fetch('/api/v1/configs/123')
```

### For New Multilingual Clients

To support multiple languages in your client:

#### 1. Using Query Parameter

```javascript
// Request specific language
const response = await fetch('/api/v1/configs/123?lang=en-us');
const config = await response.json();
```

#### 2. Using Accept-Language Header

```javascript
// Browser automatically sends Accept-Language
const response = await fetch('/api/v1/configs/123', {
  headers: {
    'Accept-Language': navigator.language
  }
});
```

#### 3. Handling Language Fallback

```javascript
const response = await fetch('/api/v1/configs/123?lang=ja-jp');
const contentLanguage = response.headers.get('X-Content-Language');

if (contentLanguage !== 'ja-jp') {
  console.log(`Requested ja-jp but got ${contentLanguage}`);
  // Show a message to user or handle fallback
}
```

#### 4. Managing Translations

```javascript
// Create a new translation
await fetch('/api/v1/configs/123/translations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    languageCode: 'en-us',
    title: 'English Title',
    author: 'John Doe',
    description: 'English description',
    keywords: ['english', 'test']
  })
});

// Update a translation
await fetch('/api/v1/configs/123/translations/en-us', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Updated English Title'
  })
});

// Get all translations for a config
const translations = await fetch('/api/v1/configs/123/translations');

// Delete a translation
await fetch('/api/v1/configs/123/translations/en-us', {
  method: 'DELETE'
});
```

## Common Migration Issues

### Issue 1: Foreign Key Constraint Errors

**Symptom**: Error when running migration 004
```
ERROR 1215 (HY000): Cannot add foreign key constraint
```

**Solution**: Ensure the `configs` table exists and has the correct structure:
```sql
SHOW CREATE TABLE configs;
```

### Issue 2: Data Migration Fails

**Symptom**: Error when running migration 005
```
ERROR 1062 (23000): Duplicate entry
```

**Solution**: Check if translations already exist:
```sql
SELECT COUNT(*) FROM translations;
```

If translations exist, you may need to clean them up before re-running the migration.

### Issue 3: Redis Connection Issues

**Symptom**: Application logs show Redis connection errors

**Solution**: 
1. Check if Redis is running: `redis-cli ping`
2. Verify Redis configuration in `.env`
3. If Redis is not available, set `REDIS_ENABLED=false` in `.env` (multilingual features will still work, but without caching)

### Issue 4: Language Not Supported

**Symptom**: API returns 400 error for valid language code

**Solution**: Add the language to `SUPPORTED_LANGUAGES` in `.env`:
```bash
SUPPORTED_LANGUAGES=zh-cn,en-us,ja-jp,ko-kr,fr-fr
```

## Performance Considerations

### Caching

The system uses Redis caching to improve performance:
- Cache TTL: 3600 seconds (1 hour)
- Cache key format: `config:{configId}:lang:{languageCode}`

**Recommendation**: Enable Redis in production for optimal performance.

### Database Indexes

The migration creates the following indexes:
- Unique composite index on `(config_id, language_code)`
- Index on `language_code`

These indexes ensure fast query performance even with large datasets.

### Query Optimization

When querying configs with translations:
- The system performs a JOIN between `configs` and `translations` tables
- Results are cached in Redis to minimize database queries
- Cache is automatically invalidated on updates

## Monitoring

### Key Metrics to Monitor

1. **Translation Cache Hit Rate**
   - Monitor Redis cache hit/miss ratio
   - Target: >80% cache hit rate

2. **Language Fallback Events**
   - Monitor logs for language fallback occurrences
   - High fallback rate may indicate missing translations

3. **API Response Times**
   - Monitor response times for multilingual endpoints
   - Should be similar to non-multilingual endpoints with caching enabled

### Logging

The system logs the following events:
- Language fallback events (when requested language is unavailable)
- Translation creation/update/deletion
- Cache invalidation events

Check application logs for these events:
```bash
tail -f logs/app.log | grep -i "language\|translation"
```

## Best Practices

### 1. Always Create Default Language First

When creating new configs, always create the default language translation first:

```javascript
// 1. Create config
const config = await createConfig({ links: {...}, permissions: {...} });

// 2. Create default language translation (zh-cn)
await createTranslation(config.id, {
  languageCode: 'zh-cn',
  title: '默认标题',
  author: '作者',
  description: '描述',
  keywords: ['关键词']
});

// 3. Create other translations
await createTranslation(config.id, {
  languageCode: 'en-us',
  title: 'English Title',
  ...
});
```

### 2. Handle Missing Translations Gracefully

Always check the `X-Content-Language` header to detect fallback:

```javascript
const response = await fetch('/api/v1/configs/123?lang=ja-jp');
const contentLanguage = response.headers.get('X-Content-Language');

if (contentLanguage !== 'ja-jp') {
  // Show a notice to the user
  showNotice(`Content is displayed in ${contentLanguage} (Japanese translation not available)`);
}
```

### 3. Batch Translation Creation

When creating multiple translations, use batch operations:

```javascript
const languages = ['en-us', 'ja-jp', 'ko-kr'];
const translations = languages.map(lang => ({
  languageCode: lang,
  title: getTitleForLanguage(lang),
  author: getAuthorForLanguage(lang),
  description: getDescriptionForLanguage(lang),
  keywords: getKeywordsForLanguage(lang)
}));

await Promise.all(
  translations.map(t => createTranslation(configId, t))
);
```

### 4. Translation Validation

Always validate translation content before submission:
- Title: max 200 characters
- Author: max 100 characters
- Description: max 1000 characters
- Keywords: array of strings

## Support and Troubleshooting

### Getting Help

- **API Documentation**: See [MULTILINGUAL_API.md](./MULTILINGUAL_API.md)
- **Usage Examples**: See [MULTILINGUAL_EXAMPLES.md](./MULTILINGUAL_EXAMPLES.md)
- **Architecture**: See [design.md](../.kiro/specs/multilingual-content-support/design.md)

### Common Questions

**Q: Can I remove the old columns from the configs table?**
A: Not recommended. The columns are kept for backward compatibility. Removing them may break existing clients.

**Q: What happens if I delete a config?**
A: All associated translations are automatically deleted (CASCADE delete).

**Q: Can I change the default language?**
A: Yes, update `DEFAULT_LANGUAGE` in `.env` and restart the service. However, ensure all configs have translations in the new default language.

**Q: How do I add support for a new language?**
A: Add the language code to `SUPPORTED_LANGUAGES` in `.env` and restart the service.

**Q: Do I need Redis for multilingual support?**
A: No, Redis is optional. The system works without Redis, but caching improves performance significantly.

## Conclusion

The multilingual content support migration is designed to be smooth and backward compatible. Follow this guide step by step, and your system will be ready to serve content in multiple languages while maintaining compatibility with existing clients.

For additional help, refer to the API documentation and usage examples.
