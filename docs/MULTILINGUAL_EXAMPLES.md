# Multilingual Content Support - Usage Examples

This document provides practical examples for using the multilingual content support API in various scenarios.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Translation Management](#translation-management)
3. [Client Integration](#client-integration)
4. [Advanced Scenarios](#advanced-scenarios)
5. [Best Practices](#best-practices)

---

## Basic Usage

### Example 1: Creating a Multilingual Configuration

```javascript
// Step 1: Create a new configuration
const createConfigResponse = await fetch('http://localhost:3000/api/v1/configs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    links: {
      homepage: 'https://example.com',
      documentation: 'https://docs.example.com'
    },
    permissions: {
      read: true,
      write: false
    }
  })
});

const config = await createConfigResponse.json();
const configId = config.id;

// Step 2: Create default language translation (zh-cn)
await fetch(`http://localhost:3000/api/v1/configs/${configId}/translations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    languageCode: 'zh-cn',
    title: '示例网站配置',
    author: '张三',
    description: '这是一个示例网站的配置信息',
    keywords: ['示例', '网站', '配置']
  })
});

// Step 3: Create English translation
await fetch(`http://localhost:3000/api/v1/configs/${configId}/translations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    languageCode: 'en-us',
    title: 'Example Website Configuration',
    author: 'John Doe',
    description: 'This is a configuration for an example website',
    keywords: ['example', 'website', 'configuration']
  })
});

// Step 4: Create Japanese translation
await fetch(`http://localhost:3000/api/v1/configs/${configId}/translations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    languageCode: 'ja-jp',
    title: 'サンプルウェブサイト設定',
    author: '田中太郎',
    description: 'これはサンプルウェブサイトの設定情報です',
    keywords: ['サンプル', 'ウェブサイト', '設定']
  })
});

console.log('Multilingual configuration created successfully!');
```

### Example 2: Querying Configuration in Different Languages

```javascript
// Query in Chinese (default)
const zhResponse = await fetch(`http://localhost:3000/api/v1/configs/${configId}`);
const zhConfig = await zhResponse.json();
console.log('Chinese:', zhConfig.title); // 示例网站配置

// Query in English
const enResponse = await fetch(`http://localhost:3000/api/v1/configs/${configId}?lang=en-us`);
const enConfig = await enResponse.json();
console.log('English:', enConfig.title); // Example Website Configuration

// Query in Japanese
const jaResponse = await fetch(`http://localhost:3000/api/v1/configs/${configId}?lang=ja-jp`);
const jaConfig = await jaResponse.json();
console.log('Japanese:', jaConfig.title); // サンプルウェブサイト設定
```

---

## Translation Management

### Example 3: Updating a Translation

```javascript
// Update the English translation
const updateResponse = await fetch(
  `http://localhost:3000/api/v1/configs/${configId}/translations/en-us`,
  {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Updated Example Website Configuration',
      description: 'This is an updated description for the example website',
      keywords: ['updated', 'example', 'website']
    })
  }
);

const updatedTranslation = await updateResponse.json();
console.log('Updated translation:', updatedTranslation);
```

### Example 4: Getting All Translations for a Config

```javascript
const translationsResponse = await fetch(
  `http://localhost:3000/api/v1/configs/${configId}/translations`
);
const translations = await translationsResponse.json();

console.log('Available translations:');
translations.forEach(t => {
  console.log(`- ${t.languageCode}: ${t.title}`);
});

// Output:
// Available translations:
// - zh-cn: 示例网站配置
// - en-us: Updated Example Website Configuration
// - ja-jp: サンプルウェブサイト設定
```

### Example 5: Deleting a Translation

```javascript
// Delete the Japanese translation
await fetch(
  `http://localhost:3000/api/v1/configs/${configId}/translations/ja-jp`,
  { method: 'DELETE' }
);

console.log('Japanese translation deleted');

// Note: You cannot delete the default language (zh-cn) if other translations exist
// This will fail:
try {
  await fetch(
    `http://localhost:3000/api/v1/configs/${configId}/translations/zh-cn`,
    { method: 'DELETE' }
  );
} catch (error) {
  console.error('Cannot delete default language while other translations exist');
}
```

---

## Client Integration

### Example 6: React Component with Language Selection

```jsx
import React, { useState, useEffect } from 'react';

function ConfigDisplay({ configId }) {
  const [config, setConfig] = useState(null);
  const [language, setLanguage] = useState('zh-cn');
  const [actualLanguage, setActualLanguage] = useState('zh-cn');

  useEffect(() => {
    fetchConfig();
  }, [configId, language]);

  const fetchConfig = async () => {
    const response = await fetch(
      `http://localhost:3000/api/v1/configs/${configId}?lang=${language}`
    );
    
    // Check if we got the requested language or a fallback
    const contentLanguage = response.headers.get('X-Content-Language');
    setActualLanguage(contentLanguage);
    
    const data = await response.json();
    setConfig(data);
  };

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  if (!config) return <div>Loading...</div>;

  return (
    <div>
      <div>
        <label>Language: </label>
        <select value={language} onChange={handleLanguageChange}>
          <option value="zh-cn">中文</option>
          <option value="en-us">English</option>
          <option value="ja-jp">日本語</option>
        </select>
      </div>

      {actualLanguage !== language && (
        <div className="warning">
          Translation not available in {language}. Showing {actualLanguage} instead.
        </div>
      )}

      <h1>{config.title}</h1>
      <p><strong>Author:</strong> {config.author}</p>
      <p><strong>Description:</strong> {config.description}</p>
      <p><strong>Keywords:</strong> {config.keywords.join(', ')}</p>
    </div>
  );
}

export default ConfigDisplay;
```

### Example 7: Vue.js Component with Browser Language Detection

```vue
<template>
  <div>
    <h1>{{ config.title }}</h1>
    <p><strong>Author:</strong> {{ config.author }}</p>
    <p><strong>Description:</strong> {{ config.description }}</p>
    <p><strong>Keywords:</strong> {{ config.keywords.join(', ') }}</p>
    
    <div v-if="isFallback" class="notice">
      Content is displayed in {{ actualLanguage }} ({{ requestedLanguage }} not available)
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfigDisplay',
  props: ['configId'],
  data() {
    return {
      config: null,
      requestedLanguage: '',
      actualLanguage: '',
      isFallback: false
    };
  },
  mounted() {
    this.fetchConfig();
  },
  methods: {
    async fetchConfig() {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      this.requestedLanguage = browserLang;
      
      const response = await fetch(
        `http://localhost:3000/api/v1/configs/${this.configId}`,
        {
          headers: {
            'Accept-Language': browserLang
          }
        }
      );
      
      this.actualLanguage = response.headers.get('X-Content-Language');
      this.isFallback = this.actualLanguage !== this.requestedLanguage;
      
      this.config = await response.json();
    }
  }
};
</script>
```

### Example 8: Node.js Backend Integration

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();

// Middleware to detect user's preferred language
app.use((req, res, next) => {
  // Priority: query param > Accept-Language header > default
  req.userLanguage = req.query.lang || 
                     req.headers['accept-language']?.split(',')[0]?.toLowerCase() || 
                     'zh-cn';
  next();
});

// Route to get config with user's language
app.get('/config/:id', async (req, res) => {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/configs/${req.params.id}?lang=${req.userLanguage}`
    );
    
    const config = await response.json();
    const contentLanguage = response.headers.get('X-Content-Language');
    
    res.json({
      config,
      requestedLanguage: req.userLanguage,
      actualLanguage: contentLanguage,
      isFallback: contentLanguage !== req.userLanguage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
```

---

## Advanced Scenarios

### Example 9: Batch Translation Creation

```javascript
async function createMultilingualConfig(configData, translations) {
  // Step 1: Create config
  const configResponse = await fetch('http://localhost:3000/api/v1/configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData)
  });
  
  const config = await configResponse.json();
  const configId = config.id;
  
  // Step 2: Create all translations in parallel
  const translationPromises = translations.map(translation =>
    fetch(`http://localhost:3000/api/v1/configs/${configId}/translations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(translation)
    })
  );
  
  await Promise.all(translationPromises);
  
  return configId;
}

// Usage
const configId = await createMultilingualConfig(
  {
    links: { homepage: 'https://example.com' },
    permissions: { read: true }
  },
  [
    {
      languageCode: 'zh-cn',
      title: '示例配置',
      author: '张三',
      description: '这是一个示例',
      keywords: ['示例']
    },
    {
      languageCode: 'en-us',
      title: 'Example Config',
      author: 'John Doe',
      description: 'This is an example',
      keywords: ['example']
    },
    {
      languageCode: 'ja-jp',
      title: 'サンプル設定',
      author: '田中太郎',
      description: 'これはサンプルです',
      keywords: ['サンプル']
    }
  ]
);

console.log('Created multilingual config:', configId);
```

### Example 10: Translation Synchronization

```javascript
// Sync translations across multiple configs
async function syncTranslations(sourceConfigId, targetConfigIds) {
  // Get all translations from source config
  const response = await fetch(
    `http://localhost:3000/api/v1/configs/${sourceConfigId}/translations`
  );
  const sourceTranslations = await response.json();
  
  // Apply translations to target configs
  for (const targetId of targetConfigIds) {
    for (const translation of sourceTranslations) {
      try {
        await fetch(
          `http://localhost:3000/api/v1/configs/${targetId}/translations`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              languageCode: translation.languageCode,
              title: translation.title,
              author: translation.author,
              description: translation.description,
              keywords: translation.keywords
            })
          }
        );
        console.log(`Synced ${translation.languageCode} to config ${targetId}`);
      } catch (error) {
        console.error(`Failed to sync ${translation.languageCode} to config ${targetId}:`, error);
      }
    }
  }
}

// Usage
await syncTranslations(123, [456, 789]);
```

### Example 11: Translation Validation

```javascript
function validateTranslation(translation) {
  const errors = [];
  
  // Validate language code
  const supportedLanguages = ['zh-cn', 'en-us', 'ja-jp'];
  if (!supportedLanguages.includes(translation.languageCode)) {
    errors.push(`Unsupported language: ${translation.languageCode}`);
  }
  
  // Validate title
  if (!translation.title || translation.title.trim() === '') {
    errors.push('Title is required');
  } else if (translation.title.length > 200) {
    errors.push('Title must not exceed 200 characters');
  }
  
  // Validate author
  if (!translation.author || translation.author.trim() === '') {
    errors.push('Author is required');
  } else if (translation.author.length > 100) {
    errors.push('Author must not exceed 100 characters');
  }
  
  // Validate description
  if (!translation.description || translation.description.trim() === '') {
    errors.push('Description is required');
  } else if (translation.description.length > 1000) {
    errors.push('Description must not exceed 1000 characters');
  }
  
  // Validate keywords
  if (!Array.isArray(translation.keywords)) {
    errors.push('Keywords must be an array');
  } else if (translation.keywords.length === 0) {
    errors.push('At least one keyword is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Usage
const translation = {
  languageCode: 'en-us',
  title: 'Example Title',
  author: 'John Doe',
  description: 'This is an example',
  keywords: ['example', 'test']
};

const validation = validateTranslation(translation);
if (validation.isValid) {
  // Create translation
  await createTranslation(configId, translation);
} else {
  console.error('Validation errors:', validation.errors);
}
```

### Example 12: Caching Strategy

```javascript
class TranslationCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 3600000; // 1 hour in milliseconds
  }
  
  getCacheKey(configId, languageCode) {
    return `config:${configId}:lang:${languageCode}`;
  }
  
  get(configId, languageCode) {
    const key = this.getCacheKey(configId, languageCode);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(configId, languageCode, data) {
    const key = this.getCacheKey(configId, languageCode);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  invalidate(configId, languageCode) {
    const key = this.getCacheKey(configId, languageCode);
    this.cache.delete(key);
  }
  
  invalidateAll(configId) {
    // Invalidate all languages for a config
    const pattern = `config:${configId}:lang:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage
const cache = new TranslationCache();

async function getConfig(configId, languageCode) {
  // Try cache first
  const cached = cache.get(configId, languageCode);
  if (cached) {
    console.log('Cache hit');
    return cached;
  }
  
  // Fetch from API
  console.log('Cache miss, fetching from API');
  const response = await fetch(
    `http://localhost:3000/api/v1/configs/${configId}?lang=${languageCode}`
  );
  const config = await response.json();
  
  // Cache the result
  cache.set(configId, languageCode, config);
  
  return config;
}

// Invalidate cache when updating
async function updateTranslation(configId, languageCode, updates) {
  await fetch(
    `http://localhost:3000/api/v1/configs/${configId}/translations/${languageCode}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  );
  
  // Invalidate cache
  cache.invalidate(configId, languageCode);
}
```

---

## Best Practices

### Example 13: Error Handling

```javascript
async function safeGetConfig(configId, languageCode) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/configs/${configId}?lang=${languageCode}`
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Config not found');
      } else if (response.status === 400) {
        const error = await response.json();
        throw new Error(`Validation error: ${error.error.message}`);
      } else {
        throw new Error(`HTTP error: ${response.status}`);
      }
    }
    
    const config = await response.json();
    const contentLanguage = response.headers.get('X-Content-Language');
    
    return {
      config,
      requestedLanguage: languageCode,
      actualLanguage: contentLanguage,
      isFallback: contentLanguage !== languageCode
    };
  } catch (error) {
    console.error('Failed to fetch config:', error);
    throw error;
  }
}

// Usage
try {
  const result = await safeGetConfig(123, 'en-us');
  if (result.isFallback) {
    console.warn(`Showing ${result.actualLanguage} instead of ${result.requestedLanguage}`);
  }
  console.log(result.config);
} catch (error) {
  console.error('Error:', error.message);
}
```

### Example 14: Retry Logic

```javascript
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // Retry on server errors (5xx)
      if (i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries - 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
    }
  }
}

// Usage
const response = await fetchWithRetry(
  `http://localhost:3000/api/v1/configs/123?lang=en-us`
);
const config = await response.json();
```

### Example 15: Bulk Operations

```javascript
async function bulkUpdateTranslations(updates) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const update of updates) {
    try {
      await fetch(
        `http://localhost:3000/api/v1/configs/${update.configId}/translations/${update.languageCode}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update.data)
        }
      );
      
      results.success.push({
        configId: update.configId,
        languageCode: update.languageCode
      });
    } catch (error) {
      results.failed.push({
        configId: update.configId,
        languageCode: update.languageCode,
        error: error.message
      });
    }
  }
  
  return results;
}

// Usage
const updates = [
  {
    configId: 123,
    languageCode: 'en-us',
    data: { title: 'Updated Title 1' }
  },
  {
    configId: 456,
    languageCode: 'en-us',
    data: { title: 'Updated Title 2' }
  }
];

const results = await bulkUpdateTranslations(updates);
console.log('Success:', results.success.length);
console.log('Failed:', results.failed.length);
```

---

## Conclusion

These examples demonstrate common use cases and best practices for working with the multilingual content support API. For more information, refer to:

- [API Documentation](./MULTILINGUAL_API.md)
- [Migration Guide](./MULTILINGUAL_MIGRATION.md)
- [Design Document](../.kiro/specs/multilingual-content-support/design.md)
