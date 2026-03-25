# SkillFlow MCP Server

[![npm version](https://img.shields.io/npm/v/skillflow-mcp-server.svg)](https://www.npmjs.com/package/skillflow-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/skillflow-mcp-server.svg)](https://www.npmjs.com/package/skillflow-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-Published-green)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Available on SkillFlow](https://raw.githubusercontent.com/rafsilva85/awesome-ai-skills/main/badges/skillflow-available.svg)](https://skillflow.builders)

> Connect AI coding agents to 500+ curated AI skills. Zero config. No API keys. One command.

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI coding agents to the [SkillFlow](https://skillflow.builders) marketplace — the curated AI skills marketplace with trust metrics and performance data.

## Why SkillFlow?

AI agents are the new users. Instead of browsing a website, agents can now **programmatically search, discover, and install skills** from SkillFlow using the MCP protocol.

> "It's 2026. Build. For. Agents." — Andrej Karpathy

**Key benefits:**
- **500+ curated skills** across 20+ categories
- **Trust metrics** — every skill has quality scores and real performance data
- **Zero config** — no API keys, no environment variables, just `npx`
- **Works everywhere** — Claude Desktop, Cursor, Windsurf, Copilot, Gemini CLI, and any MCP-compatible agent

## Quick Start

### One-liner (npx)

```bash
npx skillflow-mcp-server
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skillflow": {
      "command": "npx",
      "args": ["-y", "skillflow-mcp-server"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "skillflow": {
      "command": "npx",
      "args": ["-y", "skillflow-mcp-server"]
    }
  }
}
```

### Windsurf / VS Code / Other MCP Clients

```json
{
  "mcpServers": {
    "skillflow": {
      "command": "npx",
      "args": ["-y", "skillflow-mcp-server"]
    }
  }
}
```

### Global Installation

```bash
npm install -g skillflow-mcp-server
skillflow-mcp
```

## Available Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search for skills by keyword, category, or tag |
| `get_skill_details` | Get detailed info about a specific skill including install instructions |
| `list_categories` | List all 20+ skill categories |
| `get_trending_skills` | Get currently trending and featured skills |
| `get_featured_skills` | Get hand-picked featured skills |
| `get_publisher_info` | Get info about a skill publisher |

## Examples

Once connected, ask your AI agent:

- *"Search for skills that help with Docker configuration"*
- *"What are the trending skills on SkillFlow?"*
- *"Get details about the credit-optimizer-v5 skill"*
- *"List all skill categories"*
- *"Show me skills by publisher rafsilva85"*
- *"Find skills for code review automation"*

## How It Works

```
┌─────────────┐     MCP Protocol     ┌──────────────────┐     API     ┌──────────────┐
│  AI Agent   │ ◄──────────────────► │ SkillFlow MCP    │ ◄─────────► │  SkillFlow   │
│ (Claude,    │    stdio transport    │ Server           │             │  Marketplace │
│  Cursor...) │                       └──────────────────┘             └──────────────┘
└─────────────┘
```

The MCP server acts as a bridge between AI coding agents and the SkillFlow marketplace, translating natural language requests into structured skill data.

## Listed On

- [Official MCP Registry](https://registry.modelcontextprotocol.io) (Anthropic)
- [npm](https://www.npmjs.com/package/skillflow-mcp-server)
- [MCP Market](https://mcpmarket.com)
- [mcpservers.org](https://mcpservers.org)
- [Glama.ai](https://glama.ai/mcp/servers)

## Development

```bash
git clone https://github.com/rafsilva85/skillflow-mcp-server.git
cd skillflow-mcp-server
npm install
npm run build
npm start
```

## Contributing

Contributions welcome! Please open an issue or submit a PR.

## License

MIT — [Rafael Silva](https://github.com/rafsilva85)

---

Built with the [MCP SDK](https://github.com/modelcontextprotocol/sdk) | Powered by [SkillFlow](https://skillflow.builders)
