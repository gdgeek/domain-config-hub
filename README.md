# 域名配置服务 (Domain Configuration Service)

[![CI](https://github.com/gdgeek/domain-config-hub/workflows/CI/badge.svg)](https://github.com/gdgeek/domain-config-hub/actions)
[![Docker](https://img.shields.io/badge/docker-hkccr.ccs.tencentyun.com%2Fgdgeek%2Fdomain-blue)](https://hkccr.ccs.tencentyun.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

一个基于 Node.js + TypeScript 的域名配置管理服务，采用双表架构（domains + configs），提供完整的 CRUD API 和 Web 管理界面。

## ✨ 特性

- 🚀 **RESTful API**: 完整的域名和配置 CRUD 接口
- 🏗️ **双表架构**: 域名表和配置表分离，支持多域名共享配置
- 🌍 **多语言支持**: 完整的国际化内容管理，支持 Accept-Language 自动协商
- 🎨 **Web 管理界面**: 简洁美观的管理后台
- 🔐 **权限管理**: 灵活的 JSON 权限配置系统
- 💾 **数据持久化**: MySQL 数据库存储
- ⚡ **Redis 缓存**: 可选的缓存层提升性能，支持多语言内容缓存
- 📊 **监控指标**: Prometheus 格式的监控数据
- 📝 **API 文档**: Swagger/OpenAPI 文档
- 🔒 **安全防护**: 限流、错误处理、日志记录
- 🐳 **Docker 支持**: 容器化部署，自动发布到腾讯云

## 🐳 Docker 镜像

```bash
# 拉取最新镜像
docker pull hkccr.ccs.tencentyun.com/gdgeek/domain:latest

# 运行容器
docker run -d \
  --name domain-config \
  -p 3000:3000 \
  -e DB_HOST=your-db-host \
  -e DB_NAME=your-db-name \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  hkccr.ccs.tencentyun.com/gdgeek/domain:latest
```

## 🏗️ 架构说明

本服务采用**双表架构**设计:

- **domains 表**: 存储域名信息，每个域名关联一个配置
- **configs 表**: 存储配置内容（title、author、description、keywords、links、permissions 等）
- **translations 表**: 存储多语言翻译内容，支持配置的国际化

这种设计的优势:
- ✅ 多个域名可以共享同一个配置
- ✅ 配置更新时，所有关联域名自动生效
- ✅ 支持多语言内容管理，每个配置可有多个语言版本
- ✅ 自动语言协商，根据 Accept-Language 返回最佳匹配
- ✅ 更灵活的数据管理和维护

## 📋 目录

- [快速开始](#快速开始)
- [功能说明](#功能说明)
- [多语言支持](#多语言支持)
- [API 文档](#api-文档)
- [管理界面](#管理界面)
- [数据库迁移](#数据库迁移)
- [配置说明](#配置说明)
- [开发指南](#开发指南)
- [部署指南](#部署指南)

## 🚀 快速开始

### 前置要求

- Node.js >= 16.x
- MySQL >= 5.7
- Redis (可选)
- npm 或 yarn

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd domain-config-service
```

2. **安装依赖**

```bash
npm install
```

3. **配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接和管理密码
```

4. **初始化数据库**

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE bujiaban CHARACTER SET utf8mb3 COLLATE utf8mb3_unicode_ci;"

# 导入完整表结构（包含多语言支持）
mysql -u root -p bujiaban < migrations/init_with_translations.sql

# 或者执行迁移（从旧版本升级）
./scripts/migrate.sh migrations/001_add_permissions_field.sql
./scripts/migrate.sh migrations/002_split_to_two_tables.sql
./scripts/migrate.sh migrations/004_create_translations_table.sql
./scripts/migrate.sh migrations/005_migrate_config_data_to_translations.sql
```

5. **启动服务**

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

6. **访问服务**

- API 服务: http://localhost:3000/api/v1
- 管理界面: http://localhost:3000/admin.html
- API 文档: http://localhost:3000/api-docs
- 健康检查: http://localhost:3000/health
- 监控指标: http://localhost:3000/metrics

## 🎯 功能说明

### 核心功能

1. **域名管理**
   - 创建、查询、更新、删除域名
   - 支持分页查询
   - 支持按域名和 ID 查询
   - 域名与配置关联管理

2. **配置管理**
   - 创建、查询、更新、删除配置
   - 支持分页查询
   - 一个配置可被多个域名共享
   - 配置包含: title、author、description、keywords、links、permissions

3. **多语言内容管理** 🌍
   - 支持多语言翻译内容（zh-cn、en-us、ja-jp）
   - 自动语言协商（基于 Accept-Language 请求头）
   - 语言回退机制（请求语言不存在时返回默认语言）
   - 翻译内容缓存（Redis）
   - 完整的翻译 CRUD API
   - 语言元数据查询接口

4. **权限配置**
   - 灵活的 JSON 权限结构
   - 支持基础权限（读、写、管理）
   - 支持功能开关（评论、上传、API 访问等）
   - 支持角色和限制配置

5. **缓存支持**
   - 可选的 Redis 缓存
   - 自动缓存失效
   - 多语言内容缓存
   - 提升查询性能

6. **监控和日志**
   - 结构化 JSON 日志
   - Prometheus 监控指标
   - 请求追踪（Request ID）

7. **安全防护**
   - API 限流
   - 输入验证
   - 错误处理
   - 管理界面密码保护

## 🌍 多语言支持

### 功能特性

- ✅ **多语言内容存储**: 为每个配置存储多个语言版本的内容
- ✅ **自动语言协商**: 根据 `Accept-Language` 请求头自动返回最佳匹配语言
- ✅ **语言回退机制**: 请求语言不存在时自动回退到默认语言（zh-cn）
- ✅ **支持的语言**: 中文简体（zh-cn）、英语（en-us）、日语（ja-jp）
- ✅ **Redis 缓存**: 翻译内容自动缓存，提升性能
- ✅ **完整的 API**: 翻译内容的增删改查接口

### 快速使用

**1. 创建翻译内容**

```bash
# 为配置 ID=1 创建中文翻译
curl -X POST http://localhost:3000/api/v1/translations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "configId": 1,
    "languageCode": "zh-cn",
    "title": "示例网站",
    "author": "张三",
    "description": "这是一个示例网站",
    "keywords": ["示例", "网站", "测试"]
  }'

# 创建英文翻译
curl -X POST http://localhost:3000/api/v1/translations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "configId": 1,
    "languageCode": "en-us",
    "title": "Example Site",
    "author": "John Doe",
    "description": "This is an example website",
    "keywords": ["example", "website", "test"]
  }'
```

**2. 获取多语言配置**

```bash
# 请求中文内容
curl http://localhost:3000/api/v1/configs/1 \
  -H "Accept-Language: zh-CN"

# 请求英文内容
curl http://localhost:3000/api/v1/configs/1 \
  -H "Accept-Language: en-US"

# 请求日文内容（如果不存在，返回默认语言）
curl http://localhost:3000/api/v1/configs/1 \
  -H "Accept-Language: ja-JP"
```

**3. 查询支持的语言**

```bash
curl http://localhost:3000/api/v1/languages
```

### 详细文档

- [多语言 API 文档](docs/MULTILINGUAL_API.md)
- [多语言使用示例](docs/MULTILINGUAL_EXAMPLES.md)
- [多语言迁移指南](docs/MULTILINGUAL_MIGRATION.md)
- [多语言测试报告](docs/MULTILINGUAL_TEST_SUMMARY.md)

## 📚 API 文档

### 基础信息

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`

### API 端点

#### 域名管理 API

1. **查询域名列表**
```http
GET /api/v1/domains?page=1&pageSize=20
```

2. **通过域名查询**
```http
GET /api/v1/domains/:domain
```

3. **通过 ID 查询**
```http
GET /api/v1/domains/:id
```

4. **创建域名**
```http
POST /api/v1/domains
Content-Type: application/json

{
  "domain": "example.com",
  "configId": 1
}
```

5. **更新域名**
```http
PUT /api/v1/domains/:id
Content-Type: application/json

{
  "configId": 2
}
```

6. **删除域名**
```http
DELETE /api/v1/domains/:id
```

#### 配置管理 API

1. **查询配置列表**
```http
GET /api/v1/configs?page=1&pageSize=20
```

2. **通过 ID 查询配置（支持多语言）**
```http
GET /api/v1/configs/:id
Accept-Language: zh-CN,en-US;q=0.9
```

3. **创建配置**
```http
POST /api/v1/configs
Content-Type: application/json

{
  "title": "Example Site",
  "author": "John Doe",
  "description": "This is an example website",
  "keywords": "example, website, demo",
  "links": {
    "home": "https://example.com",
    "about": "https://example.com/about"
  },
  "permissions": {
    "read": true,
    "write": true,
    "admin": false
  }
}
```

4. **更新配置**
```http
PUT /api/v1/configs/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "permissions": {
    "read": true,
    "write": false,
    "admin": true
  }
}
```

5. **删除配置**
```http
DELETE /api/v1/configs/:id
```

#### 翻译管理 API 🌍

1. **创建翻译**
```http
POST /api/v1/translations
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "configId": 1,
  "languageCode": "zh-cn",
  "title": "示例网站",
  "author": "张三",
  "description": "这是一个示例网站",
  "keywords": ["示例", "网站"]
}
```

2. **获取翻译**
```http
GET /api/v1/translations/:configId/:languageCode
```

3. **更新翻译**
```http
PUT /api/v1/translations/:id
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "title": "更新的标题",
  "description": "更新的描述"
}
```

4. **删除翻译**
```http
DELETE /api/v1/translations/:id
Authorization: Bearer YOUR_TOKEN
```

5. **查询配置的所有翻译**
```http
GET /api/v1/translations/config/:configId
```

#### 语言元数据 API

**查询支持的语言列表**
```http
GET /api/v1/languages
```

响应示例：
```json
{
  "success": true,
  "data": {
    "defaultLanguage": "zh-cn",
    "supportedLanguages": [
      {
        "code": "zh-cn",
        "name": "简体中文",
        "englishName": "Simplified Chinese"
      },
      {
        "code": "en-us",
        "name": "English",
        "englishName": "English"
      },
      {
        "code": "ja-jp",
        "name": "日本語",
        "englishName": "Japanese"
      }
    ]
  }
}
```

### 完整 API 文档

访问 Swagger UI 查看完整的 API 文档：

```
http://localhost:3000/api-docs
```

## 🎨 管理界面

### 访问管理界面

```
http://localhost:3000/admin.html
```

### 默认密码

默认管理密码在 `.env` 文件中配置：

```bash
ADMIN_PASSWORD=admin123
```

**重要**: 生产环境请务必修改默认密码！

### 功能特性

- ✅ 域名列表查看和搜索
- ✅ 配置列表查看和管理
- ✅ 添加新域名和配置
- ✅ 编辑现有配置
- ✅ 删除域名和配置
- ✅ 域名与配置关联管理
- ✅ 可视化权限配置
- ✅ JSON 高级配置编辑
- ✅ 分页浏览
- ✅ 响应式设计

详细使用说明请查看：[管理界面使用指南](docs/ADMIN_UI_GUIDE.md)

## 🗄️ 数据库架构

### 三表设计

本服务使用三表架构:

**domains 表**:
- `id`: 主键
- `domain`: 域名（唯一）
- `config_id`: 外键，关联到 configs 表
- `homepage`: 主页 URL（可选）

**configs 表**:
- `id`: 主键
- `title`: 网站标题（默认语言）
- `author`: 网站作者（默认语言）
- `description`: 网站描述（默认语言）
- `keywords`: 网站关键词（默认语言）
- `links`: 链接配置（JSON）
- `permissions`: 权限配置（JSON）

**translations 表** 🌍:
- `id`: 主键
- `config_id`: 外键，关联到 configs 表
- `language_code`: 语言代码（zh-cn, en-us, ja-jp）
- `title`: 翻译的标题
- `author`: 翻译的作者
- `description`: 翻译的描述
- `keywords`: 翻译的关键词（JSON 数组）
- 唯一约束：`(config_id, language_code)`

### 数据库迁移

```bash
# 执行完整迁移（包含多语言支持）
./scripts/migrate.sh migrations/001_add_permissions_field.sql
./scripts/migrate.sh migrations/002_split_to_two_tables.sql
./scripts/migrate.sh migrations/003_add_homepage_to_domains.sql
./scripts/migrate.sh migrations/004_create_translations_table.sql
./scripts/migrate.sh migrations/005_migrate_config_data_to_translations.sql

# 或使用完整初始化脚本
mysql -u root -p bujiaban < migrations/init_with_translations.sql
```

### 详细说明

- [双表架构设计文档](docs/architecture/TWO_TABLES_DESIGN.md)
- [双表架构快速开始](docs/architecture/TWO_TABLES_QUICKSTART.md)
- [双表架构使用指南](docs/architecture/TWO_TABLES_USAGE.md)
- [数据库迁移快速开始](docs/architecture/DATABASE_MIGRATION_QUICKSTART.md)
- [完整迁移指南](migrations/README.md)
- [权限配置使用指南](docs/architecture/PERMISSIONS_GUIDE.md)
- [多语言迁移指南](docs/MULTILINGUAL_MIGRATION.md) 🌍

## ⚙️ 配置说明

### 环境变量

所有配置通过环境变量管理，参考 `.env.example`：

```bash
# 服务配置
NODE_ENV=development
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=bujiaban
DB_USER=root
DB_PASSWORD=password

# Redis 配置（可选，推荐启用以支持多语言缓存）
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600

# 管理界面配置
ADMIN_PASSWORD=your_secure_password

# 限流配置
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## 🛠️ 开发指南

### 项目结构

```
.
├── src/
│   ├── config/          # 配置模块
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── repositories/    # 数据访问层
│   ├── services/        # 业务逻辑层
│   ├── routes/          # 路由层
│   ├── validation/      # 验证规则
│   └── types/           # TypeScript 类型
├── public/              # 静态文件（管理界面）
├── migrations/          # 数据库迁移脚本
├── docs/                # 文档
├── scripts/             # 工具脚本
└── tests/               # 测试文件
```

### 运行测试

```bash
# 运行所有测试（895 个测试用例）
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定测试
npm test -- --testPathPattern=Domain

# 运行多语言相关测试
npm test -- --testPathPattern=Translation
npm test -- --testPathPattern=LanguageResolver
npm test -- --testPathPattern=multilingual
```

### 代码规范

```bash
# 检查代码规范
npm run lint

# 自动修复
npm run lint:fix

# 类型检查
npm run type-check
```

### 开发模式

```bash
# 启动开发服务器（热重载）
npm run dev
```

## 🐳 Docker 部署

### 快速开始

**使用 Docker Compose（推荐）：**

```bash
# 启动所有服务（应用 + MySQL）
make up

# 或启动包含 Redis 的完整服务
make up-redis

# 查看服务状态
make ps

# 查看日志
make logs
```

**使用 Make 命令：**

```bash
# 查看所有可用命令
make help

# 构建镜像
make build

# 启动服务
make up              # 不含 Redis
make up-redis        # 含 Redis

# 查看日志
make logs            # 所有服务
make logs-app        # 仅应用
make logs-mysql      # 仅 MySQL

# 停止服务
make down

# 清理所有数据
make clean

# 备份数据库
make backup-mysql

# 运行迁移
make migrate
```

### 配置说明

1. **环境变量配置**

创建 `.env` 文件（可选，使用默认值也可以）：

```bash
cp .env.example .env
# 编辑配置
nano .env
```

2. **启动服务**

```bash
# 方式 1: 使用 Make（推荐）
make up-redis

# 方式 2: 使用 Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# 方式 3: 不使用 Redis
docker-compose up -d
```

3. **访问服务**

- API 服务: http://localhost:3000/api/v1
- 管理界面: http://localhost:3000/admin.html
- API 文档: http://localhost:3000/api-docs
- 健康检查: http://localhost:3000/health

### 服务架构

```
┌─────────────────────────────────────────────────┐
│                   Docker Host                    │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │  domain-config-service (App)               │ │
│  │  Port: 3000                                │ │
│  └────────────────────────────────────────────┘ │
│           │                    │                 │
│           ▼                    ▼                 │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │  MySQL 8.0       │  │  Redis 7         │    │
│  │  Port: 3306      │  │  Port: 6379      │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────┘
```

### 数据持久化

Docker Compose 自动管理以下数据卷：

- `mysql-data`: MySQL 数据库文件
- `redis-data`: Redis 持久化数据
- `app-logs`: 应用日志文件

### 详细文档

完整的 Docker 部署指南请查看：[Docker 部署文档](docs/deployment/DOCKER_DEPLOYMENT.md)

### 单独使用 Docker

```bash
# 构建镜像
docker build -t domain-config-service .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -e DB_HOST=mysql \
  -e DB_PASSWORD=password \
  -e ADMIN_PASSWORD=secure_password \
  --name domain-service \
  domain-config-service
```

## 📊 监控和日志

### 健康检查

```bash
curl http://localhost:3000/health
```

### 监控指标

```bash
curl http://localhost:3000/metrics
```

### 日志文件

- 应用日志: `logs/app.log`
- 错误日志: `logs/app.error.log`

## 🔒 安全建议

1. **修改默认密码**: 不要使用默认的管理密码
2. **使用 HTTPS**: 生产环境启用 HTTPS
3. **限制访问**: 使用防火墙限制管理界面访问
4. **定期备份**: 定期备份数据库
5. **更新依赖**: 及时更新依赖包
6. **监控日志**: 定期检查访问日志

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

[MIT License](LICENSE)

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**Made with ❤️ by Domain Config Team**
