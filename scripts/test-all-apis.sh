#!/bin/bash

# API 全面测试脚本
BASE_URL="http://localhost:3000"
TOKEN=""

echo "=========================================="
echo "🧪 开始测试所有 API 接口"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL=0
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local expected_status=$5
    local headers=$6
    
    # 添加延迟避免触发速率限制
    sleep 0.1
    
    TOTAL=$((TOTAL + 1))
    echo "测试 $TOTAL: $name"
    echo "  方法: $method"
    echo "  URL: $url"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url" \
                -H "$headers")
        else
            response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$url")
        fi
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ 通过${NC} (状态码: $status_code)"
        PASSED=$((PASSED + 1))
        if [ -n "$body" ] && [ "$body" != "" ]; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
    else
        echo -e "  ${RED}✗ 失败${NC} (期望: $expected_status, 实际: $status_code)"
        FAILED=$((FAILED + 1))
        echo "  响应: $body"
    fi
    echo ""
}

echo "=========================================="
echo "1. 健康检查和监控"
echo "=========================================="
echo ""

test_api "健康检查" "GET" "/health" "" "200"
test_api "监控指标" "GET" "/metrics" "" "200"

echo "=========================================="
echo "2. 认证接口 (Sessions)"
echo "=========================================="
echo ""

test_api "创建会话 - 成功" "POST" "/api/v1/sessions" '{"password":"admin123"}' "201"
# 提取 token
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/sessions" \
    -H "Content-Type: application/json" \
    -d '{"password":"admin123"}' | jq -r '.data.token')
echo "获取到的 Token: ${TOKEN:0:20}..."
echo ""

test_api "创建会话 - 密码错误" "POST" "/api/v1/sessions" '{"password":"wrong"}' "401"
test_api "创建会话 - 缺少密码" "POST" "/api/v1/sessions" '{}' "400"
test_api "获取当前会话" "GET" "/api/v1/sessions/current" "" "200" "Authorization: Bearer $TOKEN"
test_api "删除会话" "DELETE" "/api/v1/sessions" "" "204" "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "3. 旧认证接口 (向后兼容)"
echo "=========================================="
echo ""

test_api "旧登录接口" "POST" "/api/v1/auth/login" '{"password":"admin123"}' "200"

echo "=========================================="
echo "4. Configs API - 读取操作"
echo "=========================================="
echo ""

test_api "获取配置列表" "GET" "/api/v1/configs" "" "200"
test_api "获取配置列表 - 分页" "GET" "/api/v1/configs?page=1&pageSize=10" "" "200"
test_api "通过 ID 获取配置" "GET" "/api/v1/configs/1" "" "200"
test_api "通过 ID 获取配置 - 不存在" "GET" "/api/v1/configs/99999" "" "404"

echo "=========================================="
echo "5. Configs API - 写入操作 (需要认证)"
echo "=========================================="
echo ""

# 重新获取 token
TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/sessions" \
    -H "Content-Type: application/json" \
    -d '{"password":"admin123"}' | jq -r '.data.token')

test_api "创建配置 - 无认证" "POST" "/api/v1/configs" '{"title":"Test"}' "401"
test_api "创建配置 - 成功" "POST" "/api/v1/configs" \
    '{"title":"测试配置","author":"测试作者","description":"测试描述"}' \
    "201" "Authorization: Bearer $TOKEN"

# 获取刚创建的配置 ID
NEW_CONFIG_ID=$(curl -s -X POST "$BASE_URL/api/v1/configs" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title":"临时配置"}' | jq -r '.data.id')
echo "创建的配置 ID: $NEW_CONFIG_ID"
echo ""

test_api "更新配置 (PUT)" "PUT" "/api/v1/configs/$NEW_CONFIG_ID" \
    '{"title":"更新后的标题"}' \
    "200" "Authorization: Bearer $TOKEN"

test_api "部分更新配置 (PATCH)" "PATCH" "/api/v1/configs/$NEW_CONFIG_ID" \
    '{"author":"新作者"}' \
    "200" "Authorization: Bearer $TOKEN"

test_api "部分更新配置 - 空数据" "PATCH" "/api/v1/configs/$NEW_CONFIG_ID" \
    '{}' \
    "400" "Authorization: Bearer $TOKEN"

test_api "删除配置" "DELETE" "/api/v1/configs/$NEW_CONFIG_ID" "" "204" "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "6. Domains API - 读取操作"
echo "=========================================="
echo ""

test_api "获取域名列表" "GET" "/api/v1/domains" "" "200"
test_api "获取域名列表 - 分页" "GET" "/api/v1/domains?page=1&pageSize=5" "" "200"
test_api "通过 domain 参数查询" "GET" "/api/v1/domains?domain=baidu.com" "" "200"
test_api "通过 url 参数查询" "GET" "/api/v1/domains?url=baidu.com" "" "200"
test_api "通过 url 查询 - 子域名" "GET" "/api/v1/domains?url=www.baidu.com" "" "200"
test_api "通过 url 查询 - 完整 URL" "GET" "/api/v1/domains?url=https://www.baidu.com/path" "" "200"
test_api "通过 url 查询 - 不存在" "GET" "/api/v1/domains?url=notfound.com" "" "404"
test_api "通过 ID 获取域名" "GET" "/api/v1/domains/5" "" "200"
test_api "通过 ID 获取域名 - 不存在" "GET" "/api/v1/domains/99999" "" "404"

echo "=========================================="
echo "7. Domains API - 写入操作 (需要认证)"
echo "=========================================="
echo ""

test_api "创建域名 - 无认证" "POST" "/api/v1/domains" \
    '{"domain":"test.com","configId":1}' "401"

test_api "创建域名 - 成功" "POST" "/api/v1/domains" \
    "{\"domain\":\"test-api-$(date +%s).com\",\"configId\":1,\"homepage\":\"https://test-api.com\"}" \
    "201" "Authorization: Bearer $TOKEN"

# 获取刚创建的域名 ID
NEW_DOMAIN_ID=$(curl -s -X POST "$BASE_URL/api/v1/domains" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"domain":"temp-test.com","configId":1}' | jq -r '.data.id')
echo "创建的域名 ID: $NEW_DOMAIN_ID"
echo ""

test_api "更新域名 (PUT)" "PUT" "/api/v1/domains/$NEW_DOMAIN_ID" \
    '{"homepage":"https://new-homepage.com","configId":1}' \
    "200" "Authorization: Bearer $TOKEN"

test_api "部分更新域名 (PATCH)" "PATCH" "/api/v1/domains/$NEW_DOMAIN_ID" \
    '{"homepage":"https://updated.com"}' \
    "200" "Authorization: Bearer $TOKEN"

test_api "部分更新域名 - 空数据" "PATCH" "/api/v1/domains/$NEW_DOMAIN_ID" \
    '{}' \
    "400" "Authorization: Bearer $TOKEN"

test_api "删除域名" "DELETE" "/api/v1/domains/$NEW_DOMAIN_ID" "" "204" "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "8. 错误处理测试"
echo "=========================================="
echo ""

test_api "404 - 不存在的路径" "GET" "/api/v1/notfound" "" "404"
test_api "验证错误 - 无效的分页参数（自动修正）" "GET" "/api/v1/domains?page=0" "" "200"
test_api "创建域名 - 缺少必需字段" "POST" "/api/v1/domains" \
    '{"domain":""}' \
    "400" "Authorization: Bearer $TOKEN"

echo "=========================================="
echo "9. CORS 测试"
echo "=========================================="
echo ""

test_api "OPTIONS 预检请求" "OPTIONS" "/api/v1/domains" "" "204"

echo "=========================================="
echo "📊 测试结果汇总"
echo "=========================================="
echo ""
echo "总测试数: $TOTAL"
echo -e "${GREEN}通过: $PASSED${NC}"
echo -e "${RED}失败: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 有 $FAILED 个测试失败${NC}"
    exit 1
fi
