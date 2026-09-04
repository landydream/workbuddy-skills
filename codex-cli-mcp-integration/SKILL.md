---
name: codex-cli-mcp-integration
description: 在 Windows 上安装配置 Codex CLI（中转 provider / 自定义模型 / MCP server），并将其经 `codex mcp-server` 接入 WorkBuddy 等 Agent 宿主的完整配置片段与踩坑清单。适用于：配置中转 API（OpenAI 兼容网关）、非 git 目录运行报错、编码乱码、MCP server 双向接入（Codex 作为宿主挂 MCP、Codex 作为工具被 WorkBuddy 调用）等任务。
---

# Codex CLI 经 MCP 接入 WorkBuddy

覆盖两个方向：① WorkBuddy 把 Codex 当工具调（WorkBuddy 挂 codex MCP server）；② Codex 自己当宿主挂第三方 MCP server。配置片段来自 Windows 实机验证。

## 1. 安装与登录

```powershell
npm install -g @openai/codex    # 实测版本 v0.147.0
codex login                     # API Key 登录（auth.json 存于 ~/.codex/）
```

## 2. config.toml：中转 provider 配置

配置文件在 `C:\Users\<用户名>\.codex\config.toml`。中转网关（OpenAI 兼容）最小配置：

```toml
model_provider = "MyOpenAI"
model = "<模型名>"
review_model = "<模型名>"
model_reasoning_effort = "xhigh"
disable_response_storage = true

[model_providers.MyOpenAI]
name = "MyOpenAI"
base_url = "http://<中转网关地址:端口>"   # 不要带 /v1 后缀，按网关文档
wire_api = "responses"
requires_openai_auth = true
```

**注意**：

- `wire_api` 决定走 responses 还是 chat completions 协议，中转网关支持哪种填哪种。
- `requires_openai_auth = true` 时走 `codex login` 的 API Key（auth.json），不要把 key 写进 config.toml。
- 换 provider/模型后先跑一句简单 prompt 验证链路，再谈别的。

## 3. 非 git 目录运行：`--skip-git-repo-check`

Codex 默认拒绝在非 git 目录里工作。在 D 盘项目等无 git 仓库的目录直接运行会报错，绕过方式：

```bash
codex --skip-git-repo-check
# 或 exec 模式
codex exec --skip-git-repo-check "<任务描述>"
```

更彻底的做法是把常用目录加入信任（写进 config.toml）：

```toml
[projects.'d:\your\project\path']
trust_level = "trusted"
```

## 4. WorkBuddy 侧：挂 codex 为 MCP server

WorkBuddy 的 MCP 配置在 `~/.workbuddy/mcp.json`（注意不是 `.mcp.json`）。`mcpServers` 中加入：

```json
{
  "mcpServers": {
    "codex": {
      "command": "codex",
      "args": ["mcp-server"],
      "disabled": false
    }
  }
}
```

- `codex mcp-server` 是 Codex 内置的 MCP 服务模式，把 Codex 的编码能力以工具形式暴露给宿主。
- 写完配置后宿主不会自动激活：在宿主的连接器管理页对新的 MCP server 点"信任"（或重开会话）才生效。
- 若 `codex` 不在 PATH，`command` 填 codex 的绝对路径。

## 5. Codex 侧：挂第三方 MCP server

在 `~/.codex/config.toml` 中：

```toml
[mcp_servers.<server-name>]
command = "<可执行文件绝对路径>"
args = ["<脚本路径>", "<更多参数>"]
```

实例（Node 运行时隔离目录下的 MCP server）：

```toml
[mcp_servers.deepseek-harness]
command = "C:\\Users\\<用户名>\\.workbuddy\\binaries\\node\\versions\\<版本>\\node.exe"
args = ["<node_modules 下的 dist/bin.mjs 绝对路径>"]
```

TOML 注意：Windows 路径反斜杠必须转义（`\\`），或改用单引号字符串（literal string）免转义。

## 6. Windows 踩坑清单

| 坑 | 现象 | 修法 |
|---|---|---|
| 非 git 目录 | 启动即报错 | `--skip-git-repo-check` 或 `[projects]` 信任 |
| 中文乱码 | 输出/交互乱码 | config.toml 设 `[shell_environment_policy.set]` 的 `LANG`/`LC_ALL` 为 `zh_CN.UTF-8`，并开 `powershell_utf8` feature |
| 沙箱权限 | 命令被拦 | `[windows] sandbox = "elevated"`（按需，安全性换便利） |
| 配置改了不生效 | 行为没变 | 确认改的是 `~/.codex/config.toml` 而非 `.bak` 副本；重启 codex 会话 |

## 7. 验证链路

```bash
# ① Codex 本体能跑
codex exec --skip-git-repo-check "回复 OK"
# ② MCP server 模式能起（挂起不退出即正常，Ctrl+C 结束）
codex mcp-server
# ③ 宿主侧：WorkBuddy 里让 agent 调 codex 工具跑一个小任务
```
