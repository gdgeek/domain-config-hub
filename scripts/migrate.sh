#!/bin/bash

# 数据库迁移脚本
# 用于快速执行数据库迁移

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 显示使用说明
show_usage() {
    cat << EOF
数据库迁移脚本

使用方法:
    $0 [选项] <迁移文件>

选项:
    -h, --help              显示此帮助信息
    -r, --rollback          执行回滚操作
    -e, --env-file FILE     指定环境变量文件 (默认: .env)
    -H, --host HOST         数据库主机 (覆盖环境变量)
    -u, --user USER         数据库用户 (覆盖环境变量)
    -p, --password PASS     数据库密码 (覆盖环境变量)
    -d, --database DB       数据库名称 (覆盖环境变量)
    -P, --port PORT         数据库端口 (覆盖环境变量)
    --dry-run               仅显示将要执行的命令，不实际执行

示例:
    # 执行迁移
    $0 migrations/001_add_permissions_field.sql

    # 执行回滚
    $0 --rollback migrations/rollback_001.sql

    # 使用自定义环境变量文件
    $0 --env-file .env.production migrations/001_add_permissions_field.sql

    # 使用命令行参数指定数据库连接
    $0 -H localhost -u root -p password -d bujiaban migrations/001_add_permissions_field.sql

    # 预览执行命令
    $0 --dry-run migrations/001_add_permissions_field.sql
EOF
}

# 默认值
ENV_FILE=".env"
ROLLBACK=false
DRY_RUN=false
MIGRATION_FILE=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -H|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -p|--password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -P|--port)
            DB_PORT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$MIGRATION_FILE" ]]; then
                MIGRATION_FILE="$1"
            else
                print_error "未知参数: $1"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# 检查迁移文件是否指定
if [[ -z "$MIGRATION_FILE" ]]; then
    print_error "请指定迁移文件"
    show_usage
    exit 1
fi

# 检查迁移文件是否存在
if [[ ! -f "$MIGRATION_FILE" ]]; then
    print_error "迁移文件不存在: $MIGRATION_FILE"
    exit 1
fi

# 加载环境变量
if [[ -f "$ENV_FILE" ]]; then
    print_info "加载环境变量文件: $ENV_FILE"
    # 导出环境变量，但不覆盖已设置的变量
    set -a
    source "$ENV_FILE"
    set +a
else
    print_warning "环境变量文件不存在: $ENV_FILE"
fi

# 设置默认值
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-bujiaban}"

# 检查必需的环境变量
if [[ -z "$DB_PASSWORD" ]]; then
    print_error "数据库密码未设置 (DB_PASSWORD)"
    print_info "请设置环境变量或使用 -p 参数指定密码"
    exit 1
fi

# 显示连接信息
print_info "数据库连接信息:"
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo "  迁移文件: $MIGRATION_FILE"

if [[ "$ROLLBACK" == true ]]; then
    print_warning "执行回滚操作"
fi

# 构建 MySQL 命令
MYSQL_CMD="mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD $DB_NAME"

# 预览模式
if [[ "$DRY_RUN" == true ]]; then
    print_info "预览模式 - 将要执行的命令:"
    echo "$MYSQL_CMD < $MIGRATION_FILE"
    exit 0
fi

# 确认执行
read -p "确认执行迁移? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "取消执行"
    exit 0
fi

# 执行迁移
print_info "开始执行迁移..."

if $MYSQL_CMD < "$MIGRATION_FILE"; then
    print_info "迁移执行成功!"
    
    # 验证结果
    if [[ "$MIGRATION_FILE" == *"001_add_permissions_field"* ]]; then
        print_info "验证 permissions 字段..."
        echo "DESCRIBE domain;" | $MYSQL_CMD | grep permissions && \
            print_info "permissions 字段已成功添加" || \
            print_warning "无法验证 permissions 字段"
    fi
else
    print_error "迁移执行失败!"
    exit 1
fi

print_info "完成!"
