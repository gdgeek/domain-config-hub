# 双表设计快速开始指南

## 概述

双表设计将域名和配置信息分离，实现多个域名共享同一份配置的功能。

## 数据库架构

```
domains (域名表)          configs (配置表)
├── id                   ├── id
├── domain (唯一)        ├── title
├── config_id (外键) ────>├── author
├── created_at           ├── description
└── updated_at           ├── keywords
                         ├── links
                         ├── permissions
                         ├── created_at
                         └── updated_at
```

## 快速开始

### 1. 数据库迁移

执行迁移脚本将单表转换为双表：

```bash
# 备份现有数据
mysqldump -u root -p domain_config domain > backup.sql

# 执行迁移
mysql -u root -p domain_config < migrations/002_split_to_two_tables.sql

# 验证迁移
mysql -u root -p domain_config -e "SELECT COUNT(*) FROM domains; SELECT COUNT(*) FROM configs;"
```

### 2. 使用新的 API

#### 场景 1: 创建配置并关联多个域名

```bash
# 1. 创建一个配置
curl -X POST http://localhost:3000/api/v1/configs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的网站",
    "author": "张三",
    "description": "这是一个测试网站",
    "keywords": "测试,网站",
    "links": {"home": "https://example.com"}
  }'

# 返回: {"data": {"id": 1, "title": "我的网站", ...}}

# 2. 创建多个域名，都指向这个配置
curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "configId": 1}'

curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.org", "configId": 1}'

curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.net", "configId": 1}'
```

#### 场景 2: 查询域名配置

```bash
# 通过域名查询（返回域名+配置）
curl http://localhost:3000/api/v1/domains/example.com

# 返回:
# {
#   "data": {
#     "id": 1,
#     "domain": "example.com",
#     "configId": 1,
#     "config": {
#       "id": 1,
#       "title": "我的网站",
#       "author": "张三",
#       ...
#     }
#   }
# }
```

#### 场景 3: 更新配置（影响所有关联域名）

```bash
# 更新配置
curl -X PUT http://localhost:3000/api/v1/configs/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "更新后的网站标题"}'

# 现在访问任意关联的域名都会看到更新后的配置
curl http://localhost:3000/api/v1/domains/example.com
curl http://localhost:3000/api/v1/domains/example.org
curl http://localhost:3000/api/v1/domains/example.net
# 所有域名都返回更新后的标题
```

#### 场景 4: 查看配置被哪些域名使用

```bash
# 获取配置详情（包含关联的域名列表）
curl http://localhost:3000/api/v1/configs/1

# 返回:
# {
#   "data": {
#     "id": 1,
#     "title": "我的网站",
#     "domains": [
#       {"id": 1, "domain": "example.com"},
#       {"id": 2, "domain": "example.org"},
#       {"id": 3, "domain": "example.net"}
#     ]
#   }
# }
```

#### 场景 5: 域名切换配置

```bash
# 创建另一个配置
curl -X POST http://localhost:3000/api/v1/configs \
  -H "Content-Type: application/json" \
  -d '{"title": "另一个配置", "author": "李四"}'

# 返回: {"data": {"id": 2, ...}}

# 将域名切换到新配置
curl -X PUT http://localhost:3000/api/v1/domains/1 \
  -H "Content-Type: application/json" \
  -d '{"configId": 2}'

# 现在 example.com 使用新配置
curl http://localhost:3000/api/v1/domains/example.com
```

## API 端点对比

### 旧版 API (v1) - 单表设计

```
GET    /api/v1/domains           # 获取域名列表
GET    /api/v1/domains/:domain   # 通过域名获取配置
POST   /api/v1/domains           # 创建域名配置（包含所有字段）
PUT    /api/v1/domains/:id       # 更新域名配置
DELETE /api/v1/domains/:id       # 删除域名配置
```

### 新版 API - 双表设计

```
# 配置管理
GET    /api/v1/configs           # 获取配置列表
GET    /api/v1/configs/:id       # 获取配置详情（含关联域名）
POST   /api/v1/configs           # 创建配置
PUT    /api/v1/configs/:id       # 更新配置
DELETE /api/v1/configs/:id       # 删除配置（需要先删除关联域名）

# 域名管理
GET    /api/v1/domains           # 获取域名列表（含配置）
GET    /api/v1/domains/:domain   # 通过域名获取（含配置）
POST   /api/v1/domains           # 创建域名（指定 configId）
PUT    /api/v1/domains/:id       # 更新域名（可更改 configId）
DELETE /api/v1/domains/:id       # 删除域名
```

## 代码示例

### Node.js 示例

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// 创建配置
async function createConfig() {
  const response = await axios.post(`${API_BASE}/configs`, {
    title: '我的网站',
    author: '张三',
    description: '测试网站',
    links: { home: 'https://example.com' }
  });
  return response.data.data.id;
}

// 创建域名
async function createDomain(domain, configId) {
  const response = await axios.post(`${API_BASE}/domains`, {
    domain,
    configId
  });
  return response.data.data;
}

// 查询域名配置
async function getDomainConfig(domain) {
  const response = await axios.get(`${API_BASE}/domains/${domain}`);
  return response.data.data;
}

// 使用示例
async function main() {
  // 1. 创建配置
  const configId = await createConfig();
  console.log('配置 ID:', configId);

  // 2. 创建多个域名
  await createDomain('example.com', configId);
  await createDomain('example.org', configId);
  await createDomain('example.net', configId);

  // 3. 查询域名配置
  const config = await getDomainConfig('example.com');
  console.log('域名配置:', config);
}

main();
```

### Python 示例

```python
import requests

API_BASE = 'http://localhost:3000/api/v1'

# 创建配置
def create_config():
    response = requests.post(f'{API_BASE}/configs', json={
        'title': '我的网站',
        'author': '张三',
        'description': '测试网站',
        'links': {'home': 'https://example.com'}
    })
    return response.json()['data']['id']

# 创建域名
def create_domain(domain, config_id):
    response = requests.post(f'{API_BASE}/domains', json={
        'domain': domain,
        'configId': config_id
    })
    return response.json()['data']

# 查询域名配置
def get_domain_config(domain):
    response = requests.get(f'{API_BASE}/domains/{domain}')
    return response.json()['data']

# 使用示例
if __name__ == '__main__':
    # 1. 创建配置
    config_id = create_config()
    print(f'配置 ID: {config_id}')

    # 2. 创建多个域名
    create_domain('example.com', config_id)
    create_domain('example.org', config_id)
    create_domain('example.net', config_id)

    # 3. 查询域名配置
    config = get_domain_config('example.com')
    print(f'域名配置: {config}')
```

## 优势总结

1. **减少数据冗余**: 配置信息只存储一次
2. **批量更新**: 更新配置自动影响所有关联域名
3. **灵活管理**: 可以轻松切换域名的配置
4. **数据一致性**: 避免同一配置在多处不一致
5. **扩展性**: 未来可以添加更多配置类型

## 注意事项

1. **外键约束**: 删除配置前必须先删除或重新分配关联的域名
2. **缓存失效**: 更新配置时需要清除所有关联域名的缓存
3. **性能**: 查询域名时需要 JOIN 配置表，已添加适当索引
4. **向后兼容**: 旧的 v1 API 仍然可用

## 回滚

如果需要回滚到单表设计：

```bash
mysql -u root -p domain_config < migrations/rollback_002.sql
```

## 更多信息

- 完整设计文档: `docs/TWO_TABLES_DESIGN.md`
- 实现总结: `docs/TWO_TABLES_IMPLEMENTATION_SUMMARY.md`
- 数据库迁移: `migrations/002_split_to_two_tables.sql`
