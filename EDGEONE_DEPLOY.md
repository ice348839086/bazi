# EdgeOne Pages 部署说明（算命项目）

## 1. 配置 API Token（部署前必做）

MCP 部署需要 **API Token**，不是浏览器 OAuth。请按下面做一次：

### 1.1 创建 API Token

1. 打开 **[EdgeOne Pages 控制台 - API Token](https://console.tencentcloud.com/edgeone/pages?tab=api)**，登录腾讯云。
2. 切换到 **「API Token」** 标签页。
3. 点击 **「创建 API Token」**，填写描述、选择有效期（建议 1 天～1 年），提交。
4. **复制生成的 Token**（只显示一次，请妥善保存）。

### 1.2 在 Cursor 里配置 Token

把 Token 配置给 EdgeOne Pages MCP，任选一种方式：

- **方式 A（推荐）**：在 Cursor 的 MCP 配置里，给 `edgeone-pages-mcp-server` 增加环境变量 `EDGEONE_PAGES_API_TOKEN`，值为上面复制的 Token。  
  - 若用 `mcp.json`：在对应 server 下加 `"env": { "EDGEONE_PAGES_API_TOKEN": "你的Token" }`。
  - 若在 Cursor 设置里配置 MCP：在该 server 的 Environment Variables 里添加 `EDGEONE_PAGES_API_TOKEN`。
- **方式 B**：在系统环境变量里添加 `EDGEONE_PAGES_API_TOKEN`（重启 Cursor 后生效）。

配置完成后**重启 Cursor**，再在对话里说「重新部署算命项目」即可。

## 2. 环境变量（必配）

项目依赖 **DeepSeek API**，部署后必须在 EdgeOne 控制台配置：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek 开放平台 API Key | 是 |
| `DEEPSEEK_API_URL` | 可选，默认 `https://api.deepseek.com/v1` | 否 |

**配置步骤：**

1. 打开 [EdgeOne Pages 控制台](https://console.tencentcloud.com/edgeone/pages)。
2. 进入你的 **算命项目** → **项目设置** → **环境变量**。
3. 添加 `DEEPSEEK_API_KEY`（值填你的 Key），保存后重新部署一次。

## 3. 项目说明

- **类型**：Next.js 14 全栈（含 `/api/analyze`）。
- **构建**：由 `edgeone.json` 指定 `nodeVersion: 20.18.0`、`npm install`、`npm run build`。
- 部署成功后，访问 EdgeOne 提供的 **站点 URL** 即可使用，国内直连、免翻墙。

## 4. 获取 DeepSeek API Key

若还没有 Key：

1. 打开 [DeepSeek 开放平台](https://platform.deepseek.com/)。
2. 注册/登录后，在「API Keys」里创建 Key。
3. 将 Key 填入 EdgeOne 的 `DEEPSEEK_API_KEY` 环境变量。
