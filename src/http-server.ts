#!/usr/bin/env node
/**
 * SkillFlow MCP Server — Streamable HTTP Transport
 *
 * HTTP version for remote access via Smithery.ai and cloud-based MCP clients.
 * Fetches real-time data from the SkillFlow backend API.
 *
 * Endpoint: /mcp (POST, GET, DELETE)
 * Health: /health
 */

import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "crypto";

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
    description: "Search for AI agent skills on SkillFlow marketplace by keyword, category, or tag.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (keyword, category name, or tag)" },
        category: { type: "string", description: "Filter by category slug" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_skill_details",
    description: "Get detailed information about a specific skill.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "The skill slug (e.g., 'blog-seo-writer')" },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_categories",
    description: "List all available skill categories on SkillFlow.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_trending_skills",
    description: "Get currently trending skills on SkillFlow marketplace.",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "Maximum results (default: 5)", default: 5 },
      },
    },
  },
  {
    name: "get_platform_stats",
    description: "Get overall SkillFlow platform statistics.",
    inputSchema: { type: "object" as const, properties: {} },
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
          if (cat) results = results.filter((s: any) => s.categoryId === cat.id);
        }

        if (results.length === 0) {
          return { content: [{ type: "text" as const, text: `No skills found for "${args?.query}". Try list_categories or get_trending_skills.\n\nBrowse: ${SKILLFLOW_BASE}/explore` }] };
        }

        const formatted = results.map((s: any) =>
          `**${s.name}** — ${s.tagline}\n  ${s.description}\n  Price: ${s.priceLabel} | Runs: ${s.totalRuns?.toLocaleString()} | Success: ${s.successRate}%\n  URL: ${SKILLFLOW_BASE}/skill/${s.slug}`
        ).join("\n\n");

        return { content: [{ type: "text" as const, text: `Found ${results.length} skill(s) for "${args?.query}":\n\n${formatted}\n\n---\n${SKILLFLOW_BASE}/explore` }] };
      }

      case "get_skill_details": {
        const slug = (args?.slug as string) || (args?.skill_id as string);
        const skill = await fetchSkillBySlug(slug);
        if (!skill) return { content: [{ type: "text" as const, text: `Skill "${slug}" not found. Use search_skills.\n\n${SKILLFLOW_BASE}/explore` }] };

        return {
          content: [{
            type: "text" as const,
            text: `# ${skill.name}\n> ${skill.tagline}\n\n` +
              `**Price:** ${skill.priceLabel} | **Runs:** ${skill.totalRuns?.toLocaleString()} | **Success:** ${skill.successRate}%\n` +
              `**Speed:** ${skill.avgSpeedMs}ms | **Rating:** ${skill.avgRating?.toFixed(1)}/5 (${skill.reviewCount} reviews)\n` +
              `**Creator:** ${skill.creator?.name} | **Tags:** ${skill.tags?.join(", ")}\n\n` +
              `## Description\n${skill.description}\n\n---\n${SKILLFLOW_BASE}/skill/${skill.slug}`,
          }],
        };
      }

      case "list_categories": {
        const categories = await fetchCategories();
        const formatted = categories.map((c: any) => `**${c.name}** (\`${c.slug}\`)\n  ${c.description}`).join("\n\n");
        return { content: [{ type: "text" as const, text: `# SkillFlow Categories\n\n${formatted}\n\n---\n${SKILLFLOW_BASE}/explore` }] };
      }

      case "get_trending_skills": {
        const limit = (args?.limit as number) || 5;
        const skills = await fetchSkills();
        const trending = skills.filter((s: any) => s.trending).sort((a: any, b: any) => b.totalRuns - a.totalRuns).slice(0, limit);
        const formatted = trending.map((s: any, i: number) =>
          `${i + 1}. **${s.name}** — ${s.tagline}\n   Runs: ${s.totalRuns?.toLocaleString()} | Success: ${s.successRate}% | Price: ${s.priceLabel}`
        ).join("\n\n");
        return { content: [{ type: "text" as const, text: `# Trending on SkillFlow\n\n${formatted}\n\n---\n${SKILLFLOW_BASE}/explore?sort=trending` }] };
      }

      case "get_platform_stats": {
        const stats = await fetchPlatformStats();
        return {
          content: [{
            type: "text" as const,
            text: `# SkillFlow Stats\n\n**Skills:** ${stats.totalSkills} | **Runs:** ${stats.totalRuns?.toLocaleString()} | **Creators:** ${stats.totalCreators} | **Revenue:** $${(stats.totalRevenueCents / 100).toFixed(2)}`,
          }],
        };
      }

      default:
        return { content: [{ type: "text" as const, text: `Unknown tool: ${name}` }] };
    }
  } catch (err: any) {
    return { content: [{ type: "text" as const, text: `Error: ${err.message}. Try again later.\n\n${SKILLFLOW_BASE}/explore` }] };
  }
}

// ─── Session Management ─────────────────────────────────────────────────────
const transports: Record<string, StreamableHTTPServerTransport> = {};

function isInitializeRequest(body: unknown): boolean {
  if (Array.isArray(body)) return body.some((item) => InitializeRequestSchema.safeParse(item).success);
  return InitializeRequestSchema.safeParse(body).success;
}

function createServer(): Server {
  const server = new Server(
    { name: "skillflow-mcp-server", version: "2.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handleToolCall(name, args);
  });

  return server;
}

// ─── Express App ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get("/health", async (_req: Request, res: Response) => {
  const stats = await fetchPlatformStats().catch(() => null);
  res.json({
    status: "ok",
    server: "skillflow-mcp-server",
    version: "2.0.0",
    transport: "streamable-http",
    data_source: "live",
    skills_count: stats?.totalSkills ?? "unavailable",
    tools: TOOLS.map((t) => t.name),
  });
});

app.post("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    if (sessionId && transports[sessionId]) {
      await transports[sessionId].handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() });
      const server = createServer();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);

      const newSessionId = transport.sessionId;
      if (newSessionId) {
        transports[newSessionId] = transport;
        console.log(`New session: ${newSessionId}`);
      }
      return;
    }

    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session or initialize request." }, id: null });
  } catch (error) {
    console.error("Error POST /mcp:", error);
    res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});

app.get("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Invalid or missing session ID." }, id: null });
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete("/mcp", async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports[sessionId]) {
    await transports[sessionId].close();
    delete transports[sessionId];
    res.status(200).json({ status: "session_terminated" });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`SkillFlow MCP Server (HTTP) on port ${PORT} — connected to live API`);
});

process.on("SIGINT", async () => {
  for (const [id, transport] of Object.entries(transports)) {
    await transport.close();
    delete transports[id];
  }
  process.exit(0);
});
