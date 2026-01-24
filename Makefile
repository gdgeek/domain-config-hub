.PHONY: help build up down restart logs ps clean test migrate

# 默认目标
help:
	@echo "域名配置服务 - Docker 管理命令"
	@echo ""
	@echo "使用方法: make [target]"
	@echo ""
	@echo "可用目标:"
	@echo "  build          - 构建 Docker 镜像"
	@echo "  up             - 启动所有服务（不含 Redis）"
	@echo "  up-redis       - 启动所有服务（含 Redis）"
	@echo "  down           - 停止所有服务"
	@echo "  restart        - 重启所有服务"
	@echo "  logs           - 查看所有服务日志"
	@echo "  logs-app       - 查看应用日志"
	@echo "  logs-mysql     - 查看 MySQL 日志"
	@echo "  logs-redis     - 查看 Redis 日志"
	@echo "  ps             - 查看服务状态"
	@echo "  clean          - 停止服务并删除数据卷"
	@echo "  shell-app      - 进入应用容器"
	@echo "  shell-mysql    - 进入 MySQL 容器"
	@echo "  shell-redis    - 进入 Redis 容器"
	@echo "  migrate        - 运行数据库迁移"
	@echo "  backup-mysql   - 备份 MySQL 数据库"
	@echo "  test           - 运行测试"
	@echo "  dev            - 启动开发环境"

# 构建镜像
build:
	docker-compose build

# 启动服务（不含 Redis）
up:
	docker-compose up -d

# 启动服务（含 Redis）
up-redis:
	docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# 停止服务
down:
	docker-compose down

# 重启服务
restart:
	docker-compose restart

# 查看所有日志
logs:
	docker-compose logs -f

# 查看应用日志
logs-app:
	docker-compose logs -f app

# 查看 MySQL 日志
logs-mysql:
	docker-compose logs -f mysql

# 查看 Redis 日志
logs-redis:
	docker-compose logs -f redis

# 查看服务状态
ps:
	docker-compose ps

# 清理（删除容器和数据卷）
clean:
	docker-compose down -v
	@echo "警告: 所有数据已删除！"

# 进入应用容器
shell-app:
	docker-compose exec app sh

# 进入 MySQL 容器
shell-mysql:
	docker-compose exec mysql bash

# 进入 Redis 容器
shell-redis:
	docker-compose exec redis sh

# 运行数据库迁移
migrate:
	docker-compose exec app npm run migrate

# 备份 MySQL 数据库
backup-mysql:
	@echo "备份 MySQL 数据库..."
	@mkdir -p backups
	@docker-compose exec -T mysql mysqldump -u root -p$${DB_PASSWORD:-password} domain_config > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "备份完成: backups/backup_$$(date +%Y%m%d_%H%M%S).sql"

# 运行测试
test:
	docker-compose exec app npm test

# 开发环境
dev:
	@echo "启动开发环境..."
	NODE_ENV=development LOG_LEVEL=debug docker-compose -f docker-compose.yml -f docker-compose.redis.yml up
