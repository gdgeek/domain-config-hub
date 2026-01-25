#!/bin/bash

# 域名配置服务 Docker Compose 停止脚本

set -e

echo "🛑 停止域名配置服务..."
echo ""

# 显示选项
echo "请选择停止方式："
echo "  1) 停止服务（保留数据）"
echo "  2) 停止服务并删除数据卷"
echo "  3) 取消"
echo ""
read -p "请输入选项 (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🛑 停止服务（保留数据）..."
        docker-compose --profile with-redis down
        echo "✅ 服务已停止，数据已保留"
        ;;
    2)
        echo ""
        read -p "⚠️  确认删除所有数据？(yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🛑 停止服务并删除数据卷..."
            docker-compose --profile with-redis down -v
            echo "✅ 服务已停止，数据已删除"
        else
            echo "❌ 操作已取消"
        fi
        ;;
    3)
        echo "❌ 操作已取消"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "📊 当前容器状态："
docker ps -a | grep "domain-config" || echo "  无相关容器运行"
echo ""
