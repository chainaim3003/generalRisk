/**
 * Data Validation Utilities
 */

import type { StableCoinRiskData, RiskMetrics, VerificationSummary } from '../types/index.js';

/**
 * Validate StableCoin risk data integrity
 */
export function validateStableCoinData(data: StableCoinRiskData): void {
  console.log('\n🔍 Validating data integrity...');

  // Validate periodsCount
  if (data.periodsCount <= 0) {
    throw new Error('Periods count must be positive');
  }

  // Validate array lengths
  if (data.cashInflow.length !== data.periodsCount) {
    throw new Error(`Cash inflow length (${data.cashInflow.length}) does not match periods count (${data.periodsCount})`);
  }

  if (data.cashOutflow.length !== data.periodsCount) {
    throw new Error(`Cash outflow length (${data.cashOutflow.length}) does not match periods count (${data.periodsCount})`);
  }

  // Validate thresholds
  if (data.backingRatioThreshold <= 0) {
    throw new Error('Backing ratio threshold must be positive');
  }

  if (data.liquidityRatioThreshold < 0) {
    throw new Error('Liquidity ratio threshold cannot be negative');
  }

  if (data.concentrationLimit <= 0 || data.concentrationLimit > 100) {
    throw new Error('Concentration limit must be between 0 and 100');
  }

  if (data.qualityThreshold < 0 || data.qualityThreshold > 100) {
    throw new Error('Quality threshold must be between 0 and 100');
  }

  // Validate quality metrics arrays
  if (data.qualityMetrics.liquidityScores.length !== 4) {
    throw new Error('Liquidity scores must have exactly 4 elements (cash, treasury, corporate, other)');
  }

  if (data.qualityMetrics.creditRatings.length !== 4) {
    throw new Error('Credit ratings must have exactly 4 elements (cash, treasury, corporate, other)');
  }

  if (data.qualityMetrics.maturityProfiles.length !== 4) {
    throw new Error('Maturity profiles must have exactly 4 elements (cash, treasury, corporate, other)');
  }

  console.log('✅ Data validation passed');
}

/**
 * Generate verification summary from risk metrics
 */
export function generateSummary(
  portfolioId: string,
  riskMetrics: RiskMetrics,
  data: StableCoinRiskData
): VerificationSummary {
  const failureReasons: string[] = [];

  // Check backing ratio
  const backingStatus: 'PASS' | 'FAIL' = riskMetrics.backingCompliant ? 'PASS' : 'FAIL';
  if (!riskMetrics.backingCompliant) {
    failureReasons.push(
      `Backing ratio (${riskMetrics.averageBackingRatio.toFixed(2)}%) below threshold (${data.backingRatioThreshold}%)`
    );
  }

  // Check liquidity ratio
  const liquidityStatus: 'PASS' | 'FAIL' = riskMetrics.liquidityCompliant ? 'PASS' : 'FAIL';
  if (!riskMetrics.liquidityCompliant) {
    failureReasons.push(
      `Liquidity ratio (${riskMetrics.averageLiquidityRatio.toFixed(2)}%) below threshold (${data.liquidityRatioThreshold}%)`
    );
  }

  // Check concentration risk
  const concentrationStatus: 'PASS' | 'FAIL' = riskMetrics.concentrationCompliant ? 'PASS' : 'FAIL';
  if (!riskMetrics.concentrationCompliant) {
    failureReasons.push(
      `Concentration risk (${riskMetrics.maxConcentrationRisk.toFixed(2)}%) exceeds limit (${data.concentrationLimit}%)`
    );
  }

  // Check quality score
  const qualityStatus: 'PASS' | 'FAIL' = riskMetrics.qualityCompliant ? 'PASS' : 'FAIL';
  if (!riskMetrics.qualityCompliant) {
    failureReasons.push(
      `Asset quality score (${riskMetrics.averageAssetQuality.toFixed(2)}) below threshold (${data.qualityThreshold})`
    );
  }

  // Overall status
  const overallStatus: 'COMPLIANT' | 'NON-COMPLIANT' = riskMetrics.overallCompliant 
    ? 'COMPLIANT' 
    : 'NON-COMPLIANT';

  return {
    portfolioId,
    periodsAnalyzed: data.periodsCount,
    backing: {
      average: riskMetrics.averageBackingRatio,
      threshold: data.backingRatioThreshold,
      status: backingStatus
    },
    liquidity: {
      average: riskMetrics.averageLiquidityRatio,
      threshold: data.liquidityRatioThreshold,
      status: liquidityStatus
    },
    concentration: {
      maximum: riskMetrics.maxConcentrationRisk,
      limit: data.concentrationLimit,
      status: concentrationStatus
    },
    quality: {
      score: riskMetrics.averageAssetQuality,
      threshold: data.qualityThreshold,
      status: qualityStatus
    },
    overallStatus,
    failureReasons
  };
}

/**
 * Display verification summary in formatted output
 */
export function displaySummary(summary: VerificationSummary): void {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 VERIFICATION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`Portfolio ID: ${summary.portfolioId}`);
  console.log(`Periods Analyzed: ${summary.periodsAnalyzed}\n`);

  // Backing Ratio
  const backingIcon = summary.backing.status === 'PASS' ? '✅' : '❌';
  console.log(`${backingIcon} Backing Ratio:`);
  console.log(`   Average: ${summary.backing.average.toFixed(2)}%`);
  console.log(`   Threshold: ${summary.backing.threshold}%`);
  console.log(`   Status: ${summary.backing.status}\n`);

  // Liquidity Ratio
  const liquidityIcon = summary.liquidity.status === 'PASS' ? '✅' : '❌';
  console.log(`${liquidityIcon} Liquidity Ratio:`);
  console.log(`   Average: ${summary.liquidity.average.toFixed(2)}%`);
  console.log(`   Threshold: ${summary.liquidity.threshold}%`);
  console.log(`   Status: ${summary.liquidity.status}\n`);

  // Concentration Risk
  const concentrationIcon = summary.concentration.status === 'PASS' ? '✅' : '❌';
  console.log(`${concentrationIcon} Concentration Risk:`);
  console.log(`   Maximum: ${summary.concentration.maximum.toFixed(2)}%`);
  console.log(`   Limit: ${summary.concentration.limit}%`);
  console.log(`   Status: ${summary.concentration.status}\n`);

  // Asset Quality
  const qualityIcon = summary.quality.status === 'PASS' ? '✅' : '❌';
  console.log(`${qualityIcon} Asset Quality:`);
  console.log(`   Score: ${summary.quality.score.toFixed(2)}`);
  console.log(`   Threshold: ${summary.quality.threshold}`);
  console.log(`   Status: ${summary.quality.status}\n`);

  // Overall Status
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const overallIcon = summary.overallStatus === 'COMPLIANT' ? '🎉' : '⚠️';
  console.log(`${overallIcon} OVERALL STATUS: ${summary.overallStatus}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Failure Reasons
  if (summary.failureReasons.length > 0) {
    console.log('❌ Failure Reasons:');
    summary.failureReasons.forEach(reason => {
      console.log(`   • ${reason}`);
    });
    console.log('');
  }
}
