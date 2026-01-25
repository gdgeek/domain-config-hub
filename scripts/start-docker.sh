#!/bin/bash

# 域名配置服务 Docker Compose 启动脚本
# 用途：快速启动完整的服务栈（应用 + MySQL + Redis）

set -e

echo "🚀 启动域名配置服务..."
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建，请根据需要修改配置"
fi

# 停止旧容器
echo "🛑 停止旧容器..."
docker-compose --profile with-redis down 2>/dev/null || true

# 启动服务
echo "🔨 构建并启动服务..."
docker-compose --profile with-redis up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "📊 服务状态："
docker-compose --profile with-redis ps

# 等待健康检查
echo ""
echo "🏥 等待健康检查..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ 服务健康检查通过！"
        break
    fi
    attempt=$((attempt + 1))
    echo "   尝试 $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ 服务启动超时"
    echo "查看日志: docker-compose --profile with-redis logs"
    exit 1
fi

# 检查数据库表
echo ""
echo "🗄️  检查数据库表..."
tables=$(docker exec domain-config-mysql mysql -uroot -ppassword123 -e "USE domain_config; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in" || true)

if echo "$tables" | grep -q "configs"; then
    echo "✅ 双表架构已部署"
else
    echo "⚠️  需要执行数据库迁移"
    echo ""
    echo "执行以下命令进行迁移："
    echo "  docker exec -i domain-config-mysql mysql -uroot -ppassword123 domain_config < migrations/001_add_permissions_field.sql"
    echo "  docker exec -i domain-config-mysql mysql -uroot -ppassword123 domain_config < migrations/002_split_to_two_tables.sql"
fi

# 显示访问地址
echo ""
echo "🎉 服务启动成功！"
echo ""
echo "📋 访问地址："
echo "  - 主页:       http://localhost:3000"
echo "  - 管理界面:   http://localhost:3000/admin/admin.html"
echo "  - API 文档:   http://localhost:3000/api-docs"
echo "  - 健康检查:   http://localhost:3000/health"
echo "  - 监控指标:   http://localhost:3000/metrics"
echo ""
echo "🔧 管理命令："
echo "  - 查看日志:   docker-compose --profile with-redis logs -f"
echo "  - 停止服务:   docker-compose --profile with-redis down"
echo "  - 重启服务:   docker-compose --profile with-redis restart"
echo ""
echo "📚 文档："
echo "  - 部署成功报告: docs/deployment/DEPLOYMENT_SUCCESS.md"
echo "  - 双表设计:     docs/architecture/TWO_TABLES_DESIGN.md"
echo "  - 快速开始:     docs/architecture/TWO_TABLES_QUICKSTART.md"
echo ""
