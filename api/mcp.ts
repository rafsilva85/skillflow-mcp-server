import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

// ─── SkillFlow API Client ───────────────────────────────────────────────────
const SKILLFLOW_API = "https://skillflow.builders/api/trpc";
const SKILLFLOW_BASE = "https://skillflow.builders";

interface SkillSummary {
  id: number;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  priceType: string;
  priceValue: number;
  priceLabel: string;
  successRate: number;
  totalRuns: number;
  trending: boolean;
  subcategory: string;
  categoryId: number;
  creatorId: number;
}

interface SkillDetail extends SkillSummary {
  avgSpeedMs: number;
  avgRating: number;
  reviewCount: number;
  likeCount: number;
  creator: { id: number; name: string };
  creatorSkillCount: number;
  creatorTotalRuns: number;
  systemPrompt?: string;
  sampleOutput?: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
}

interface PlatformStats {
  totalSkills: number;
  totalRuns: number;
  totalCreators: number;
  totalRevenueCents: number;
}

// In-memory cache with TTL
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

async function fetchSkills(): Promise<SkillSummary[]> {
  return fetchCached("skills", async () => {
    const res = await fetch(`${SKILLFLOW_API}/skills.list`);
    const json = await res.json();
    return json?.result?.data?.json?.skills ?? [];
  });
}

async function fetchSkillBySlug(slug: string): Promise<SkillDetail | null> {
  return fetchCached(`skill:${slug}`, async () => {
    const input = encodeURIComponent(JSON.stringify({ json: { slug } }));
    const res = await fetch(`${SKILLFLOW_API}/skills.bySlug?input=${input}`);
    const json = await res.json();
    return json?.result?.data?.json ?? null;
  });
}

async function fetchCategories(): Promise<Category[]> {
  return fetchCached("categories", async () => {
    const res = await fetch(`${SKILLFLOW_API}/categories.list`);
    const json = await res.json();
    return json?.result?.data?.json ?? [];
  });
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  return fetchCached("stats", async () => {
    const res = await fetch(`${SKILLFLOW_API}/platform.stats`);
    const json = await res.json();
    return json?.result?.data?.json ?? { totalSkills: 0, totalRuns: 0, totalCreators: 0, totalRevenueCents: 0 };
  });
}

// ─── Tool Definitions ───────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "search_skills",
    description: "Search for AI agent skills on SkillFlow marketplace by keyword, category, or tag. Returns matching skills with trust metrics and pricing.",
    inputSchema: {
      type: "object",
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
      type: "object",
      properties: {
        slug: { type: "string", description: "The skill slug (e.g., 'blog-seo-writer', 'lead-qualifier-pro')" },
      },
      required: ["slug"],
    },
  },
  {
    name: "list_categories",
    description: "List all available skill categories on SkillFlow with descriptions.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_trending_skills",
    description: "Get currently trending skills on SkillFlow marketplace, sorted by popularity.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of results (default: 5)" },
      },
    },
  },
  {
    name: "get_platform_stats",
    description: "Get overall SkillFlow platform statistics including total skills, runs, creators, and revenue.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── Tool Handler ───────────────────────────────────────────────────────────
async function handleToolCall(name: string, args: any): Promise<any> {
  try {
    switch (name) {
      case "search_skills": {
        const q = (args.query || "").toLowerCase();
        const catFilter = (args.category || "").toLowerCase();
        const skills = await fetchSkills();

        let results = skills.filter((s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)) ||
          s.subcategory?.toLowerCase().includes(q)
        );

        if (catFilter) {
          const categories = await fetchCategories();
          const cat = categories.find((c) => c.slug === catFilter || c.name.toLowerCase().includes(catFilter));
          if (cat) {
            results = results.filter((s) => s.categoryId === cat.id);
          }
        }

        return {
          query: args.query,
          results_count: results.length,
          results: results.map((s) => ({
            slug: s.slug,
            name: s.name,
            tagline: s.tagline,
            description: s.description,
            tags: s.tags,
            price: s.priceLabel,
            total_runs: s.totalRuns,
            success_rate: s.successRate,
            trending: s.trending,
            url: `${SKILLFLOW_BASE}/skill/${s.slug}`,
          })),
        };
      }

      case "get_skill_details": {
        const slug = args.slug || args.skill_id;
        const skill = await fetchSkillBySlug(slug);
        if (!skill) return { error: "Skill not found", slug };

        return {
          slug: skill.slug,
          name: skill.name,
          tagline: skill.tagline,
          description: skill.description,
          tags: skill.tags,
          price_type: skill.priceType,
          price: skill.priceLabel,
          total_runs: skill.totalRuns,
          success_rate: skill.successRate,
          avg_speed_ms: skill.avgSpeedMs,
          avg_rating: skill.avgRating,
          review_count: skill.reviewCount,
          like_count: skill.likeCount,
          trending: skill.trending,
          creator: skill.creator?.name ?? "Unknown",
          creator_total_skills: skill.creatorSkillCount,
          creator_total_runs: skill.creatorTotalRuns,
          marketplace_url: `${SKILLFLOW_BASE}/skill/${skill.slug}`,
        };
      }

      case "list_categories": {
        const categories = await fetchCategories();
        return {
          total_categories: categories.length,
          categories: categories.map((c) => ({
            slug: c.slug,
            name: c.name,
            description: c.description,
          })),
        };
      }

      case "get_trending_skills": {
        const max = args.limit || 5;
        const skills = await fetchSkills();
        const trending = skills
          .filter((s) => s.trending)
          .sort((a, b) => b.totalRuns - a.totalRuns)
          .slice(0, max);

        return {
          trending_count: trending.length,
          skills: trending.map((s) => ({
            slug: s.slug,
            name: s.name,
            tagline: s.tagline,
            total_runs: s.totalRuns,
            success_rate: s.successRate,
            price: s.priceLabel,
            url: `${SKILLFLOW_BASE}/skill/${s.slug}`,
          })),
        };
      }

      case "get_platform_stats": {
        const stats = await fetchPlatformStats();
        return {
          total_skills: stats.totalSkills,
          total_runs: stats.totalRuns,
          total_creators: stats.totalCreators,
          total_revenue: `$${(stats.totalRevenueCents / 100).toFixed(2)}`,
        };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { error: `Failed to fetch data: ${err.message}` };
  }
}

// ─── Session Store ──────────────────────────────────────────────────────────
const sessions = new Map<string, boolean>();

// ─── Vercel Handler ─────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Health check
  if (req.method === "GET") {
    const stats = await fetchPlatformStats().catch(() => null);
    res.status(200).json({
      status: "ok",
      name: "skillflow-mcp",
      version: "2.0.0",
      data_source: "live",
      skills_count: stats?.totalSkills ?? "unavailable",
    });
    return;
  }

  // DELETE session
  if (req.method === "DELETE") {
    const sid = req.headers["mcp-session-id"] as string;
    if (sid) sessions.delete(sid);
    res.status(200).json({ jsonrpc: "2.0", result: {} });
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Handle MCP JSON-RPC
  const body = req.body;
  if (!body || !body.method) {
    res.status(400).json({ jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" } });
    return;
  }

  const { method, params, id } = body;

  switch (method) {
    case "initialize": {
      const sessionId = randomUUID();
      sessions.set(sessionId, true);
      res.setHeader("mcp-session-id", sessionId);
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2025-03-26",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "skillflow", version: "2.0.0" },
        },
      });
      return;
    }

    case "notifications/initialized": {
      res.status(202).end();
      return;
    }

    case "tools/list": {
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      });
      return;
    }

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const result = await handleToolCall(toolName, toolArgs);
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        },
      });
      return;
    }

    case "ping": {
      res.status(200).json({ jsonrpc: "2.0", id, result: {} });
      return;
    }

    default: {
      res.status(200).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
      return;
    }
  }
}
