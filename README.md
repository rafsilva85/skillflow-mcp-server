# SkillFlow MCP Server

[![Available on SkillFlow](https://raw.githubusercontent.com/rafsilva85/awesome-ai-skills/main/badges/skillflow-available.svg)](https://skillflow.builders)
[![npm version](https://img.shields.io/npm/v/skillflow-mcp-server.svg)](https://www.npmjs.com/package/skillflow-mcp-server)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI coding agents to the [SkillFlow](https://skillflow.builders) marketplace. Search, discover, and install AI agent skills directly from Claude, Cursor, Copilot, Gemini CLI, and more.

## Why?

AI agents are the new users. Instead of browsing a website, agents can now programmatically search and install skills from SkillFlow using the MCP protocol.

> "It's 2026. Build. For. Agents." — Andrej Karpathy

## Quick Start

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

### Manual Installation

```bash
npm install -g skillflow-mcp-server
skillflow-mcp
```

## Available Tools

| Tool | Description |
|------|-------------|
| `search_skills` | Search for skills by keyword, category, or tag |
| `get_skill_details` | Get detailed info about a specific skill |
| `list_categories` | List all skill categories |
| `get_trending_skills` | Get currently trending skills |
| `get_publisher_info` | Get info about a skill publisher |

## Examples

Once connected, you can ask your AI agent:

- "Search for skills that help with Docker configuration"
- "What are the trending skills on SkillFlow?"
- "Get details about the credit-optimizer-v5 skill"
- "List all skill categories"
- "Show me skills by publisher rafsilva85"

## Development

```bash
git clone https://github.com/rafsilva85/skillflow-mcp-server.git
cd skillflow-mcp-server
npm install
npm run build
npm start
```

## How It Works

```
┌─────────────┐     MCP Protocol     ┌──────────────────┐     API     ┌──────────────┐
│  AI Agent   │ ◄──────────────────► │ SkillFlow MCP    │ ◄─────────► │  SkillFlow   │
│ (Claude,    │    stdio transport    │ Server           │             │  Marketplace │
│  Cursor...) │                       └──────────────────┘             └──────────────┘
└─────────────┘
```

The MCP server acts as a bridge between AI coding agents and the SkillFlow marketplace, translating natural language requests into structured skill data.

## License

MIT — [Rafael Silva](https://github.com/rafsilva85)

---

Built with the [MCP SDK](https://github.com/modelcontextprotocol/sdk) | Powered by [SkillFlow](https://skillflow.builders)
