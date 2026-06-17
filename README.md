# Jenkins MCP Server

```
     ██╗███████╗███╗   ██╗██╗  ██╗██╗███╗   ██╗███████╗    ███╗   ███╗ ██████╗██████╗
     ██║██╔════╝████╗  ██║██║ ██╔╝██║████╗  ██║██╔════╝    ████╗ ████║██╔════╝██╔══██╗
     ██║█████╗  ██╔██╗ ██║█████╔╝ ██║██╔██╗ ██║███████╗    ██╔████╔██║██║     ██████╔╝
██   ██║██╔══╝  ██║╚██╗██║██╔═██╗ ██║██║╚██╗██║╚════██║    ██║╚██╔╝██║██║     ██╔═══╝
╚█████╔╝███████╗██║ ╚████║██║  ██╗██║██║ ╚████║███████║    ██║ ╚═╝ ██║╚██████╗██║
 ╚════╝ ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝    ╚═╝     ╚═╝ ╚═════╝╚═╝
```

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple?logo=anthropic)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A Jenkins MCP server with 37 tools for managing jobs, builds, nodes, views, and CI/CD workflows**

<a href="https://kud.io/projects/mcp-jenkins">Website</a> · <a href="https://kud.io/projects/mcp-jenkins/docs">Documentation</a>

</div>

---

A Jenkins MCP server with 37 tools for managing jobs, builds, nodes, views, and CI/CD workflows, with native integration for Claude Desktop and the Claude Code CLI.

## ✨ Features

- **🔐 Flexible Authentication** - Bearer tokens, Basic auth, OAuth support
- **⚙️ Flexible Configuration** - CLI args or `MCP_JENKINS_*` env vars (priority-based)
- **🔒 Tool Filtering** - Allowlist or blocklist tools via `MCP_JENKINS_ALLOW_TOOLS` / `MCP_JENKINS_BLOCK_TOOLS`
- **🔀 Multi-Instance Support** - Connect to multiple Jenkins servers in one MCP entry, select per tool call
- **🛠️ 37 Tools** - Comprehensive Jenkins API coverage
- **⚡ Modern Stack** - TypeScript 5.3+, ES2023, Native Fetch API
- **📦 MCP Protocol** - Native integration with Claude Desktop, Claude Code CLI
- **🔄 Real-time Monitoring** - Build status, queue management, pipeline stages
- **🧪 Test Results** - View test pass/fail counts and suites
- **🎯 Job Control** - Enable/disable, trigger, stop, replay builds
- **📊 System Info** - Nodes, plugins, version info
- **🔍 Debug Tools** - MCP inspector for testing

## 🚀 Install

```bash
claude mcp add --transport stdio --scope user jenkins \
  --env MCP_JENKINS_URL=https://your-jenkins.com \
  --env MCP_JENKINS_USER=your_username \
  --env MCP_JENKINS_API_TOKEN=your_token \
  -- npx --yes @kud/mcp-jenkins@latest
```

## 📖 Documentation

Full tool reference, usage, and configuration live on the docs site:

**→ [kud.io/projects/mcp-jenkins/docs](https://kud.io/projects/mcp-jenkins/docs)**

## 🔧 Development

### Available Scripts

| Script                | Description                      |
| --------------------- | -------------------------------- |
| `npm run build`       | Compile TypeScript to JavaScript |
| `npm run build:watch` | Watch mode - rebuild on changes  |
| `npm run dev`         | Run in development (tsx)         |
| `npm start`           | Run compiled server              |
| `npm run inspect`     | Open MCP inspector               |
| `npm run inspect:dev` | Inspector in dev mode (no build) |
| `npm run typecheck`   | Type check without building      |
| `npm run clean`       | Remove build artifacts           |

```bash
# Terminal 1: Watch mode
npm run build:watch

# Terminal 2: Test with inspector
npm run inspect:dev
```

## License

MIT © [kud](https://github.com/kud)
