# 域名智能匹配功能使用指南

## 功能说明

系统现在支持**智能域名匹配**功能。当你在数据库中存储一个根域名（如 `baidu.com`）时，系统会自动匹配该域名的所有子域名和各种 URL 格式。

## 匹配规则

### 1. 精确匹配（优先级最高）
如果数据库中存在完全匹配的域名，直接返回该记录。

**示例：**
- 数据库：`baidu.com`
- 查询：`baidu.com`
- 结果：✅ 匹配 `baidu.com`

### 2. 根域名匹配
如果精确匹配失败，系统会提取根域名（最后两个部分）再次查询。

**示例：**
- 数据库：`baidu.com`
- 查询：`www.baidu.com`
- 结果：✅ 匹配 `baidu.com`

- 数据库：`baidu.com`
- 查询：`abc.baidu.com`
- 结果：✅ 匹配 `baidu.com`

- 数据库：`baidu.com`
- 查询：`www.abc.baidu.com`
- 结果：✅ 匹配 `baidu.com`

### 3. URL 自动解析
系统会自动从完整 URL 中提取域名，然后进行匹配。

**示例：**
- 数据库：`baidu.com`
- 查询：`https://www.baidu.com/a/v`
- 提取：`www.baidu.com`
- 结果：✅ 匹配 `baidu.com`

- 数据库：`baidu.com`
- 查询：`http://abc.baidu.com/path?query=1#anchor`
- 提取：`abc.baidu.com`
- 结果：✅ 匹配 `baidu.com`

- 数据库：`baidu.com`
- 查询：`https://www.baidu.com:8080/path`
- 提取：`www.baidu.com`
- 结果：✅ 匹配 `baidu.com`

### 4. 大小写不敏感
域名匹配不区分大小写。

**示例：**
- 数据库：`baidu.com`
- 查询：`WWW.BAIDU.COM`
- 结果：✅ 匹配 `baidu.com`

- 数据库：`baidu.com`
- 查询：`HTTPS://WWW.BAIDU.COM/PATH`
- 结果：✅ 匹配 `baidu.com`

## 使用示例

### 1. 通过 API 查询

```bash
# 精确匹配
curl http://localhost:3000/api/v1/domains/baidu.com

# 子域名匹配
curl http://localhost:3000/api/v1/domains/www.baidu.com
curl http://localhost:3000/api/v1/domains/abc.baidu.com

# URL 格式（需要 URL 编码）
curl "http://localhost:3000/api/v1/domains/https%3A%2F%2Fwww.baidu.com%2Fa%2Fv"

# 或者直接传递域名部分
curl http://localhost:3000/api/v1/domains/www.baidu.com
```

### 2. 通过 JavaScript 调用

```javascript
// 精确匹配
fetch('http://localhost:3000/api/v1/domains/baidu.com')
  .then(res => res.json())
  .then(data => console.log(data));

// 子域名匹配
fetch('http://localhost:3000/api/v1/domains/www.baidu.com')
  .then(res => res.json())
  .then(data => console.log(data));

// 从完整 URL 中提取域名
const url = 'https://www.baidu.com/a/v';
const domain = new URL(url).hostname; // 提取 www.baidu.com
fetch(`http://localhost:3000/api/v1/domains/${domain}`)
  .then(res => res.json())
  .then(data => console.log(data));
```

### 3. 实际应用场景

#### 场景 A：网站配置服务
```javascript
// 用户访问任何子域名，都能获取配置
const currentDomain = window.location.hostname; // 例如：www.baidu.com
fetch(`http://localhost:3000/api/v1/domains/${currentDomain}`)
  .then(res => res.json())
  .then(config => {
    // 使用配置信息
    document.title = config.data.config.title;
    // ...
  });
```

#### 场景 B：多域名统一管理
```javascript
// 只需在数据库中存储 baidu.com
// 以下所有域名都会自动匹配：
// - baidu.com
// - www.baidu.com
// - m.baidu.com
// - api.baidu.com
// - admin.baidu.com
```

## 匹配逻辑流程图

```
输入域名/URL
    ↓
提取纯域名（移除协议、路径、端口等）
    ↓
转换为小写
    ↓
尝试精确匹配
    ↓
找到？ → 是 → 返回结果
    ↓ 否
提取根域名（最后两个部分）
    ↓
根域名 == 原域名？ → 是 → 返回 null（不存在）
    ↓ 否
尝试根域名匹配
    ↓
找到？ → 是 → 返回结果
    ↓ 否
返回 null（不存在）
```

## 数据库设计建议

### 推荐做法
在数据库中只存储**根域名**：

```sql
INSERT INTO domains (domain, config_id) VALUES ('baidu.com', 1);
INSERT INTO domains (domain, config_id) VALUES ('google.com', 2);
INSERT INTO domains (domain, config_id) VALUES ('example.com', 3);
```

这样，所有子域名都会自动匹配到对应的根域名配置。

### 特殊情况
如果某个子域名需要特殊配置，可以单独存储：

```sql
-- 根域名配置
INSERT INTO domains (domain, config_id) VALUES ('baidu.com', 1);

-- 特殊子域名配置
INSERT INTO domains (domain, config_id) VALUES ('api.baidu.com', 2);
```

匹配优先级：
1. `api.baidu.com` → 精确匹配 → 返回配置 2
2. `www.baidu.com` → 根域名匹配 → 返回配置 1
3. `baidu.com` → 精确匹配 → 返回配置 1

## 测试验证

系统包含 14 个测试用例，覆盖所有匹配场景：

```bash
npm test -- src/services/DomainService.domain-matching.test.ts
```

测试覆盖：
- ✅ 精确匹配
- ✅ 子域名匹配（www、abc、多级子域名）
- ✅ URL 解析（https、http、端口、路径、查询参数）
- ✅ 大小写不敏感
- ✅ 不存在的域名
- ✅ 边界情况（localhost、空格等）

## 性能优化

### 缓存策略
系统使用 Redis 缓存查询结果，提高性能：

1. 第一次查询会访问数据库
2. 结果会缓存到 Redis（默认 TTL: 3600 秒）
3. 后续相同查询直接从缓存返回

### 查询次数
- 精确匹配：1 次数据库查询
- 根域名匹配：最多 2 次数据库查询

## 日志记录

系统会记录详细的匹配日志，方便调试：

```json
{
  "level": "info",
  "message": "通过域名查询",
  "originalInput": "https://www.baidu.com/a/v",
  "cleanDomain": "www.baidu.com"
}

{
  "level": "info",
  "message": "尝试根域名匹配",
  "cleanDomain": "www.baidu.com",
  "rootDomain": "baidu.com"
}

{
  "level": "info",
  "message": "根域名匹配成功",
  "inputDomain": "www.baidu.com",
  "matchedDomain": "baidu.com"
}
```

## 常见问题

### Q1: 如果数据库中同时存在 `baidu.com` 和 `www.baidu.com`，查询 `www.baidu.com` 会返回哪个？
**A**: 返回 `www.baidu.com`（精确匹配优先）。

### Q2: 支持国际化域名吗？
**A**: 支持，但需要使用 Punycode 编码格式存储。

### Q3: 支持 IP 地址吗？
**A**: 支持，但 IP 地址不会进行根域名匹配（因为 IP 没有根域名的概念）。

### Q4: 如何禁用智能匹配，只使用精确匹配？
**A**: 目前不支持配置，但可以通过修改代码实现。如有需求请联系开发团队。

### Q5: 匹配逻辑会影响性能吗？
**A**: 影响很小。最多增加 1 次额外的数据库查询，且结果会被缓存。

## 相关文件

- 实现代码：`src/services/DomainService.ts`
- 测试代码：`src/services/DomainService.domain-matching.test.ts`
- API 路由：`src/routes/DomainRoutes.ts`

## 更新日志

- **2026-01-25**: 实现域名智能匹配功能
  - 支持子域名自动匹配
  - 支持 URL 自动解析
  - 支持大小写不敏感
  - 添加 14 个测试用例
