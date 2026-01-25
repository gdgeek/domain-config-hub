# 内容协商功能说明

## 功能概述

API 现在支持**智能内容协商**，根据客户端类型自动返回最合适的格式：

- 🌐 **浏览器访问**：返回格式化的 HTML 页面，美观易读
- 🔧 **API 调用**：返回标准 JSON 格式，便于程序处理

## 工作原理

系统通过检查 HTTP 请求头来判断客户端类型：

### 1. Accept 头优先级

```
Accept: application/json  → 返回 JSON（最高优先级）
Accept: text/html         → 返回 HTML
Accept: */*               → 根据 User-Agent 判断
```

### 2. User-Agent 检测

如果 Accept 头不明确，系统会检查 User-Agent 是否包含浏览器标识：
- Mozilla
- Chrome
- Safari
- Firefox
- Edge
- Opera

## 使用示例

### 场景 1：浏览器直接访问

**请求**：
```
GET http://localhost:3000/api/v1/domains/www.baidu.com
Accept: text/html
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
```

**响应**：
```
Content-Type: text/html; charset=utf-8
X-Content-Type-Options: nosniff

<!DOCTYPE html>
<html>
  <!-- 格式化的 HTML 页面，包含：
       - 语法高亮的 JSON
       - 复制按钮
       - 状态码显示
       - 友好的界面
  -->
</html>
```

**效果**：
- ✅ 不再显示 "This XML file does not appear to have any style information"
- ✅ JSON 数据格式化显示，带语法高亮
- ✅ 可以一键复制 JSON 数据
- ✅ 显示状态码和提示信息

### 场景 2：curl 命令行调用

**请求**：
```bash
curl http://localhost:3000/api/v1/domains/www.baidu.com
```

**响应**：
```
Content-Type: application/json; charset=utf-8
X-Content-Type-Options: nosniff

{"data":{"id":5,"domain":"baidu.com",...}}
```

**效果**：
- ✅ 返回标准 JSON 格式
- ✅ 便于命令行工具处理

### 场景 3：JavaScript fetch/axios 调用

**请求**：
```javascript
fetch('http://localhost:3000/api/v1/domains/www.baidu.com', {
  headers: {
    'Accept': 'application/json'
  }
})
```

**响应**：
```
Content-Type: application/json; charset=utf-8
X-Content-Type-Options: nosniff

{"data":{"id":5,"domain":"baidu.com",...}}
```

**效果**：
- ✅ 返回标准 JSON 格式
- ✅ 即使 User-Agent 是浏览器，也返回 JSON

### 场景 4：Postman/Insomnia 等 API 工具

**请求**：
```
GET http://localhost:3000/api/v1/domains/www.baidu.com
Accept: */*
User-Agent: PostmanRuntime/7.26.8
```

**响应**：
```
Content-Type: application/json; charset=utf-8
X-Content-Type-Options: nosniff

{"data":{"id":5,"domain":"baidu.com",...}}
```

**效果**：
- ✅ 返回标准 JSON 格式
- ✅ API 工具正常工作

## HTML 视图功能

当浏览器访问 API 时，会看到一个美观的 HTML 页面，包含：

### 1. 顶部状态栏
- 显示 API 响应标题
- 显示 HTTP 状态码
- 成功（2xx）显示绿色，错误（4xx/5xx）显示红色

### 2. JSON 内容区
- 语法高亮显示
- 自动缩进格式化
- 深色主题，护眼舒适
- 支持横向滚动（长内容）

### 3. 操作按钮
- 📋 一键复制 JSON 数据
- 复制成功后显示 ✓ 已复制

### 4. 提示信息
- 说明这是浏览器友好视图
- 提示 API 调用时返回标准 JSON

## 测试验证

### 命令行测试

```bash
# 1. curl 请求（返回 JSON）
curl http://localhost:3000/api/v1/domains/www.baidu.com

# 2. 模拟浏览器请求（返回 HTML）
curl -H "Accept: text/html" -H "User-Agent: Mozilla/5.0" \
  http://localhost:3000/api/v1/domains/www.baidu.com

# 3. 明确请求 JSON（返回 JSON）
curl -H "Accept: application/json" -H "User-Agent: Mozilla/5.0" \
  http://localhost:3000/api/v1/domains/www.baidu.com

# 4. 检查响应头
curl -I -H "Accept: text/html" -H "User-Agent: Mozilla/5.0" \
  http://localhost:3000/api/v1/domains/www.baidu.com
```

### 浏览器测试

直接在浏览器中访问：
```
http://localhost:3000/api/v1/domains/www.baidu.com
http://localhost:3000/api/v1/configs
http://localhost:3000/health
```

### 测试页面

访问专门的测试页面：
```
http://localhost:3000/test-json.html
```

## 技术实现

### 核心中间件

`src/middleware/JsonResponseMiddleware.ts`

**功能**：
1. 检测客户端类型（浏览器 vs API 工具）
2. 重写 `res.json()` 方法
3. 根据客户端类型返回不同格式
4. 设置正确的 Content-Type 响应头
5. 添加 X-Content-Type-Options 安全头

**判断逻辑**：
```typescript
function isBrowserRequest(req: Request): boolean {
  const accept = req.headers.accept || '';
  
  // 1. 明确请求 JSON → 返回 JSON
  if (accept.includes('application/json')) {
    return false;
  }
  
  // 2. 请求 HTML → 返回 HTML
  if (accept.includes('text/html')) {
    return true;
  }
  
  // 3. 检查 User-Agent
  return /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(userAgent);
}
```

## 兼容性

### 支持的客户端

✅ **浏览器**（返回 HTML）：
- Chrome/Edge
- Firefox
- Safari
- Opera
- 其他基于 Chromium 的浏览器

✅ **API 工具**（返回 JSON）：
- curl
- wget
- Postman
- Insomnia
- HTTPie
- Thunder Client

✅ **编程语言**（返回 JSON）：
- JavaScript (fetch, axios)
- Python (requests)
- Java (HttpClient)
- Go (net/http)
- PHP (cURL)
- Ruby (Net::HTTP)

## 安全性

### 响应头

所有响应都包含安全响应头：

```
Content-Type: application/json; charset=utf-8  (或 text/html)
X-Content-Type-Options: nosniff
```

### X-Content-Type-Options: nosniff

**作用**：
- 防止浏览器进行 MIME 类型嗅探
- 强制浏览器遵守服务器声明的 Content-Type
- 提高安全性，防止某些类型的 XSS 攻击

## 性能影响

### HTML 生成开销

- HTML 页面动态生成，有轻微性能开销
- 仅影响浏览器访问，不影响 API 调用
- 生成的 HTML 包含完整的 CSS 和 JavaScript（无外部依赖）

### 优化建议

如果需要进一步优化：
1. 可以缓存 HTML 模板
2. 可以使用模板引擎（如 EJS）
3. 可以添加 CDN 加速静态资源

## 测试覆盖

### 单元测试

`src/middleware/JsonResponseMiddleware.test.ts`

- ✅ 8 个测试用例
- ✅ 覆盖 API 请求场景
- ✅ 覆盖浏览器请求场景
- ✅ 覆盖混合场景

### 集成测试

- ✅ 所有 556 个测试通过
- ✅ 不影响现有功能
- ✅ 向后兼容

## 对比其他 API

### 你的旧 API

```
https://api.test.bujiaban.com/a1/verses/626
Content-Type: application/json; charset=UTF-8
```

- 只返回 JSON
- 浏览器访问时可能显示为纯文本或 XML

### 新 API（优化后）

```
http://localhost:3000/api/v1/domains/www.baidu.com
Content-Type: application/json; charset=utf-8  (API 调用)
Content-Type: text/html; charset=utf-8         (浏览器访问)
X-Content-Type-Options: nosniff
```

- 智能识别客户端类型
- 浏览器访问时显示格式化的 HTML
- API 调用时返回标准 JSON
- 添加安全响应头

## 总结

✅ **问题解决**：不再显示 "This XML file does not appear to have any style information"
✅ **用户体验**：浏览器访问时显示美观的格式化页面
✅ **API 兼容**：不影响现有 API 调用
✅ **安全增强**：添加 X-Content-Type-Options 响应头
✅ **智能判断**：根据客户端类型自动选择最佳格式
✅ **测试完善**：556 个测试全部通过

现在你可以：
1. 在浏览器中直接访问 API，看到格式化的 JSON
2. 使用 API 工具正常调用，获取标准 JSON
3. 在 JavaScript 中使用 fetch/axios，正常工作
4. 享受更好的开发体验！
