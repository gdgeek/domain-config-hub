#!/bin/bash

# 文档整理脚本
# 将根目录的 .md 和 .sh 文件移动到合适的目录

echo "开始整理文档和脚本..."

# 创建目录结构
mkdir -p docs/api
mkdir -p docs/deployment  
mkdir -p docs/testing
mkdir -p docs/architecture
mkdir -p docs/restful

# 移动 API 相关文档
echo "移动 API 文档..."
[ -f "API_QUERY_GUIDE.md" ] && git mv API_QUERY_GUIDE.md docs/api/
[ -f "API_TEST_REPORT.md" ] && git mv API_TEST_REPORT.md docs/testing/
[ -f "API_USAGE_GUIDE.md" ] && git mv API_USAGE_GUIDE.md docs/api/
[ -f "API_PATH_FIX_SUMMARY.md" ] && git mv API_PATH_FIX_SUMMARY.md docs/api/
[ -f "CONTENT_NEGOTIATION_GUIDE.md" ] && git mv CONTENT_NEGOTIATION_GUIDE.md docs/api/
[ -f "CONTENT_TYPE_VERIFICATION.md" ] && git mv CONTENT_TYPE_VERIFICATION.md docs/testing/
[ -f "SWAGGER_AUTH_GUIDE.md" ] && git mv SWAGGER_AUTH_GUIDE.md docs/api/
[ -f "SWAGGER_FIX_SUMMARY.md" ] && git mv SWAGGER_FIX_SUMMARY.md docs/api/
[ -f "SWAGGER_VERIFICATION.md" ] && git mv SWAGGER_VERIFICATION.md docs/testing/

# 移动 RESTful 相关文档
echo "移动 RESTful 文档..."
[ -f "RESTFUL_API_ANALYSIS.md" ] && git mv RESTFUL_API_ANALYSIS.md docs/restful/
[ -f "RESTFUL_IMPROVEMENT_PLAN.md" ] && git mv RESTFUL_IMPROVEMENT_PLAN.md docs/restful/
[ -f "RESTFUL_MIGRATION_COMPLETE.md" ] && git mv RESTFUL_MIGRATION_COMPLETE.md docs/restful/
[ -f "RESTFUL_QUICK_REFERENCE.md" ] && git mv RESTFUL_QUICK_REFERENCE.md docs/restful/
[ -f "RESTFUL_SUMMARY.md" ] && git mv RESTFUL_SUMMARY.md docs/restful/

# 移动部署相关文档
echo "移动部署文档..."
[ -f "DEPLOYMENT_SUCCESS.md" ] && git mv DEPLOYMENT_SUCCESS.md docs/deployment/
[ -f "DOCKER_DEPLOYMENT_TEST.md" ] && git mv DOCKER_DEPLOYMENT_TEST.md docs/deployment/
[ -f "docker-compose.README.md" ] && git mv docker-compose.README.md docs/deployment/

# 移动测试相关文档
echo "移动测试文档..."
[ -f "FINAL_TEST_REPORT.md" ] && git mv FINAL_TEST_REPORT.md docs/testing/
[ -f "QUALITY_REPORT.md" ] && git mv QUALITY_REPORT.md docs/testing/
[ -f "DOUBLE_TABLE_VERIFICATION.md" ] && git mv DOUBLE_TABLE_VERIFICATION.md docs/testing/

# 移动架构相关文档
echo "移动架构文档..."
[ -f "AUTH_IMPLEMENTATION_SUMMARY.md" ] && git mv AUTH_IMPLEMENTATION_SUMMARY.md docs/architecture/
[ -f "DOMAIN_MATCHING_GUIDE.md" ] && git mv DOMAIN_MATCHING_GUIDE.md docs/architecture/
[ -f "DOMAIN_MATCHING_IMPLEMENTATION.md" ] && git mv DOMAIN_MATCHING_IMPLEMENTATION.md docs/architecture/
[ -f "SECURITY_DESIGN.md" ] && git mv SECURITY_DESIGN.md docs/architecture/
[ -f "MIGRATION_SUMMARY.md" ] && git mv MIGRATION_SUMMARY.md docs/architecture/
[ -f "技术底层方案文档.md" ] && git mv 技术底层方案文档.md docs/architecture/

# 移动管理相关文档
echo "移动管理文档..."
[ -f "ADMIN_LOGIN_FIX.md" ] && git mv ADMIN_LOGIN_FIX.md docs/
[ -f "LOGIN_INFO.md" ] && git mv LOGIN_INFO.md docs/
[ -f "COMPLETION_SUMMARY.md" ] && git mv COMPLETION_SUMMARY.md docs/

# 移动脚本文件到 scripts 目录
echo "移动脚本文件..."
[ -f "start-docker.sh" ] && git mv start-docker.sh scripts/
[ -f "stop-docker.sh" ] && git mv stop-docker.sh scripts/
[ -f "test-all-apis.sh" ] && git mv test-all-apis.sh scripts/

echo "文档整理完成！"
echo ""
echo "新的目录结构："
echo "docs/"
echo "  ├── api/          - API 相关文档"
echo "  ├── deployment/   - 部署相关文档"
echo "  ├── testing/      - 测试相关文档"
echo "  ├── architecture/ - 架构设计文档"
echo "  └── restful/      - RESTful 迁移文档"
echo ""
echo "scripts/"
echo "  ├── docker-quickstart.sh"
echo "  ├── migrate.sh"
echo "  ├── organize-docs.sh"
echo "  ├── start-docker.sh"
echo "  ├── stop-docker.sh"
echo "  └── test-all-apis.sh"
