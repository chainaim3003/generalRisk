/**
 * Simulation Routes
 * New config-based simulation endpoint
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { loadConfig, loadCollection } from '../config/config-loader.js';
import type { IssuerConfig, HolderConfig } from '../config/config.types.js';

const router = Router();

/**
 * POST /api/simulate
 * Run simulation with config-based parameters
 * 
 * This is a SIMPLIFIED FIRST VERSION that:
 * 1. Loads the config
 * 2. Resolves file references  
 * 3. Loads the base collection (as-is, no overlay yet)
 * 4. Returns the collection for now
 * 
 * TODO: Add JSONPath overlay in next iteration
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
    
    // Step 3: For now, return the loaded data (overlay to be implemented)
    return res.json({
      success: true,
      message: 'Config loaded successfully. Overlay implementation pending.',
      config: {
        id: resolvedConfig.config_metadata.config_id,
        collection_file: resolvedConfig.config_metadata.collection_file,
        jurisdiction: resolvedConfig.jurisdiction_data.jurisdiction_code,
        monitoring_times_count: resolvedConfig.generated.monitoring_times.length
      },
      collection: {
        name: baseCollection.info?.name,
        operations_count: baseCollection.item?.length || 0
      },
      note: 'Phase 1 implementation: Config loading works. JSONPath overlay coming in Phase 2.'
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
