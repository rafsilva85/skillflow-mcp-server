#!/usr/bin/env node
/**
 * SkillFlow MCP Server — Stdio Transport
 *
 * A Model Context Protocol server that connects AI agents to the SkillFlow
 * marketplace via live API. Fetches real-time data from the SkillFlow backend.
 *
 * Tools:
 * - search_skills: Search for skills by keyword, category, or tag
 * - get_skill_details: Get detailed information about a specific skill
 * - list_categories: List all skill categories
 * - get_trending_skills: Get currently trending skills
 * - get_platform_stats: Get overall platform statistics
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const SKILLFLOW_API = "https://skillflow.builders/api/trpc";
const SKILLFLOW_BASE = "https://skillflow.builders";

// ─── In-Memory Cache ────────────────────────────────────────────────────────
const cache: Record<string, { data: any; expires: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  if (cache[key] && cache[key].expires > now) {
    return cache[key].data as T;
  }
  const data = await fetcher();
  cache[key] = { data, expires: now + CACHE_TTL };
  return data;
}

// ─── API Fetchers ───────────────────────────────────────────────────────────
async function fetchSkills(): Promise<any[]> {
  return fetchCached("skills", async () => {
    const res = await fetch(`${SKILLFLOW_API}/skills.list`);
    const json = await res.json();
    return json?.result?.data?.json?.skills ?? [];
  });
}

async function fetchSkillBySlug(slug: string): Promise<any | null> {
  return fetchCached(`skill:${slug}`, async () => {
    const input = encodeURIComponent(JSON.stringify({ json: { slug } }));
    const res = await fetch(`${SKILLFLOW_API}/skills.bySlug?input=${input}`);
    const json = await res.json();
    return json?.result?.data?.json ?? null;
  });
}

async function fetchCategories(): Promise<any[]> {
  return fetchCached("categories", async () => {
    const res = await fetch(`${SKILLFLOW_API}/categories.list`);
    const json = await res.json();
    return json?.result?.data?.json ?? [];
  });
}

async function fetchPlatformStats(): Promise<any> {
  return fetchCached("stats", async () => {
    const res = await fetch(`${SKILLFLOW_API}/platform.stats`);
    const json = await res.json();
    return json?.result?.data?.json ?? {};
  });
}

// ─── Tool Definitions ───────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_skills",
    description: "Search for AI agent skills on SkillFlow marketplace by keyword, category, or tag. Returns matching skills with performance metrics and pricing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (keyword, category name, or tag)" },
        category: { type: "string", description: "Filter by category slug (e.g., 'lead-gen', 'create-content', 'automate-ops')" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_skill_details",
    description: "Get detailed information about a specific skill including description, pricing, performance metrics, and creator info.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "The skill slug (e.g., 'blog-seo-writer', 'lead-qualifier-pro')" },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_categories",
    description: "List all available skill categories on SkillFlow with descriptions.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_trending_skills",
    description: "Get currently trending skills on SkillFlow marketplace, sorted by popularity.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Maximum number of results (default: 5)", default: 5 },
      },
    },
  },
  {
    name: "get_platform_stats",
    description: "Get overall SkillFlow platform statistics including total skills, runs, creators, and revenue.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];

// ─── Tool Handler ───────────────────────────────────────────────────────────
async function handleToolCall(name: string, args: Record<string, unknown> | undefined) {
  try {
    switch (name) {
      case "search_skills": {
        const q = ((args?.query as string) || "").toLowerCase();
        const catFilter = ((args?.category as string) || "").toLowerCase();
        const skills = await fetchSkills();

        let results = skills.filter((s: any) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
          s.subcategory?.toLowerCase().includes(q)
        );

        if (catFilter) {
          const categories = await fetchCategories();
          const cat = categories.find((c: any) => c.slug === catFilter || c.name.toLowerCase().includes(catFilter));
          if (cat) {
            results = results.filter((s: any) => s.categoryId === cat.id);
          }
        }

        if (results.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No skills found for "${args?.query}". Try browsing categories with list_categories or check trending skills.\n\nBrowse all: ${SKILLFLOW_BASE}/explore`,
            }],
          };
        }

        const formatted = results.map((s: any) =>
          `**${s.name}** — ${s.tagline}\n` +
          `  ${s.description}\n` +
          `  Price: ${s.priceLabel} | Runs: ${s.totalRuns.toLocaleString()} | Success: ${s.successRate}%\n` +
          `  Tags: ${s.tags?.join(", ")}\n` +
          `  URL: ${SKILLFLOW_BASE}/skill/${s.slug}`
        ).join("\n\n");

        return {
          content: [{
            type: "text" as const,
            text: `Found ${results.length} skill(s) matching "${args?.query}":\n\n${formatted}\n\n---\nBrowse more at: ${SKILLFLOW_BASE}/explore`,
          }],
        };
      }

      case "get_skill_details": {
        const slug = (args?.slug as string) || (args?.skill_id as string);
        const skill = await fetchSkillBySlug(slug);

        if (!skill) {
          return {
            content: [{
              type: "text" as const,
              text: `Skill "${slug}" not found. Use search_skills to find available skills.\n\nBrowse all: ${SKILLFLOW_BASE}/explore`,
            }],
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `# ${skill.name}\n\n` +
              `> ${skill.tagline}\n\n` +
              `**Price:** ${skill.priceLabel}\n` +
              `**Total Runs:** ${skill.totalRuns?.toLocaleString()}\n` +
              `**Success Rate:** ${skill.successRate}%\n` +
              `**Avg Speed:** ${skill.avgSpeedMs}ms\n` +
              `**Rating:** ${skill.avgRating?.toFixed(1)}/5 (${skill.reviewCount} reviews)\n` +
              `**Likes:** ${skill.likeCount}\n` +
              `**Creator:** ${skill.creator?.name}\n` +
              `**Tags:** ${skill.tags?.join(", ")}\n\n` +
              `## Description\n${skill.description}\n\n` +
              `---\nMarketplace: ${SKILLFLOW_BASE}/skill/${skill.slug}`,
          }],
        };
      }

      case "list_categories": {
        const categories = await fetchCategories();
        const formatted = categories.map((c: any) =>
          `**${c.name}** (\`${c.slug}\`)\n  ${c.description}`
        ).join("\n\n");

        return {
          content: [{
            type: "text" as const,
            text: `# SkillFlow Categories\n\n${formatted}\n\n---\nBrowse all: ${SKILLFLOW_BASE}/explore`,
          }],
        };
      }

      case "get_trending_skills": {
        const limit = (args?.limit as number) || 5;
        const skills = await fetchSkills();
        const trending = skills
          .filter((s: any) => s.trending)
          .sort((a: any, b: any) => b.totalRuns - a.totalRuns)
          .slice(0, limit);

        const formatted = trending.map((s: any, i: number) =>
          `${i + 1}. **${s.name}** — ${s.tagline}\n` +
          `   Runs: ${s.totalRuns?.toLocaleString()} | Success: ${s.successRate}% | Price: ${s.priceLabel}\n` +
          `   URL: ${SKILLFLOW_BASE}/skill/${s.slug}`
        ).join("\n\n");

        return {
          content: [{
            type: "text" as const,
            text: `# Trending Skills on SkillFlow\n\n${formatted}\n\n---\nSee all: ${SKILLFLOW_BASE}/explore?sort=trending`,
          }],
        };
      }

      case "get_platform_stats": {
        const stats = await fetchPlatformStats();
        return {
          content: [{
            type: "text" as const,
            text: `# SkillFlow Platform Stats\n\n` +
              `**Total Skills:** ${stats.totalSkills}\n` +
              `**Total Runs:** ${stats.totalRuns?.toLocaleString()}\n` +
              `**Total Creators:** ${stats.totalCreators}\n` +
              `**Total Revenue:** $${(stats.totalRevenueCents / 100).toFixed(2)}\n\n` +
              `---\nVisit: ${SKILLFLOW_BASE}`,
          }],
        };
      }

      default:
        return {
          content: [{
            type: "text" as const,
            text: `Unknown tool: ${name}. Available tools: search_skills, get_skill_details, list_categories, get_trending_skills, get_platform_stats`,
          }],
        };
    }
  } catch (err: any) {
    return {
      content: [{
        type: "text" as const,
        text: `Error fetching data from SkillFlow API: ${err.message}. Please try again later.\n\nBrowse manually: ${SKILLFLOW_BASE}/explore`,
      }],
    };
  }
}

// ─── Server Setup ───────────────────────────────────────────────────────────
const server = new Server(
  { name: "skillflow-mcp-server", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args);
});

// ─── Start ──────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SkillFlow MCP Server (stdio) running — connected to live API");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
