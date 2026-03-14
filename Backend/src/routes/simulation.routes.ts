/**
 * Simulation Routes
 * Config-based simulation endpoint that runs full ACTUS simulation
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig, loadCollection } from '../config/config-loader.js';
import type { IssuerConfig, HolderConfig } from '../config/config.types.js';
import { runStimulation, ENVIRONMENTS } from '../api/SimulationRunner.js';

const router = Router();

/**
 * POST /api/simulate
 * Run simulation with config-based parameters
 * 
 * This endpoint:
 * 1. Loads the config and resolves file references  
 * 2. Loads the base collection
 * 3. Runs the full ACTUS simulation using the existing SimulationRunner
 * 4. Returns the complete simulation result (steps, contracts, risk factors)
 */
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { configData } = req.body;
    
    if (!configData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: configData'
      });
    }
    
    console.log('\n🎯 Config-Based Simulation Request');
    console.log('   Config ID:', configData.config_metadata?.config_id);
    console.log('   Collection:', configData.config_metadata?.collection_file);
    
    // Step 1: Load and resolve config
    const resolvedConfig = await loadConfig(configData as IssuerConfig | HolderConfig);
    console.log('   ✅ Config resolved');
    console.log('   Jurisdiction:', resolvedConfig.jurisdiction_data.jurisdiction_code);
    console.log('   Monitoring times generated:', resolvedConfig.generated.monitoring_times.length);
    
    // Step 2: Load base collection
    const baseCollection = await loadCollection(configData.config_metadata.collection_file);
    console.log('   ✅ Base collection loaded');
    console.log('   Collection name:', baseCollection.info?.name);
    console.log('   Operations:', baseCollection.item?.length || 0);
    
    // Step 3: Run the simulation using the existing SimulationRunner
    console.log('   🚀 Running ACTUS simulation...');
    const envConfig = ENVIRONMENTS.localhost; // Use localhost environment
    const simulationResult = await runStimulation(baseCollection, envConfig, 'localhost');
    
    if (!simulationResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Simulation failed',
        details: simulationResult
      });
    }
    
    console.log('   ✅ Simulation complete');
    console.log('   Steps executed:', simulationResult.steps?.length || 0);
    console.log('   Contracts:', simulationResult.simulation?.length || 0);
    
    // Step 4: Return the complete simulation result
    // Add config metadata to the response
    return res.json({
      ...simulationResult,
      configMetadata: {
        entity_type: configData.config_metadata.collection_file.includes('ISS') ? 'issuer' : 'holder',
        jurisdiction: resolvedConfig.jurisdiction_data.jurisdiction_code,
        monitoring_times_count: resolvedConfig.generated.monitoring_times.length,
        config_id: resolvedConfig.config_metadata.config_id,
        collection_file: resolvedConfig.config_metadata.collection_file
      }
    });
    
  } catch (error: any) {
    console.error('Simulation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
