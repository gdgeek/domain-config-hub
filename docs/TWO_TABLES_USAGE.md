# 双表架构使用指南

## 概述

双表架构将原来的单表 `domain` 拆分为两个表：
- `domains` - 存储域名信息
- `configs` - 存储配置信息

这样设计的好处是多个域名可以共享同一份配置，减少数据冗余。

## 数据库迁移

### 1. 执行迁移脚本

```bash
# 连接到 MySQL 数据库
mysql -u root -p your_database < migrations/002_split_to_two_tables.sql
```

### 2. 验证迁移结果

```sql
-- 检查表是否创建成功
SHOW TABLES;

-- 检查数据是否迁移成功
SELECT COUNT(*) FROM domains;
SELECT COUNT(*) FROM configs;

-- 检查外键约束
SHOW CREATE TABLE domains;
```

### 3. 清理备份表（可选）

迁移成功后，可以删除备份表：

```sql
DROP TABLE domain_backup;
```

## API 使用

### 配置管理 API

#### 创建配置

```bash
curl -X POST http://localhost:3000/api/v1/configs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的网站",
    "author": "张三",
    "description": "这是一个示例网站",
    "keywords": "示例,网站",
    "links": {
      "home": "https://example.com"
    },
    "permissions": {
      "read": true,
      "write": false
    }
  }'
```

响应：
```json
{
  "data": {
    "id": 1,
    "title": "我的网站",
    "author": "张三",
    "description": "这是一个示例网站",
    "keywords": "示例,网站",
    "links": {
      "home": "https://example.com"
    },
    "permissions": {
      "read": true,
      "write": false
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 获取配置列表

```bash
curl http://localhost:3000/api/v1/configs?page=1&pageSize=20
```

#### 获取单个配置

```bash
curl http://localhost:3000/api/v1/configs/1
```

#### 更新配置

```bash
curl -X PUT http://localhost:3000/api/v1/configs/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

#### 删除配置

```bash
curl -X DELETE http://localhost:3000/api/v1/configs/1
```

**注意**：如果有域名正在使用该配置，删除会失败并返回 409 错误。

### 域名管理 API（V2）

#### 创建域名

```bash
curl -X POST http://localhost:3000/api/v2/domains \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "configId": 1
  }'
```

响应：
```json
{
  "data": {
    "id": 1,
    "domain": "example.com",
    "configId": 1,
    "config": {
      "id": 1,
      "title": "我的网站",
      "author": "张三",
      "description": "这是一个示例网站",
      "keywords": "示例,网站",
      "links": {
        "home": "https://example.com"
      },
      "permissions": {
        "read": true,
        "write": false
      }
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 通过域名查询

```bash
curl http://localhost:3000/api/v2/domains/example.com
```

响应包含域名信息和关联的配置信息。

#### 获取域名列表

```bash
curl http://localhost:3000/api/v2/domains?page=1&pageSize=20
```

#### 更新域名（更改关联的配置）

```bash
curl -X PUT http://localhost:3000/api/v2/domains/1 \
  -H "Content-Type: application/json" \
  -d '{
    "configId": 2
  }'
```

#### 删除域名

```bash
curl -X DELETE http://localhost:3000/api/v2/domains/1
```

## 使用场景

### 场景 1：多个域名共享同一配置

```bash
# 1. 创建一个配置
curl -X POST http://localhost:3000/api/v1/configs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "共享配置",
    "author": "管理员"
  }'
# 假设返回的 configId 是 1

# 2. 创建多个域名，都使用这个配置
curl -X POST http://localhost:3000/api/v2/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "site1.com", "configId": 1}'

curl -X POST http://localhost:3000/api/v2/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "site2.com", "configId": 1}'

curl -X POST http://localhost:3000/api/v2/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "site3.com", "configId": 1}'

# 3. 更新配置，所有域名自动使用新配置
curl -X PUT http://localhost:3000/api/v1/configs/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "更新后的共享配置"}'
```

### 场景 2：域名切换配置

```bash
# 将域名从一个配置切换到另一个配置
curl -X PUT http://localhost:3000/api/v2/domains/1 \
  -H "Content-Type: application/json" \
  -d '{"configId": 2}'
```

## 启动应用（双表版本）

### 方式 1：修改现有 index.ts

在 `src/index.ts` 中导入 `app-v2.ts`：

```typescript
import app from './app-v2';
```

### 方式 2：创建新的启动文件

创建 `src/index-v2.ts`：

```typescript
import app from './app-v2';
import { config } from './config/env';
import { connectWithRetry } from './config/database';
import { connectRedis, closeRedis } from './config/redis';
import { logger } from './config/logger';

async function startServer() {
  try {
    // 连接数据库
    await connectWithRetry();
    
    // 连接 Redis（如果启用）
    await connectRedis();
    
    // 启动服务器
    const server = app.listen(config.port, () => {
      logger.info(`服务器启动成功（双表版本）`, {
        port: config.port,
        env: config.nodeEnv,
      });
    });

    // 优雅关闭
    const gracefulShutdown = async (signal: string) => {
      logger.info(`收到 ${signal} 信号，开始优雅关闭`);
      
      server.close(async () => {
        logger.info('HTTP 服务器已关闭');
        
        try {
          await closeRedis();
          process.exit(0);
        } catch (error) {
          logger.error('关闭过程中发生错误', { error });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('强制关闭超时，强制退出');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('服务器启动失败', { error });
    process.exit(1);
  }
}

startServer();
```

然后在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "start:v2": "node dist/index-v2.js",
    "dev:v2": "ts-node src/index-v2.ts"
  }
}
```

## 回滚

如果需要回滚到单表架构：

```bash
mysql -u root -p your_database < migrations/rollback_002.sql
```

## 注意事项

1. **外键约束**：`domains.config_id` 有外键约束，删除配置前必须先删除或更新所有使用该配置的域名
2. **数据一致性**：创建域名时必须指定一个存在的 `configId`
3. **API 版本**：双表架构使用 `/api/v2/domains` 路径，与原来的 `/api/v1/domains` 区分
4. **缓存策略**：如果使用 Redis 缓存，需要考虑配置更新时如何失效相关域名的缓存

## 性能优化建议

1. **索引优化**：
   - `domains.config_id` 已经有索引
   - 如果经常按配置查询域名，可以考虑添加复合索引

2. **缓存策略**：
   - 缓存域名+配置的完整数据
   - 配置更新时，失效所有使用该配置的域名缓存

3. **批量操作**：
   - 使用事务处理批量创建域名
   - 使用 JOIN 查询减少数据库往返次数
