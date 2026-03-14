#!/usr/bin/env node
/**
 * StableRisk API Server
 * Express server that wraps the verification logic
 */

import express from 'express';
import cors from 'cors';
import { StableCoinVerifier } from './verifier/StableCoinVerifier.js';
import type { VerificationParams, PortfolioConfig } from './types/index.js';
import { runStimulation, ENVIRONMENTS } from './api/SimulationRunner.js';
import type { EnvironmentConfig } from './api/SimulationRunner.js';
import simulationRoutes from './routes/simulation.routes.js';
import defiSimulationRoutes from './routes/defi-simulation.routes.js';

const app = express();
const PORT = 4000;
const DEFAULT_ACTUS_URL = 'http://34.203.247.32:8083/eventsBatch';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Register config-based simulation routes
app.use('/api', simulationRoutes);
// Register DeFi liquidation simulation routes
app.use('/api', defiSimulationRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    // Check ACTUS connectivity with a proper POST request
    let actusConnected = false;
    let actusError = '';
    try {
      const axios = await import('axios');
      // Test with a minimal valid ACTUS request
      const testPayload = {
        contracts: [
          {
            contractType: "PAM",
            contractID: "test_health_check",
            contractRole: "RPA",
            contractDealDate: "2024-01-01T00:00:00",
            initialExchangeDate: "2024-01-01T00:00:00",
            statusDate: "2024-01-01T00:00:00",
            notionalPrincipal: 1000,
            maturityDate: "2024-01-02T00:00:00",
            nominalInterestRate: 0.0,
            currency: "USD",
            dayCountConvention: "A365"
          }
        ],
        riskFactors: []
      };
      
      const response = await axios.default.post(DEFAULT_ACTUS_URL, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      // Check if we got a valid response
      if (response.status === 200 && response.data) {
        actusConnected = true;
      }
    } catch (error: any) {
      actusConnected = false;
      actusError = error.message;
      console.error('ACTUS health check failed:', error.message);
    }

    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      actusConnected,
      actusUrl: DEFAULT_ACTUS_URL,
      ...(actusError && { actusError })
    });
  } catch (error: any) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Main verification endpoint
app.post('/api/verify', async (req, res) => {
  try {
    const { portfolio, thresholds, actusUrl } = req.body;

    if (!portfolio || !thresholds) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: portfolio, thresholds'
      });
    }

    const portfolioConfig: PortfolioConfig = {
      portfolioMetadata: {
        portfolioId: portfolio.id || 'PORTFOLIO_001',
        totalNotional: portfolio.totalNotional || 0,
        currency: 'USD',
        description: portfolio.description || ''
      },
      contracts: portfolio.contracts || []
    };

    // Save portfolio temporarily
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tempPath = path.join(os.tmpdir(), 'temp-portfolio.json');
    fs.writeFileSync(tempPath, JSON.stringify(portfolioConfig, null, 2));

    const params: VerificationParams = {
      backingRatioThreshold: thresholds.backingRatio || 100,
      liquidityRatioThreshold: thresholds.liquidityRatio || 20,
      concentrationLimit: thresholds.concentrationLimit || 40,
      qualityThreshold: thresholds.assetQuality || 80,
      actusUrl: actusUrl || DEFAULT_ACTUS_URL,
      portfolioPath: tempPath
    };

    console.error('\n🎯 Verification Request');
    console.error('Portfolio:', portfolioConfig.portfolioMetadata.portfolioId);
    console.error('Contracts:', portfolioConfig.contracts.length);
    console.error('Thresholds:', params);

    const verifier = new StableCoinVerifier();
    const result = await verifier.verify(params);

    // Clean up temp file
    try {
      fs.unlinkSync(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    return res.json({
      success: result.success,
      compliant: result.compliant,
      riskMetrics: result.riskMetrics,
      summary: result.summary,
      timestamp: result.timestamp,
      jurisdiction: req.body.jurisdiction || 'custom'
    });

  } catch (error: any) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get preset portfolios
app.get('/api/portfolios', async (_req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const configPath = path.join(__dirname, '..', 'config');
    
    if (!fs.existsSync(configPath)) {
      return res.json([]);
    }

    const files = fs.readdirSync(configPath)
      .filter(f => f.startsWith('portfolio-') && f.endsWith('.json'))
      .sort();

    const portfolios = files.map(filename => {
      const content = fs.readFileSync(path.join(configPath, filename), 'utf8');
      const portfolio = JSON.parse(content);
      return {
        id: filename.replace('.json', ''),
        filename,
        portfolio
      };
    });

    return res.json(portfolios);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get test scenarios
app.get('/api/scenarios', async (_req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const scenariosPath = path.join(__dirname, '..', 'config', 'test-scenarios');
    
    if (!fs.existsSync(scenariosPath)) {
      return res.json([]);
    }

    const files = fs.readdirSync(scenariosPath)
      .filter(f => f.endsWith('.json'))
      .sort();

    const scenarios = files.map(filename => {
      const content = fs.readFileSync(path.join(scenariosPath, filename), 'utf8');
      const portfolio = JSON.parse(content);
      return {
        id: filename.replace('.json', ''),
        filename,
        portfolio
      };
    });

    return res.json(scenarios);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Get threshold presets
app.get('/api/thresholds/:jurisdiction', (req, res) => {
  const jurisdiction = req.params.jurisdiction.toLowerCase();

  const presets: Record<string, any> = {
    'eu-mica': {
      backingRatio: 100,
      liquidityRatio: 30,
      concentrationLimit: 60,
      assetQuality: 85
    },
    'us-genius': {
      backingRatio: 100,
      liquidityRatio: 20,
      concentrationLimit: 40,
      assetQuality: 80
    },
    'custom': {
      backingRatio: 100,
      liquidityRatio: 20,
      concentrationLimit: 40,
      assetQuality: 80
    }
  };

  const preset = presets[jurisdiction] || presets['custom'];
  return res.json(preset);
});

// ============================================================
// STIMULATION ENDPOINTS (ACTUS Risk Service 8082 + Server 8083)
// ============================================================

// List available environments
app.get('/api/environments', (_req, res) => {
  const envList = Object.entries(ENVIRONMENTS).map(([name, config]) => ({
    name,
    riskServiceUrl: config.riskServiceBase,
    actusServerUrl: config.actusServerBase,
  }));
  return res.json(envList);
});

// List available stimulation files
app.get('/api/stimulations', async (_req, res) => {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const stimulationPath = path.join(__dirname, '..', 'config', 'stimulation');

    if (!fs.existsSync(stimulationPath)) {
      return res.json([]);
    }

    // Walk subdirectories (e.g. stablecoin-1/)
    const results: any[] = [];
    const subdirs = fs.readdirSync(stimulationPath, { withFileTypes: true });

    for (const subdir of subdirs) {
      if (!subdir.isDirectory()) continue;
      const subdirPath = path.join(stimulationPath, subdir.name);
      const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json'));

      for (const filename of files) {
        try {
          const content = fs.readFileSync(path.join(subdirPath, filename), 'utf8');
          const collection = JSON.parse(content);
          results.push({
            id: `${subdir.name}/${filename.replace('.json', '')}`,
            category: subdir.name,
            filename,
            name: collection.info?.name || filename,
            description: collection.info?.description || '',
            stepsCount: collection.item?.length || 0,
          });
        } catch {
          // Skip malformed files
        }
      }
    }

    return res.json(results);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Run a stimulation: orchestrate all Postman steps against chosen environment
// Accepts EITHER:
//   { stimulationId: "stablecoin-1/...", environment: "localhost" }  → loads from disk
//   { collectionJson: { info, item: [...] }, environment: "localhost" } → uses directly
//   Both can be combined with customUrls for custom environments.
app.post('/api/stimulation/run', async (req, res) => {
  try {
    const { stimulationId, environment, customUrls, collectionJson: rawCollection } = req.body;

    // ── Validate input ────────────────────────────────────────────
    if (!stimulationId && !rawCollection) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: provide either stimulationId (e.g. "stablecoin-1/StableCoin-BackingRatio-RedemptionPressure-30d") or collectionJson (raw Postman collection object)',
      });
    }

    // ── Resolve environment ───────────────────────────────────────
    let envConfig: EnvironmentConfig;
    let envName: string;

    if (customUrls && customUrls.riskServiceBase && customUrls.actusServerBase) {
      envConfig = {
        riskServiceBase: customUrls.riskServiceBase,
        actusServerBase: customUrls.actusServerBase,
      };
      envName = 'custom';
    } else {
      envName = environment || 'localhost';
      envConfig = ENVIRONMENTS[envName];
      if (!envConfig) {
        return res.status(400).json({
          success: false,
          error: `Unknown environment: "${envName}". Available: ${Object.keys(ENVIRONMENTS).join(', ')}`,
        });
      }
    }

    // ── Resolve the collection JSON ───────────────────────────────
    let collectionJson: any;
    let sourceLabel: string;

    if (rawCollection && rawCollection.item && Array.isArray(rawCollection.item)) {
      // Path A: Raw collection provided directly (uploaded from UI)
      collectionJson = rawCollection;
      sourceLabel = rawCollection.info?.name || 'uploaded-collection';
      console.error(`\n🎯 Stimulation Request (uploaded): ${sourceLabel}`);
    } else if (stimulationId) {
      // Path B: Load from disk by ID (preset scenario picker)
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const filePath = path.join(__dirname, '..', 'config', 'stimulation', `${stimulationId}.json`);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: `Stimulation file not found: ${stimulationId}.json`,
          availablePath: filePath,
        });
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      collectionJson = JSON.parse(fileContent);
      sourceLabel = stimulationId;
      console.error(`\n🎯 Stimulation Request: ${sourceLabel}`);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid collectionJson: must contain an "item" array of Postman request steps.',
      });
    }

    console.error(`   Environment: ${envName}`);
    console.error(`   Risk Service: ${envConfig.riskServiceBase}`);
    console.error(`   ACTUS Server: ${envConfig.actusServerBase}`);

    // ── Execute the pipeline ──────────────────────────────────────
    const result = await runStimulation(collectionJson, envConfig, envName);

    return res.json(result);
  } catch (error: any) {
    console.error('Stimulation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Health check for ACTUS risk service (8082)
app.get('/api/health/risk-service', async (req, res) => {
  const envName = (req.query.environment as string) || 'localhost';
  const envConfig = ENVIRONMENTS[envName];

  if (!envConfig) {
    return res.status(400).json({ error: `Unknown environment: ${envName}` });
  }

  const checks: Record<string, any> = {
    environment: envName,
    timestamp: new Date().toISOString(),
  };

  // Check risk service (8082)
  try {
    const axios = await import('axios');
    const response = await axios.default.get(`${envConfig.riskServiceBase}/findAllScenarios`, {
      timeout: 5000,
    });
    checks.riskService = {
      url: envConfig.riskServiceBase,
      connected: true,
      status: response.status,
    };
  } catch (error: any) {
    checks.riskService = {
      url: envConfig.riskServiceBase,
      connected: false,
      error: error.message,
    };
  }

  // Check ACTUS server (8083)
  try {
    const axios = await import('axios');
    const testPayload = {
      contracts: [{
        contractType: 'PAM', contractID: 'health_check',
        contractRole: 'RPA', contractDealDate: '2024-01-01T00:00:00',
        initialExchangeDate: '2024-01-01T00:00:00', statusDate: '2024-01-01T00:00:00',
        notionalPrincipal: 1000, maturityDate: '2024-01-02T00:00:00',
        nominalInterestRate: 0.0, currency: 'USD', dayCountConvention: 'A365',
      }],
      riskFactors: [],
    };
    const response = await axios.default.post(
      `${envConfig.actusServerBase}/eventsBatch`, testPayload,
      { headers: { 'Content-Type': 'application/json' }, timeout: 5000 }
    );
    checks.actusServer = {
      url: envConfig.actusServerBase,
      connected: response.status === 200 && !!response.data,
      status: response.status,
    };
  } catch (error: any) {
    checks.actusServer = {
      url: envConfig.actusServerBase,
      connected: false,
      error: error.message,
    };
  }

  const allHealthy = checks.riskService?.connected && checks.actusServer?.connected;
  return res.json({ status: allHealthy ? 'healthy' : 'degraded', ...checks });
});

// Start server
app.listen(PORT, () => {
  console.error('\n🚀 StableRisk API Server');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error(`   Server:        http://localhost:${PORT}`);
  console.error(`   Health:        http://localhost:${PORT}/api/health`);
  console.error(`   ACTUS:         ${DEFAULT_ACTUS_URL}`);
  console.error('  ─────────────── Stimulation Endpoints ───────────────────────');
  console.error(`   Environments:  http://localhost:${PORT}/api/environments`);
  console.error(`   Stimulations:  http://localhost:${PORT}/api/stimulations`);
  console.error(`   Run:           POST http://localhost:${PORT}/api/stimulation/run`);
  console.error(`   Health (full): http://localhost:${PORT}/api/health/risk-service?environment=localhost`);
  console.error('  ─────────────── Config-Based Simulation ─────────────────────');
  console.error(`   Simulate:      POST http://localhost:${PORT}/api/simulate`);
  console.error('  ─────────────── DeFi Liquidation Simulation ──────────────────');
  console.error(`   DeFi Simulate: POST http://localhost:${PORT}/api/defi-simulate`);
  console.error(`   DeFi Profiles: GET  http://localhost:${PORT}/api/defi-profiles`);
  console.error(`   DeFi Colls:    GET  http://localhost:${PORT}/api/defi-collections`);
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
