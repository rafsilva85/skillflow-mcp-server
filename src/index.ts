#!/usr/bin/env node

/**
 * SkillFlow MCP Server
 * 
 * A Model Context Protocol server that allows AI agents to search,
 * discover, and get details about AI skills from the SkillFlow marketplace.
 * 
 * Tools:
 * - search_skills: Search for skills by keyword
 * - get_skill_details: Get detailed information about a specific skill
 * - list_categories: List all skill categories
 * - get_trending_skills: Get currently trending skills
 * - get_publisher_info: Get information about a skill publisher
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SKILLFLOW_BASE_URL = "https://skillflow.builders";

// Skill catalog (embedded for MVP - in production this would query the SkillFlow API)
const SKILL_CATALOG = [
  {
    id: "credit-optimizer-v5",
    name: "Credit Optimizer v5",
    description: "Optimize Manus AI credit usage — save 30-75% without quality loss. Applies intelligent model routing, smart testing, section-by-section processing, and context hygiene.",
    category: "Productivity",
    publisher: "rafsilva85",
    trust_score: 95,
    tags: ["manus", "optimization", "credits", "cost-saving"],
    url: "https://skillflow.builders/skill/credit-optimizer-v5",
    github: "https://github.com/rafsilva85/credit-optimizer-v5",
    install: "curl -o SKILL.md https://raw.githubusercontent.com/rafsilva85/credit-optimizer-v5/main/SKILL.md",
    platforms: ["Manus AI", "Claude Code", "Cursor"],
    trending: true
  },
  {
    id: "fast-navigation",
    name: "Fast Navigation",
    description: "Accelerate web navigation in Manus sandbox by 30-2000x. Replaces slow browser tool calls with ultra-fast programmatic toolkit using httpx, selectolax, async, and caching.",
    category: "Development",
    publisher: "rafsilva85",
    trust_score: 92,
    tags: ["web", "scraping", "performance", "navigation"],
    url: "https://skillflow.builders/skill/fast-navigation",
    github: "https://github.com/rafsilva85/fast-navigation",
    install: "curl -o SKILL.md https://raw.githubusercontent.com/rafsilva85/fast-navigation/main/SKILL.md",
    platforms: ["Manus AI"],
    trending: true
  },
  {
    id: "skill-creator",
    name: "Skill Creator",
    description: "Guide for creating or updating skills that extend AI agents via specialized knowledge, workflows, or tool integrations. Follows best practices for SKILL.md format.",
    category: "Development",
    publisher: "rafsilva85",
    trust_score: 90,
    tags: ["skills", "creation", "development", "meta"],
    url: "https://skillflow.builders/skill/skill-creator",
    github: "https://github.com/rafsilva85/skill-creator",
    install: "curl -o SKILL.md https://raw.githubusercontent.com/rafsilva85/skill-creator/main/SKILL.md",
    platforms: ["Manus AI", "Claude Code", "Cursor", "Copilot"],
    trending: false
  },
  {
    id: "skill-finder",
    name: "Skill Finder",
    description: "Automatically find, evaluate, and install the best AI agent skills for any prompt. Searches 500K+ skills across GitHub, agentskill.sh, LobeHub, and local cache.",
    category: "Productivity",
    publisher: "rafsilva85",
    trust_score: 93,
    tags: ["search", "discovery", "skills", "automation"],
    url: "https://skillflow.builders/skill/skill-finder",
    github: "https://github.com/rafsilva85/skill-finder",
    install: "curl -o SKILL.md https://raw.githubusercontent.com/rafsilva85/skill-finder/main/SKILL.md",
    platforms: ["Manus AI"],
    trending: true
  },
  {
    id: "conexao-remota",
    name: "Remote Connection Manager",
    description: "Secure remote access to devices via SSH, Tailscale, and API integrations. Manages credentials, TOTP, OAuth tokens, and multi-device orchestration.",
    category: "DevOps",
    publisher: "rafsilva85",
    trust_score: 88,
    tags: ["ssh", "remote", "devops", "automation"],
    url: "https://skillflow.builders/skill/conexao-remota",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Manus AI"],
    trending: false
  },
  {
    id: "typescript-strict",
    name: "TypeScript Strict Mode",
    description: "Enforce strict TypeScript patterns in AI-generated code. Includes type safety rules, best practices, and common pitfall avoidance.",
    category: "Development",
    publisher: "community",
    trust_score: 85,
    tags: ["typescript", "coding", "best-practices"],
    url: "https://skillflow.builders/skill/typescript-strict",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Claude Code", "Cursor", "Copilot"],
    trending: false
  },
  {
    id: "seo-optimizer",
    name: "SEO Optimizer",
    description: "On-page SEO optimization for web projects. Analyzes meta tags, headings, content structure, and generates recommendations.",
    category: "Marketing",
    publisher: "community",
    trust_score: 82,
    tags: ["seo", "marketing", "web", "optimization"],
    url: "https://skillflow.builders/skill/seo-optimizer",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Manus AI", "Claude Code"],
    trending: false
  },
  {
    id: "docker-compose-gen",
    name: "Docker Compose Generator",
    description: "Generate and optimize Docker Compose configurations for any stack. Supports multi-service setups, networking, volumes, and health checks.",
    category: "DevOps",
    publisher: "community",
    trust_score: 87,
    tags: ["docker", "devops", "infrastructure", "containers"],
    url: "https://skillflow.builders/skill/docker-compose-gen",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Claude Code", "Cursor", "Copilot"],
    trending: false
  },
  {
    id: "data-viz-expert",
    name: "Data Visualization Expert",
    description: "Create publication-quality data visualizations with matplotlib, seaborn, plotly, and D3.js. Handles CJK fonts, accessibility, and responsive design.",
    category: "Data & Analytics",
    publisher: "community",
    trust_score: 84,
    tags: ["data", "visualization", "charts", "analytics"],
    url: "https://skillflow.builders/skill/data-viz-expert",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Manus AI", "Claude Code"],
    trending: false
  },
  {
    id: "security-auditor",
    name: "Security Auditor",
    description: "OWASP-based security auditing for code. Scans for XSS, SQL injection, CSRF, and other vulnerabilities with actionable fix recommendations.",
    category: "Security",
    publisher: "community",
    trust_score: 91,
    tags: ["security", "owasp", "audit", "vulnerabilities"],
    url: "https://skillflow.builders/skill/security-auditor",
    github: "",
    install: "Available on SkillFlow marketplace",
    platforms: ["Claude Code", "Cursor", "Copilot"],
    trending: true
  }
];

const CATEGORIES = [
  { name: "Development", count: 3, description: "Skills for coding, frameworks, and software development" },
  { name: "Productivity", count: 2, description: "Skills for workflow optimization and automation" },
  { name: "DevOps", count: 2, description: "Skills for infrastructure, deployment, and operations" },
  { name: "Data & Analytics", count: 1, description: "Skills for data processing, analysis, and visualization" },
  { name: "Marketing", count: 1, description: "Skills for SEO, content, and growth" },
  { name: "Security", count: 1, description: "Skills for security auditing and compliance" },
  { name: "Content & Writing", count: 0, description: "Skills for technical writing and documentation" },
  { name: "Design & UI/UX", count: 0, description: "Skills for design systems and UI generation" },
  { name: "Finance & Business", count: 0, description: "Skills for financial operations and business logic" },
];

const server = new Server(
  { name: "skillflow-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_skills",
      description: "Search for AI agent skills on SkillFlow marketplace by keyword, category, or tag. Returns matching skills with trust scores and install instructions.",
      inputSchema: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query (keyword, category name, or tag)" },
          category: { type: "string", description: "Filter by category (e.g., 'Development', 'Productivity', 'DevOps')" },
          min_trust_score: { type: "number", description: "Minimum trust score (0-100)", default: 0 },
        },
        required: ["query"],
      },
    },
    {
      name: "get_skill_details",
      description: "Get detailed information about a specific skill including description, install instructions, trust score, and compatible platforms.",
      inputSchema: {
        type: "object" as const,
        properties: {
          skill_id: { type: "string", description: "The skill ID (e.g., 'credit-optimizer-v5')" },
        },
        required: ["skill_id"],
      },
    },
    {
      name: "list_categories",
      description: "List all available skill categories on SkillFlow with descriptions and skill counts.",
      inputSchema: {
        type: "object" as const,
        properties: {},
      },
    },
    {
      name: "get_trending_skills",
      description: "Get currently trending skills on SkillFlow marketplace, sorted by popularity and trust score.",
      inputSchema: {
        type: "object" as const,
        properties: {
          limit: { type: "number", description: "Maximum number of results (default: 5)", default: 5 },
        },
      },
    },
    {
      name: "get_publisher_info",
      description: "Get information about a skill publisher including their published skills and verification status.",
      inputSchema: {
        type: "object" as const,
        properties: {
          publisher_id: { type: "string", description: "Publisher username (e.g., 'rafsilva85')" },
        },
        required: ["publisher_id"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_skills": {
      const query = (args?.query as string || "").toLowerCase();
      const category = (args?.category as string || "").toLowerCase();
      const minScore = (args?.min_trust_score as number) || 0;

      const results = SKILL_CATALOG.filter((skill) => {
        const matchesQuery =
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some((t) => t.includes(query));
        const matchesCategory = !category || skill.category.toLowerCase() === category;
        const matchesScore = skill.trust_score >= minScore;
        return matchesQuery && matchesCategory && matchesScore;
      });

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: `No skills found for "${args?.query}". Try browsing categories with list_categories or check trending skills with get_trending_skills.\n\nBrowse all skills at: ${SKILLFLOW_BASE_URL}/explore`,
          }],
        };
      }

      const formatted = results.map((s) =>
        `**${s.name}** (Trust: ${s.trust_score}/100)\n` +
        `  ${s.description}\n` +
        `  Category: ${s.category} | Publisher: ${s.publisher}\n` +
        `  Platforms: ${s.platforms.join(", ")}\n` +
        `  Install: \`${s.install}\`\n` +
        `  URL: ${s.url}`
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `Found ${results.length} skill(s) matching "${args?.query}":\n\n${formatted}\n\n---\nBrowse more at: ${SKILLFLOW_BASE_URL}/explore`,
        }],
      };
    }

    case "get_skill_details": {
      const skillId = args?.skill_id as string;
      const skill = SKILL_CATALOG.find((s) => s.id === skillId);

      if (!skill) {
        return {
          content: [{
            type: "text",
            text: `Skill "${skillId}" not found. Use search_skills to find available skills.\n\nBrowse all: ${SKILLFLOW_BASE_URL}/explore`,
          }],
        };
      }

      return {
        content: [{
          type: "text",
          text: `# ${skill.name}\n\n` +
            `**Trust Score:** ${skill.trust_score}/100\n` +
            `**Category:** ${skill.category}\n` +
            `**Publisher:** ${skill.publisher}\n` +
            `**Platforms:** ${skill.platforms.join(", ")}\n` +
            `**Tags:** ${skill.tags.join(", ")}\n\n` +
            `## Description\n${skill.description}\n\n` +
            `## Installation\n\`\`\`bash\n${skill.install}\n\`\`\`\n\n` +
            `## Links\n- Marketplace: ${skill.url}\n` +
            (skill.github ? `- GitHub: ${skill.github}\n` : "") +
            `\n---\nPowered by [SkillFlow](${SKILLFLOW_BASE_URL})`,
        }],
      };
    }

    case "list_categories": {
      const formatted = CATEGORIES.map((c) =>
        `**${c.name}** (${c.count} skills)\n  ${c.description}`
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `# SkillFlow Categories\n\n${formatted}\n\n---\nBrowse all: ${SKILLFLOW_BASE_URL}/explore`,
        }],
      };
    }

    case "get_trending_skills": {
      const limit = (args?.limit as number) || 5;
      const trending = SKILL_CATALOG
        .filter((s) => s.trending)
        .sort((a, b) => b.trust_score - a.trust_score)
        .slice(0, limit);

      const formatted = trending.map((s, i) =>
        `${i + 1}. **${s.name}** (Trust: ${s.trust_score}/100)\n` +
        `   ${s.description}\n` +
        `   Install: \`${s.install}\``
      ).join("\n\n");

      return {
        content: [{
          type: "text",
          text: `# Trending Skills on SkillFlow\n\n${formatted}\n\n---\nSee all trending: ${SKILLFLOW_BASE_URL}/explore?sort=trending`,
        }],
      };
    }

    case "get_publisher_info": {
      const publisherId = (args?.publisher_id as string || "").toLowerCase();
      const publisherSkills = SKILL_CATALOG.filter(
        (s) => s.publisher.toLowerCase() === publisherId
      );

      if (publisherSkills.length === 0) {
        return {
          content: [{
            type: "text",
            text: `Publisher "${args?.publisher_id}" not found or has no published skills.\n\nBrowse publishers: ${SKILLFLOW_BASE_URL}/publishers`,
          }],
        };
      }

      const avgTrust = Math.round(
        publisherSkills.reduce((sum, s) => sum + s.trust_score, 0) / publisherSkills.length
      );

      const skillList = publisherSkills.map((s) =>
        `- **${s.name}** (Trust: ${s.trust_score}/100) — ${s.category}`
      ).join("\n");

      return {
        content: [{
          type: "text",
          text: `# Publisher: ${args?.publisher_id}\n\n` +
            `**Verified:** Yes ✓\n` +
            `**Skills Published:** ${publisherSkills.length}\n` +
            `**Average Trust Score:** ${avgTrust}/100\n\n` +
            `## Published Skills\n${skillList}\n\n` +
            `---\nProfile: ${SKILLFLOW_BASE_URL}/publisher/${args?.publisher_id}`,
        }],
      };
    }

    default:
      return {
        content: [{
          type: "text",
          text: `Unknown tool: ${name}. Available tools: search_skills, get_skill_details, list_categories, get_trending_skills, get_publisher_info`,
        }],
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SkillFlow MCP Server running on stdio");
}

main().catch(console.error);
