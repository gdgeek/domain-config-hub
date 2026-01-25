/**
 * JSON 响应中间件
 * 
 * 确保所有 JSON 响应都有正确的 Content-Type 响应头
 * 并添加安全相关的响应头
 * 支持内容协商：浏览器访问时返回格式化的 HTML，API 调用时返回 JSON
 */

import { Request, Response, NextFunction } from 'express';

/**
 * 检查请求是否来自浏览器
 */
function isBrowserRequest(req: Request): boolean {
  const accept = req.headers.accept || '';
  const userAgent = req.headers['user-agent'] || '';
  
  // 如果明确请求 JSON，返回 JSON
  if (accept.includes('application/json')) {
    return false;
  }
  
  // 如果请求 HTML，说明是浏览器
  if (accept.includes('text/html')) {
    return true;
  }
  
  // 检查 User-Agent 是否包含浏览器标识
  const browserPatterns = [
    /Mozilla/i,
    /Chrome/i,
    /Safari/i,
    /Firefox/i,
    /Edge/i,
    /Opera/i,
  ];
  
  return browserPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * 生成格式化的 HTML 响应
 */
function generateHtmlResponse(data: any, statusCode: number): string {
  const jsonString = JSON.stringify(data, null, 2);
  const isError = statusCode >= 400;
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API 响应 - ${statusCode}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: ${isError ? '#dc3545' : '#28a745'};
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            font-size: 24px;
            font-weight: 600;
        }
        .status-badge {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }
        .content {
            padding: 30px;
        }
        .json-viewer {
            background: #282c34;
            color: #abb2bf;
            padding: 20px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
            font-size: 14px;
            line-height: 1.5;
        }
        .json-key {
            color: #e06c75;
        }
        .json-string {
            color: #98c379;
        }
        .json-number {
            color: #d19a66;
        }
        .json-boolean {
            color: #56b6c2;
        }
        .json-null {
            color: #c678dd;
        }
        .info-bar {
            background: #f8f9fa;
            padding: 15px 30px;
            border-top: 1px solid #e9ecef;
            font-size: 13px;
            color: #6c757d;
        }
        .copy-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 15px;
        }
        .copy-btn:hover {
            background: #0056b3;
        }
        .copy-btn:active {
            background: #004085;
        }
        .copied {
            background: #28a745 !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 API 响应</h1>
            <div class="status-badge">状态码: ${statusCode}</div>
        </div>
        <div class="content">
            <pre class="json-viewer" id="json-content">${escapeHtml(jsonString)}</pre>
            <button class="copy-btn" onclick="copyToClipboard()">📋 复制 JSON</button>
        </div>
        <div class="info-bar">
            💡 提示：这是浏览器友好的格式化视图。API 调用时会返回标准 JSON 格式。
        </div>
    </div>
    <script>
        function copyToClipboard() {
            const content = document.getElementById('json-content').textContent;
            navigator.clipboard.writeText(content).then(() => {
                const btn = document.querySelector('.copy-btn');
                btn.textContent = '✓ 已复制';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '📋 复制 JSON';
                    btn.classList.remove('copied');
                }, 2000);
            });
        }
        
        // 语法高亮
        function highlightJSON() {
            const pre = document.getElementById('json-content');
            let html = pre.innerHTML;
            
            // 高亮字符串
            html = html.replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:');
            html = html.replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>');
            
            // 高亮数字
            html = html.replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>');
            
            // 高亮布尔值
            html = html.replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>');
            
            // 高亮 null
            html = html.replace(/: (null)/g, ': <span class="json-null">$1</span>');
            
            pre.innerHTML = html;
        }
        
        highlightJSON();
    </script>
</body>
</html>`;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * JSON 响应中间件
 * 
 * 功能：
 * 1. 为所有 JSON 响应设置正确的 Content-Type
 * 2. 添加 X-Content-Type-Options 防止 MIME 类型嗅探
 * 3. 支持内容协商：浏览器访问时返回格式化的 HTML
 */
export function jsonResponseMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 重写 res.json 方法
  const originalJson = res.json.bind(res);
  
  res.json = function (body: any): Response {
    // 检查是否是浏览器请求
    const isBrowser = isBrowserRequest(req);
    
    if (isBrowser) {
      // 浏览器请求：返回格式化的 HTML
      const statusCode = res.statusCode || 200;
      const html = generateHtmlResponse(body, statusCode);
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      return res.send(html);
    } else {
      // API 请求：返回标准 JSON
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      return originalJson(body);
    }
  };
  
  next();
}
