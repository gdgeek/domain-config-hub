#!/bin/bash

# Docker 快速启动脚本
# 用于快速部署域名配置服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_success "Docker 和 Docker Compose 已安装"
}

# 检查 .env 文件
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env 文件不存在，将使用默认配置"
        print_info "建议复制 .env.example 并修改配置："
        echo "  cp .env.example .env"
        echo "  nano .env"
        echo ""
        read -p "是否继续使用默认配置？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "找到 .env 配置文件"
    fi
}

# 选择部署模式
select_mode() {
    echo ""
    print_info "请选择部署模式："
    echo "  1) 标准模式（应用 + MySQL）"
    echo "  2) 完整模式（应用 + MySQL + Redis）"
    echo "  3) 开发模式（含日志输出）"
    echo ""
    read -p "请输入选项 (1-3): " -n 1 -r
    echo ""
    
    case $REPLY in
        1)
            MODE="standard"
            print_info "选择：标准模式"
            ;;
        2)
            MODE="full"
            print_info "选择：完整模式（含 Redis）"
            ;;
        3)
            MODE="dev"
            print_info "选择：开发模式"
            ;;
        *)
            print_error "无效选项"
            exit 1
            ;;
    esac
}

# 启动服务
start_services() {
    print_info "正在启动服务..."
    
    case $MODE in
        standard)
            docker-compose up -d
            ;;
        full)
            docker-compose -f docker-compose.yml -f docker-compose.redis.yml up -d
            ;;
        dev)
            print_info "开发模式将在前台运行，按 Ctrl+C 停止"
            sleep 2
            NODE_ENV=development LOG_LEVEL=debug docker-compose -f docker-compose.yml -f docker-compose.redis.yml up
            ;;
    esac
    
    if [ $? -eq 0 ] && [ "$MODE" != "dev" ]; then
        print_success "服务启动成功！"
    fi
}

# 等待服务就绪
wait_for_services() {
    if [ "$MODE" == "dev" ]; then
        return
    fi
    
    print_info "等待服务就绪..."
    
    # 等待最多 60 秒
    for i in {1..60}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            print_success "服务已就绪！"
            return
        fi
        echo -n "."
        sleep 1
    done
    
    echo ""
    print_warning "服务启动超时，请检查日志"
    print_info "查看日志命令: docker-compose logs -f"
}

# 显示访问信息
show_info() {
    if [ "$MODE" == "dev" ]; then
        return
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_success "域名配置服务部署完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📍 访问地址："
    echo "   • API 服务:    http://localhost:3000/api/v1"
    echo "   • 管理界面:    http://localhost:3000/admin.html"
    echo "   • API 文档:    http://localhost:3000/api-docs"
    echo "   • 健康检查:    http://localhost:3000/health"
    echo "   • 监控指标:    http://localhost:3000/metrics"
    echo ""
    echo "🔧 常用命令："
    echo "   • 查看状态:    docker-compose ps"
    echo "   • 查看日志:    docker-compose logs -f"
    echo "   • 停止服务:    docker-compose down"
    echo "   • 重启服务:    docker-compose restart"
    echo ""
    echo "📚 更多命令请查看: make help"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 主函数
main() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  域名配置服务 - Docker 快速启动"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    check_docker
    check_env
    select_mode
    start_services
    wait_for_services
    show_info
}

# 运行主函数
main
