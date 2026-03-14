import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StableCoinVerifier } from "./verifier/StableCoinVerifier.js";
import type { VerificationParams } from "./types/index.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ACTUS_URL = "http://34.203.247.32:8083/eventsBatch";

// ── Create MCP Server ─────────────────────────────────────────────
const server = new Server(
  { name: "generalRisk", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ══════════════════════════════════════════════════════════════════
// LIST TOOLS — Claude இதை கேக்கும்போது available tools return பண்ணும்
// ══════════════════════════════════════════════════════════════════
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "verify_portfolio",
        description:
          "Verify a stablecoin portfolio for risk compliance. Checks backing ratio, liquidity ratio, concentration risk, and asset quality against regulatory thresholds (EU MiCA or US GENIUS Act).",
        inputSchema: {
          type: "object",
          properties: {
            portfolio_json: {
              type: "string",
              description:
                "The portfolio as a JSON string. Must include a contracts array. Each contract needs: contractType, contractID, contractRole (RPA=asset RPL=liability), statusDate, notionalPrincipal, currency.",
            },
            backing_ratio_threshold: {
              type: "number",
              description: "Minimum backing ratio percentage (default: 100)",
              default: 100,
            },
            liquidity_ratio_threshold: {
              type: "number",
              description: "Minimum liquidity ratio percentage (default: 20)",
              default: 20,
            },
            concentration_limit: {
              type: "number",
              description: "Maximum concentration risk percentage (default: 40)",
              default: 40,
            },
            quality_threshold: {
              type: "number",
              description: "Minimum asset quality score 0-100 (default: 80)",
              default: 80,
            },
            actus_url: {
              type: "string",
              description: "ACTUS server URL. Leave empty to use default AWS server.",
            },
          },
          required: ["portfolio_json"],
        },
      },
      {
        name: "get_threshold_presets",
        description:
          "Get the regulatory threshold presets for EU MiCA or US GENIUS Act stablecoin compliance frameworks.",
        inputSchema: {
          type: "object",
          properties: {
            jurisdiction: {
              type: "string",
              enum: ["eu-mica", "us-genius", "custom"],
              description: "Regulatory jurisdiction to get thresholds for",
            },
          },
          required: ["jurisdiction"],
        },
      },
      {
        name: "list_sample_portfolios",
        description:
          "List all available sample portfolio and scenario files. Use returned filenames with load_sample_portfolio tool.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "load_sample_portfolio",
        description:
          "Load a sample portfolio or test scenario file from the config directory. Returns portfolio JSON ready to pass into verify_portfolio.",
        inputSchema: {
          type: "object",
          properties: {
            filename: {
              type: "string",
              description:
                "The portfolio filename e.g. 'portfolio-balanced-1M.json' or 'scenario-balanced-compliant-10m.json'",
            },
          },
          required: ["filename"],
        },
      },
    ],
  };
});

// ══════════════════════════════════════════════════════════════════
// CALL TOOL — Tool execute பண்ணும் logic
// ══════════════════════════════════════════════════════════════════
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // ── TOOL 1: verify_portfolio ────────────────────────────────────
  if (name === "verify_portfolio") {
    try {
      const portfolioJson = args?.portfolio_json as string;
      if (!portfolioJson) {
        return { content: [{ type: "text", text: "Error: portfolio_json is required" }], isError: true };
      }

      const portfolioData = JSON.parse(portfolioJson);

      const portfolioConfig = {
        portfolioMetadata: {
          portfolioId:
            portfolioData.portfolioId ||
            portfolioData.portfolioMetadata?.portfolioId ||
            "MCP_PORTFOLIO",
          totalNotional:
            portfolioData.totalNotional ||
            portfolioData.portfolioMetadata?.totalNotional ||
            0,
          currency:
            portfolioData.currency ||
            portfolioData.portfolioMetadata?.currency ||
            "USD",
        },
        contracts: portfolioData.contracts || [],
      };

      if (portfolioConfig.contracts.length === 0) {
        return {
          content: [{ type: "text", text: "Error: No contracts found. Please include a 'contracts' array." }],
          isError: true,
        };
      }

      const tempPath = path.join(os.tmpdir(), `mcp-portfolio-${Date.now()}.json`);
      fs.writeFileSync(tempPath, JSON.stringify(portfolioConfig, null, 2));

      const params: VerificationParams = {
        backingRatioThreshold: (args?.backing_ratio_threshold as number) ?? 100,
        liquidityRatioThreshold: (args?.liquidity_ratio_threshold as number) ?? 20,
        concentrationLimit: (args?.concentration_limit as number) ?? 40,
        qualityThreshold: (args?.quality_threshold as number) ?? 80,
        actusUrl: (args?.actus_url as string) || DEFAULT_ACTUS_URL,
        portfolioPath: tempPath,
      };

      const verifier = new StableCoinVerifier();
      const result = await verifier.verify(params);

      try { fs.unlinkSync(tempPath); } catch { /* ignore */ }

      const summary = {
        compliant: result.compliant,
        overall_status: result.summary.overallStatus,
        periods_analyzed: result.summary.periodsAnalyzed,
        metrics: {
          backing_ratio: {
            value: `${result.riskMetrics.averageBackingRatio.toFixed(2)}%`,
            threshold: `${params.backingRatioThreshold}%`,
            status: result.summary.backing.status,
          },
          liquidity_ratio: {
            value: `${result.riskMetrics.averageLiquidityRatio.toFixed(2)}%`,
            threshold: `${params.liquidityRatioThreshold}%`,
            status: result.summary.liquidity.status,
          },
          concentration_risk: {
            value: `${result.riskMetrics.maxConcentrationRisk.toFixed(2)}%`,
            limit: `${params.concentrationLimit}%`,
            status: result.summary.concentration.status,
          },
          asset_quality: {
            value: result.riskMetrics.averageAssetQuality.toFixed(2),
            threshold: params.qualityThreshold,
            status: result.summary.quality.status,
          },
        },
        failure_reasons: result.summary.failureReasons,
        timestamp: result.timestamp,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Verification failed: ${msg}` }],
        isError: true,
      };
    }
  }

  // ── TOOL 2: get_threshold_presets ───────────────────────────────
  if (name === "get_threshold_presets") {
    const jurisdiction = (args?.jurisdiction as string) || "custom";
    const presets: Record<string, object> = {
      "eu-mica": {
        backing_ratio: 100,
        liquidity_ratio: 30,
        concentration_limit: 60,
        asset_quality: 85,
        description: "EU Markets in Crypto-Assets (MiCA) regulation",
        notes: "Stricter liquidity requirement than US GENIUS Act",
      },
      "us-genius": {
        backing_ratio: 100,
        liquidity_ratio: 20,
        concentration_limit: 40,
        asset_quality: 80,
        description: "US GENIUS Act stablecoin framework",
        notes: "Default framework used in this system",
      },
      custom: {
        backing_ratio: 100,
        liquidity_ratio: 20,
        concentration_limit: 40,
        asset_quality: 80,
        description: "Default custom thresholds",
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(presets[jurisdiction] ?? presets["custom"], null, 2) }],
    };
  }

  // ── TOOL 3: list_sample_portfolios ──────────────────────────────
  if (name === "list_sample_portfolios") {
    try {
      const configPath = path.join(__dirname, "..", "config");
      const portfolioFiles = fs.existsSync(configPath)
        ? fs.readdirSync(configPath).filter((f) => f.startsWith("portfolio-") && f.endsWith(".json"))
        : [];
      const scenarioPath = path.join(configPath, "test-scenarios");
      const scenarioFiles = fs.existsSync(scenarioPath)
        ? fs.readdirSync(scenarioPath).filter((f) => f.endsWith(".json"))
        : [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            portfolios: portfolioFiles,
            test_scenarios: scenarioFiles,
            usage: "Pass any filename to load_sample_portfolio tool",
          }, null, 2),
        }],
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
  }

  // ── TOOL 4: load_sample_portfolio ───────────────────────────────
  if (name === "load_sample_portfolio") {
    try {
      const filename = args?.filename as string;
      if (!filename) {
        return { content: [{ type: "text", text: "Error: filename is required" }], isError: true };
      }
      const configPath = path.join(__dirname, "..", "config");
      let filePath = path.join(configPath, filename);
      if (!fs.existsSync(filePath)) {
        filePath = path.join(configPath, "test-scenarios", filename);
      }
      if (!fs.existsSync(filePath)) {
        return {
          content: [{ type: "text", text: `File not found: ${filename}. Use list_sample_portfolios to see available files.` }],
          isError: true,
        };
      }
      const content = fs.readFileSync(filePath, "utf-8");
      return { content: [{ type: "text", text: content }] };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
    }
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// ══════════════════════════════════════════════════════════════════
// Start server
// ══════════════════════════════════════════════════════════════════
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("generalRisk MCP Server started successfully");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});