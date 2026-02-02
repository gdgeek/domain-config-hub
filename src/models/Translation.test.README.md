# Translation Database Schema Validation Tests

## Overview

This test file validates the database schema for the `translations` table, ensuring that all requirements from the multilingual content support specification are met.

## Test Coverage

### 1. Table Structure Validation
- ✅ Verifies translations table exists
- ✅ Validates all columns with correct data types:
  - `id` (INT, PRIMARY KEY, AUTO_INCREMENT)
  - `config_id` (INT, NOT NULL)
  - `language_code` (VARCHAR(10), NOT NULL)
  - `title` (VARCHAR(200), NOT NULL)
  - `author` (VARCHAR(100), NOT NULL)
  - `description` (VARCHAR(1000), NOT NULL)
  - `keywords` (TEXT, NOT NULL)
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### 2. Index Validation
- ✅ Unique composite index on (config_id, language_code)
- ✅ Index on language_code for efficient queries

### 3. Foreign Key Constraint Validation
- ✅ Foreign key from translations.config_id to configs.id
- ✅ CASCADE delete rule on foreign key

### 4. Cascade Delete Behavior
- ✅ Deleting a config cascades to all its translations
- ✅ Deleting individual translations doesn't affect the config
- ✅ Cannot create translations for non-existent configs

### 5. Unique Constraint Validation
- ✅ Prevents duplicate translations for same config and language
- ✅ Allows same language code for different configs

## Requirements Validated

- **Requirement 10.1**: translations table with correct columns
- **Requirement 10.2**: unique composite index on (config_id, language_code)
- **Requirement 10.3**: foreign key constraint with CASCADE delete
- **Requirement 10.4**: index on language_code

## Prerequisites

Before running these tests, ensure:

1. **MySQL Database is running**
   ```bash
   # Using Docker Compose
   make up-redis
   
   # Or manually
   docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d
   ```

2. **Database migrations have been applied**
   ```bash
   # Run migration 004 to create translations table
   mysql -u root -p domain_config < migrations/004_create_translations_table.sql
   
   # Run migration 005 to migrate existing data
   mysql -u root -p domain_config < migrations/005_migrate_config_data_to_translations.sql
   ```

3. **Environment variables are configured**
   ```bash
   # Ensure .env file has correct database settings
   DB_HOST=localhost  # or mysql for Docker
   DB_PORT=3306
   DB_NAME=domain_config
   DB_USER=root
   DB_PASSWORD=password
   ```

## Running the Tests

### Run all tests
```bash
npm test -- src/models/Translation.test.ts
```

### Run with coverage
```bash
npm run test:coverage -- src/models/Translation.test.ts
```

### Run in watch mode
```bash
npm run test:watch -- src/models/Translation.test.ts
```

## Test Structure

```
Translation Table Schema Validation
├── Table Structure Validation
│   ├── should have translations table created
│   └── should have correct columns with proper data types
├── Index Validation
│   ├── should have unique composite index on (config_id, language_code)
│   └── should have index on language_code
├── Foreign Key Constraint Validation
│   ├── should have foreign key constraint from translations.config_id to configs.id
│   └── should have CASCADE delete rule on foreign key
├── Cascade Delete Behavior
│   ├── should cascade delete translations when config is deleted
│   ├── should allow deleting individual translations without affecting config
│   └── should prevent creating translation for non-existent config
└── Unique Constraint Validation
    ├── should prevent duplicate translations for same config and language
    └── should allow same language code for different configs
```

## Troubleshooting

### Database Connection Issues

If you encounter "Access denied" errors:

1. Check your `.env` file has correct credentials
2. Ensure MySQL container is running: `docker ps | grep mysql`
3. Test connection manually:
   ```bash
   mysql -h localhost -P 3306 -u root -p domain_config
   ```

### Table Not Found

If tests fail with "Table 'translations' doesn't exist":

1. Verify migrations have been run:
   ```bash
   mysql -u root -p domain_config -e "SHOW TABLES;"
   ```

2. Run the migration manually:
   ```bash
   mysql -u root -p domain_config < migrations/004_create_translations_table.sql
   ```

### Docker Issues

If Docker services won't start:

1. Check Docker is running: `docker ps`
2. Check logs: `make logs`
3. Rebuild images: `make build`
4. Clean and restart: `make clean && make up-redis`

## Notes

- These tests use direct SQL queries via Sequelize to validate the database schema
- Tests clean up after themselves by deleting test data
- Test data uses "Test Config%" pattern for easy identification and cleanup
- All tests are isolated and can run independently

## Related Files

- Migration: `migrations/004_create_translations_table.sql`
- Data Migration: `migrations/005_migrate_config_data_to_translations.sql`
- Verification: `migrations/verify_005.sql`
- Rollback: `migrations/rollback_004.sql`, `migrations/rollback_005.sql`
