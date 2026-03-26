import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";

// Skills database
const SKILLS_DATABASE = [
  { id: "credit-optimizer-v5", name: "Credit Optimizer v5", description: "Automatic Manus credit optimizer - ZERO quality loss. Typical savings of 30-75%.", category: "Productivity", tags: ["manus","optimization","credits","cost-saving"], trust_score: 95, platforms: ["Manus"], install: "Copy to ~/skills/credit-optimizer/", publisher: "rafsilva85", trending: true, downloads: 1250 },
  { id: "fast-navigation", name: "Fast Navigation", description: "Accelerate web navigation in Manus sandbox by 30-2000x using programmatic toolkit.", category: "Development", tags: ["web","scraping","performance","httpx"], trust_score: 92, platforms: ["Manus"], install: "Copy to ~/skills/fast-navigation/", publisher: "rafsilva85", trending: true, downloads: 980 },
  { id: "skill-creator", name: "Skill Creator", description: "Guide for creating or updating skills that extend Manus via specialized knowledge.", category: "Development", tags: ["skills","creation","manus","meta"], trust_score: 90, platforms: ["Manus"], install: "Copy to ~/skills/skill-creator/", publisher: "rafsilva85", trending: false, downloads: 750 },
  { id: "conexao-remota", name: "Conexão Remota PCs", description: "Remote access to devices with complete credential ecosystem and automation.", category: "DevOps", tags: ["remote","ssh","automation","devices"], trust_score: 88, platforms: ["Manus"], install: "Copy to ~/skills/conexao-remota-pcs/", publisher: "rafsilva85", trending: false, downloads: 620 },
  { id: "skill-finder", name: "Skill Finder", description: "Automatically find, evaluate, and install the best AI agent skills for any prompt.", category: "Productivity", tags: ["search","discovery","skills","marketplace"], trust_score: 91, platforms: ["Manus"], install: "Copy to ~/skills/skill-finder/", publisher: "rafsilva85", trending: true, downloads: 1100 },
  { id: "github-pr-manager", name: "GitHub PR Manager", description: "Automate GitHub PR creation, review, and management across multiple repositories.", category: "Development", tags: ["github","pr","automation","git"], trust_score: 87, platforms: ["Claude Desktop","Cursor","Manus"], install: "npx @skillflow/github-pr-manager", publisher: "community", trending: false, downloads: 450 },
  { id: "seo-analyzer", name: "SEO Analyzer", description: "Comprehensive SEO analysis tool for websites with actionable recommendations.", category: "Marketing", tags: ["seo","marketing","analysis","web"], trust_score: 85, platforms: ["Claude Desktop","Manus"], install: "npx @skillflow/seo-analyzer", publisher: "community", trending: false, downloads: 380 },
  { id: "data-pipeline", name: "Data Pipeline Builder", description: "Build and manage data pipelines with support for multiple data sources.", category: "Data", tags: ["data","etl","pipeline","automation"], trust_score: 86, platforms: ["Claude Desktop","Cursor","n8n"], install: "npx @skillflow/data-pipeline", publisher: "community", trending: true, downloads: 520 },
];

const CATEGORIES = [
  { name: "Development", description: "Tools for software development and coding", count: 15 },
  { name: "Productivity", description: "Tools to boost productivity and workflow", count: 12 },
  { name: "DevOps", description: "Infrastructure, deployment, and operations tools", count: 8 },
  { name: "Data", description: "Data processing, analysis, and visualization", count: 6 },
  { name: "Marketing", description: "Marketing, SEO, and growth tools", count: 5 },
  { name: "Security", description: "Security scanning and vulnerability assessment", count: 4 },
  { name: "Design", description: "UI/UX design and prototyping tools", count: 3 },
  { name: "Communication", description: "Email, chat, and messaging integrations", count: 4 },
  { name: "Finance", description: "Financial analysis and accounting tools", count: 2 },
  { name: "Education", description: "Learning and training tools", count: 3 },
];

const TOOLS = [
  { name: "search_skills", description: "Search for AI agent skills on SkillFlow marketplace by keyword, category, or tag", inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, category: { type: "string", description: "Filter by category" }, min_trust_score: { type: "number", description: "Minimum trust score (0-100)" } }, required: ["query"] } },
  { name: "get_skill_details", description: "Get detailed information about a specific skill", inputSchema: { type: "object", properties: { skill_id: { type: "string", description: "The skill ID" } }, required: ["skill_id"] } },
  { name: "list_categories", description: "List all available skill categories on SkillFlow", inputSchema: { type: "object", properties: {} } },
  { name: "get_trending_skills", description: "Get currently trending skills on SkillFlow marketplace", inputSchema: { type: "object", properties: { limit: { type: "number", description: "Maximum results (default: 5)" } } } },
  { name: "get_publisher_info", description: "Get information about a skill publisher", inputSchema: { type: "object", properties: { publisher_id: { type: "string", description: "Publisher username" } }, required: ["publisher_id"] } },
];

function handleToolCall(name: string, args: any): any {
  switch (name) {
    case "search_skills": {
      const q = (args.query || "").toLowerCase();
      let results = SKILLS_DATABASE.filter(s =>
        s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) ||
        s.tags.some(t => t.includes(q)) || s.category.toLowerCase().includes(q)
      );
      if (args.category) results = results.filter(s => s.category.toLowerCase() === args.category.toLowerCase());
      if (args.min_trust_score) results = results.filter(s => s.trust_score >= args.min_trust_score);
      return { query: args.query, results_count: results.length, results: results.map(s => ({ id: s.id, name: s.name, description: s.description, category: s.category, trust_score: s.trust_score, platforms: s.platforms, install: s.install })) };
    }
    case "get_skill_details": {
      const skill = SKILLS_DATABASE.find(s => s.id === args.skill_id);
      if (!skill) return { error: "Skill not found", skill_id: args.skill_id };
      return { ...skill, marketplace_url: `https://skillflow.builders/skills/${skill.id}` };
    }
    case "list_categories":
      return { total_categories: CATEGORIES.length, categories: CATEGORIES };
    case "get_trending_skills": {
      const max = args.limit || 5;
      const trending = SKILLS_DATABASE.filter(s => s.trending).sort((a, b) => b.downloads - a.downloads).slice(0, max);
      return { trending_count: trending.length, skills: trending.map(s => ({ id: s.id, name: s.name, description: s.description, trust_score: s.trust_score, downloads: s.downloads })) };
    }
    case "get_publisher_info": {
      const skills = SKILLS_DATABASE.filter(s => s.publisher === args.publisher_id);
      return { publisher_id: args.publisher_id, verified: args.publisher_id === "rafsilva85", skills_count: skills.length, skills: skills.map(s => ({ id: s.id, name: s.name, trust_score: s.trust_score })), profile_url: `https://skillflow.builders/publishers/${args.publisher_id}` };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// Session store
const sessions = new Map<string, boolean>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  // Health check
  if (req.method === "GET") {
    res.status(200).json({ status: "ok", name: "skillflow-mcp", version: "1.1.0" });
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
          serverInfo: { name: "skillflow", version: "1.1.0" },
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
      const result = handleToolCall(toolName, toolArgs);
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
