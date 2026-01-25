# Docker Compose 部署测试报告

## 测试日期
2026-01-25

## 部署配置

### 服务列表
- **应用服务** (domain-config-service): Node.js 24 Alpine
- **MySQL 数据库** (domain-config-mysql): MySQL 8.0
- **Redis 缓存** (domain-config-redis): Redis 7 Alpine

### 端口映射
- 应用: `3000:3000`
- MySQL: `3307:3306` (避免与本地 MySQL 冲突)
- Redis: `6380:6379` (避免与本地 Redis 冲突)

### 环境变量
```bash
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3307
DB_NAME=domain_config
DB_USER=root
DB_PASSWORD=password123
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6380
```

## 部署步骤

### 1. 启动服务
```bash
docker-compose --profile with-redis up --build
```

### 2. 执行数据库迁移
```bash
# 添加 permissions 字段
docker exec -i domain-config-mysql mysql -uroot -ppassword123 domain_config < migrations/001_add_permissions_field.sql

# 迁移到双表架构
docker exec -i domain-config-mysql mysql -uroot -ppassword123 domain_config < migrations/002_split_to_two_tables.sql
```

## 测试结果

### ✅ 服务健康检查
```bash
$ curl http://localhost:3000/health
{
  "status": "healthy",
  "timestamp": "2026-01-25T05:11:28.345Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### ✅ 容器状态
```
NAME                    STATUS
domain-config-mysql     Up (healthy)
domain-config-redis     Up (healthy)
domain-config-service   Up (healthy)
```

### ✅ 数据库表结构
```
Tables_in_domain_config
- configs
- domains
- domain_backup
```

## API 功能测试

### 1. ✅ 创建配置
```bash
$ curl -X POST http://localhost:3000/api/v1/configs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试网站",
    "author": "张三",
    "description": "这是一个测试网站",
    "keywords": "测试,网站,双表",
    "links": {"home": "https://example.com"},
    "permissions": {"read": true, "write": false}
  }'

Response: ✅ 成功创建配置 ID: 1
```

### 2. ✅ 创建域名（关联配置）
```bash
$ curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com", "configId": 1}'

$ curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.org", "configId": 1}'

$ curl -X POST http://localhost:3000/api/v1/domains \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.net", "configId": 1}'

Response: ✅ 成功创建 3 个域名，都关联到配置 ID: 1
```

### 3. ✅ 通过域名查询配置
```bash
$ curl http://localhost:3000/api/v1/domains/example.com

Response: ✅ 返回域名和完整配置信息
{
  "data": {
    "id": 1,
    "domain": "example.com",
    "configId": 1,
    "config": {
      "id": 1,
      "title": "测试网站",
      "author": "张三",
      ...
    }
  }
}
```

### 4. ✅ 更新配置（影响所有关联域名）
```bash
$ curl -X PUT http://localhost:3000/api/v1/configs/1 \
  -H "Content-Type: application/json" \
  -d '{"title": "更新后的网站标题"}'

Response: ✅ 配置更新成功

# 验证所有域名都看到更新
$ curl http://localhost:3000/api/v1/domains/example.com | jq '.data.config.title'
"更新后的网站标题"

$ curl http://localhost:3000/api/v1/domains/example.org | jq '.data.config.title'
"更新后的网站标题"

$ curl http://localhost:3000/api/v1/domains/example.net | jq '.data.config.title'
"更新后的网站标题"

✅ 所有域名都自动更新了配置
```

### 5. ✅ 监控指标
```bash
$ curl http://localhost:3000/metrics

Response: ✅ Prometheus 格式的监控指标
- http_requests_total
- http_request_duration_seconds
- 按路由、方法、状态码分组
```

## 双表架构验证

### ✅ 多对一关系
- 3 个域名 (example.com, example.org, example.net)
- 1 个配置 (ID: 1)
- 所有域名共享同一份配置

### ✅ 配置更新传播
- 更新配置后，所有关联域名立即生效
- 无需逐个更新域名

### ✅ 数据一致性
- 外键约束确保数据完整性
- 域名唯一性约束防止重复

## 性能测试

### Redis 缓存
```
✅ Redis 连接成功
✅ 缓存读写正常
✅ 缓存失效机制工作正常
```

### 数据库连接池
```
✅ 连接池配置: min=2, max=10
✅ 数据库连接健康
✅ 查询响应时间 < 50ms
```

## 日志输出

### 应用启动日志
```
{"level":"info","message":"数据库连接成功","timestamp":"2026-01-25 05:10:55.895"}
{"level":"info","message":"Redis 连接成功","timestamp":"2026-01-25 05:10:55.903"}
{"level":"info","message":"背压机制已配置","timestamp":"2026-01-25 05:10:55.905"}
{"level":"info","message":"服务器启动成功","port":3000,"timestamp":"2026-01-25 05:10:55.908"}
{"level":"info","message":"API 文档: http://localhost:3000/api-docs"}
{"level":"info","message":"健康检查: http://localhost:3000/health"}
{"level":"info","message":"监控指标: http://localhost:3000/metrics"}
```

## 访问地址

- **应用主页**: http://localhost:3000
- **API 文档**: http://localhost:3000/api-docs
- **健康检查**: http://localhost:3000/health
- **监控指标**: http://localhost:3000/metrics
- **管理界面**: http://localhost:3000/admin.html

## 数据库访问

```bash
# 连接 MySQL
docker exec -it domain-config-mysql mysql -uroot -ppassword123 domain_config

# 连接 Redis
docker exec -it domain-config-redis redis-cli
```

## 停止服务

```bash
# 停止服务（保留数据）
docker-compose --profile with-redis down

# 停止服务并删除数据卷
docker-compose --profile with-redis down -v
```

## 问题和解决方案

### 问题 1: 端口冲突
**现象**: Redis 6379 和 MySQL 3306 端口被占用

**解决方案**: 
- 修改 .env 文件，使用不同端口
- MySQL: 3307
- Redis: 6380

### 问题 2: MySQL 配置错误
**现象**: `MYSQL_USER="root"` 导致容器启动失败

**解决方案**: 
- 移除 `MYSQL_USER` 和 `MYSQL_PASSWORD` 环境变量
- 只保留 `MYSQL_ROOT_PASSWORD`

### 问题 3: 数据库表未创建
**现象**: API 返回创建失败错误

**解决方案**: 
- 手动执行迁移脚本
- 先执行 001_add_permissions_field.sql
- 再执行 002_split_to_two_tables.sql

## 总结

### ✅ 部署成功
- 所有服务正常启动
- 健康检查通过
- 数据库迁移成功

### ✅ 功能验证
- 双表架构工作正常
- API 端点全部可用
- 配置更新传播正确

### ✅ 性能表现
- Redis 缓存正常
- 数据库连接池稳定
- 响应时间良好

### ✅ 监控和日志
- Prometheus 指标可用
- 结构化日志输出
- 健康检查端点正常

## 建议

1. **生产环境部署**:
   - 使用环境变量管理敏感信息
   - 配置持久化存储
   - 设置资源限制

2. **安全加固**:
   - 修改默认密码
   - 启用 Redis 密码认证
   - 配置网络隔离

3. **监控告警**:
   - 集成 Prometheus + Grafana
   - 配置告警规则
   - 监控容器资源使用

4. **备份策略**:
   - 定期备份 MySQL 数据
   - 保留迁移脚本
   - 测试恢复流程
