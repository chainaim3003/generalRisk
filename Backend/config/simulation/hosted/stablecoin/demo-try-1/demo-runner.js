/**
 * Converge.fi Demo Runner — MINT → HALT → RESTORE lifecycle
 * 
 * Reads base_portfolio.json + reserve_overrides.json from the same directory.
 * Merges overrides into portfolio. Sends ALL contracts to ACTUS 8083/eventsBatch.
 * Computes health metrics from real ACTUS events. Reports MINT ALLOWED or BLOCKED.
 * 
 * Usage:
 *   node demo-runner.js                              # reads current reserve_overrides.json
 *   node demo-runner.js --sim http://34.203.247.32:8083   # use AWS ACTUS
 * 
 * No npm install needed — uses native fetch (Node 18+).
 * 
 * ACTUS Reference:
 *   https://www.actusfrf.org/taxonomy
 *   https://www.actusfrf.org/dictionary
 *   https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM
 */

const fs = require('fs');
const path = require('path');

const SIM_HOST = process.argv.includes('--sim')
  ? process.argv[process.argv.indexOf('--sim') + 1]
  : 'http://34.203.247.32:8083';

const DEMO_DIR = __dirname;
const THRESHOLDS = {
  backingRatio:   1.00,   // 100% — GENIUS Act / MiCA requirement
  liquidityRatio: 0.20,   // 20%  — MiCA Art.45 immediate redemption
  riskScore:      75      // composite ceiling (lower is better)
};

// ════════════════════════════════════════════════════════════════════
// 1. READ FILES
// ════════════════════════════════════════════════════════════════════

function readPortfolio() {
  const raw = fs.readFileSync(path.join(DEMO_DIR, 'base_portfolio.json'), 'utf8');
  return JSON.parse(raw);
}

function readOverrides() {
  const overridePath = path.join(DEMO_DIR, 'reserve_overrides.json');
  try {
    const raw = fs.readFileSync(overridePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { overrideActive: false, portfolioAdjustments: [], contracts: [], earlyLiquidations: [] };
  }
}

// ════════════════════════════════════════════════════════════════════
// 2. MERGE OVERRIDES INTO PORTFOLIO
// ════════════════════════════════════════════════════════════════════

function mergePortfolio(portfolio, overrides) {
  // Deep copy so we don't mutate the original
  const merged = JSON.parse(JSON.stringify(portfolio));

  if (!overrides.overrideActive) {
    return merged;
  }

  // 2a. Apply portfolio adjustments (modify existing contract principals)
  for (const adj of (overrides.portfolioAdjustments || [])) {
    const idx = merged.contracts.findIndex(c => c.contractID === adj.contractID);
    if (idx === -1) {
      console.log(`  ⚠  portfolioAdjustment: contractID not found: ${adj.contractID}`);
      continue;
    }
    const original = merged.contracts[idx].notionalPrincipal;
    merged.contracts[idx].notionalPrincipal = adj.newNotionalPrincipal;
    merged.contracts[idx].description += ` [ADJUSTED: ${adj.reason}]`;
    console.log(`  ↓  ${adj.contractID}: $${original.toLocaleString()} → $${adj.newNotionalPrincipal.toLocaleString()} (${adj.reason})`);
  }

  // 2b. Process early liquidations (rewrite maturity + apply penalty)
  for (const liq of (overrides.earlyLiquidations || [])) {
    const idx = merged.contracts.findIndex(c => c.contractID === liq.contractID);
    if (idx === -1) {
      console.log(`  ⚠  earlyLiquidation: contractID not found: ${liq.contractID}`);
      continue;
    }
    const original = merged.contracts[idx];
    const penaltyFactor = 1 - (liq.penaltyPercent / 100);
    const penalizedPrincipal = Math.round(original.notionalPrincipal * penaltyFactor * 100) / 100;
    const penaltyCost = original.notionalPrincipal - penalizedPrincipal;

    merged.contracts[idx].maturityDate = liq.liquidationDate;
    merged.contracts[idx].notionalPrincipal = penalizedPrincipal;
    merged.contracts[idx].reserveCategory = 'cash'; // now immediate cash
    merged.contracts[idx].description += ` [EARLY LIQ: ${liq.reason}]`;

    console.log(`  ⚡ EARLY LIQUIDATION: ${liq.contractID}`);
    console.log(`     maturity: ${original.maturityDate} → ${liq.liquidationDate}`);
    console.log(`     principal: $${original.notionalPrincipal.toLocaleString()} → $${penalizedPrincipal.toLocaleString()}`);
    console.log(`     penalty: ${liq.penaltyPercent}% = $${penaltyCost.toLocaleString()} cost`);
  }

  // 2c. Append additional reserve contracts
  for (const contract of (overrides.contracts || [])) {
    merged.contracts.push(contract);
    console.log(`  +  ADDED: ${contract.contractID} — $${contract.notionalPrincipal.toLocaleString()} (${contract.description})`);
  }

  return merged;
}

// ════════════════════════════════════════════════════════════════════
// 3. SEND TO ACTUS 8083 — eventsBatch
// ════════════════════════════════════════════════════════════════════

async function runACTUS(portfolio) {
  // Build the eventsBatch request body — just the contracts array
  // ACTUS processes each PAM contract and returns events (IED, IP, PR, MD)
  // Reference: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM

  const actusContracts = portfolio.contracts.map(c => {
    // Extract only ACTUS-standard fields (strip our custom fields)
    const actus = {};
    const actusFields = [
      'contractType', 'contractID', 'contractRole', 'contractDealDate',
      'initialExchangeDate', 'statusDate', 'maturityDate', 'notionalPrincipal',
      'premiumDiscountAtIED', 'nominalInterestRate', 'currency',
      'dayCountConvention', 'calendar', 'businessDayConvention'
    ];
    for (const f of actusFields) {
      if (c[f] !== undefined) actus[f] = c[f];
    }
    return actus;
  });

  const body = { contracts: actusContracts };
  const url = `${SIM_HOST}/eventsBatch`;

  console.log(`\n  📡 POST ${url} — ${actusContracts.length} contracts`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ACTUS eventsBatch failed: ${res.status} — ${text}`);
  }

  const result = await res.json();
  return result;
}

// ════════════════════════════════════════════════════════════════════
// 4. COMPUTE HEALTH METRICS FROM PORTFOLIO + ACTUS EVENTS
// ════════════════════════════════════════════════════════════════════

function computeHealth(portfolio, actusResult) {
  const tokenSupply = portfolio.metadata.tokenSupply;
  let totalReserves = 0;
  let cashReserves = 0;
  let tbillReserves = 0;
  let penaltyCosts = 0;

  const contractDetails = [];

  for (const contract of portfolio.contracts) {
    const principal = contract.notionalPrincipal;
    const category = contract.reserveCategory || 'unknown';

    // Find this contract's ACTUS result
    const actusContract = actusResult.find(r => r.contractId === contract.contractID || r.contractID === contract.contractID);
    const eventCount = actusContract ? (actusContract.events || []).length : 0;
    const status = actusContract ? actusContract.status : 'not found';

    if (category === 'cash') {
      cashReserves += principal;
    } else if (category === 'tbill') {
      tbillReserves += principal;
    }
    totalReserves += principal;

    contractDetails.push({
      id: contract.contractID,
      category,
      principal,
      events: eventCount,
      status
    });
  }

  const backingRatio = totalReserves / tokenSupply;
  const liquidityRatio = totalReserves > 0 ? cashReserves / totalReserves : 0;

  // Risk score: composite of backing distance + liquidity distance + concentration
  // Lower is better. Scale 0-100.
  const backingGap = Math.max(0, 1 - backingRatio) * 100;     // 0 if >= 100%
  const liquidityGap = Math.max(0, 0.20 - liquidityRatio) * 100; // 0 if >= 20%
  const concentrationPenalty = tbillReserves > 0 ? (tbillReserves / totalReserves > 0.80 ? 15 : 0) : 0;
  const riskScore = Math.min(100, Math.round(backingGap * 3 + liquidityGap * 2 + concentrationPenalty));

  const backingPass  = backingRatio >= THRESHOLDS.backingRatio;
  const liquidityPass = liquidityRatio >= THRESHOLDS.liquidityRatio;
  const riskPass     = riskScore <= THRESHOLDS.riskScore;
  const healthy = backingPass && liquidityPass && riskPass;

  return {
    tokenSupply,
    totalReserves,
    cashReserves,
    tbillReserves,
    backingRatio,
    liquidityRatio,
    riskScore,
    backingPass,
    liquidityPass,
    riskPass,
    healthy,
    contractDetails
  };
}

// ════════════════════════════════════════════════════════════════════
// 5. DISPLAY RESULTS
// ════════════════════════════════════════════════════════════════════

function displayResults(health, overrides) {
  const hr = '═'.repeat(64);
  const sr = '─'.repeat(64);

  console.log(`\n${hr}`);
  console.log('  CONVERGE.FI — RESERVE HEALTH REPORT');
  console.log(`${hr}`);

  // Portfolio composition
  console.log('\n  PORTFOLIO COMPOSITION:');
  for (const c of health.contractDetails) {
    const cat = c.category.toUpperCase().padEnd(6);
    const prin = `$${c.principal.toLocaleString()}`.padStart(12);
    const ev = `${c.events} events`.padStart(10);
    const st = c.status === 'Success' ? '✅' : '⚠ ';
    console.log(`    ${st} ${c.id.padEnd(28)} ${cat} ${prin}   ACTUS: ${ev} (${c.status})`);
  }
  console.log(`${sr}`);
  console.log(`    Token supply:    $${health.tokenSupply.toLocaleString()}`);
  console.log(`    Total reserves:  $${health.totalReserves.toLocaleString()}`);
  console.log(`    ├─ Cash:         $${health.cashReserves.toLocaleString()}`);
  console.log(`    └─ T-bills:      $${health.tbillReserves.toLocaleString()}`);

  // Health metrics
  console.log(`\n${sr}`);
  console.log('  HEALTH METRICS:                     VALUE      THRESHOLD   STATUS');
  console.log(`${sr}`);

  const bk = (health.backingRatio * 100).toFixed(1) + '%';
  const lq = (health.liquidityRatio * 100).toFixed(1) + '%';
  const rs = health.riskScore.toString();

  console.log(`    Backing Ratio   (reserves/supply)  ${bk.padStart(8)}     ≥ 100%      ${health.backingPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    Liquidity Ratio (cash/reserves)     ${lq.padStart(8)}     ≥  20%      ${health.liquidityPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    Risk Score      (composite)         ${rs.padStart(8)}     ≤  75       ${health.riskPass ? '✅ PASS' : '❌ FAIL'}`);

  // Mint gate
  console.log(`\n${hr}`);
  if (health.healthy) {
    console.log('  ┌─────────────────────────────────────────────────┐');
    console.log('  │          🟢  MINT ALLOWED — ALL CHECKS PASS    │');
    console.log('  │          ACE Policy Gate: OPEN                  │');
    console.log('  └─────────────────────────────────────────────────┘');
  } else {
    const failures = [];
    if (!health.backingPass) failures.push('BACKING < 100%');
    if (!health.liquidityPass) failures.push('LIQUIDITY < 20%');
    if (!health.riskPass) failures.push('RISK > 75');
    console.log('  ┌─────────────────────────────────────────────────┐');
    console.log('  │          🔴  MINT BLOCKED — HEALTH CHECK FAILED │');
    console.log(`  │          Failures: ${failures.join(', ').padEnd(28)}│`);
    console.log('  │          ACE Policy Gate: CLOSED                │');
    console.log('  └─────────────────────────────────────────────────┘');
  }
  console.log(`${hr}\n`);
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(64));
  console.log('  CONVERGE.FI — CRE PERIODIC HEALTH CHECK');
  console.log(`  ACTUS Server: ${SIM_HOST}`);
  console.log(`  Timestamp:    ${new Date().toISOString()}`);
  console.log('═'.repeat(64));

  // Step 0: Read files
  console.log('\n  STEP 0: Read portfolio + overrides');
  const portfolio = readPortfolio();
  const overrides = readOverrides();
  console.log(`  Base portfolio: ${portfolio.contracts.length} contracts, supply: $${portfolio.metadata.tokenSupply.toLocaleString()}`);
  console.log(`  Override active: ${overrides.overrideActive}`);

  // Step 1: Merge
  console.log('\n  STEP 1: Merge overrides into portfolio');
  const merged = mergePortfolio(portfolio, overrides);
  console.log(`  Final portfolio: ${merged.contracts.length} contracts`);

  // Step 2: Send to ACTUS
  console.log('\n  STEP 2: Send to ACTUS server (eventsBatch)');
  const actusResult = await runACTUS(merged);
  console.log(`  ACTUS returned: ${actusResult.length} contract results`);
  for (const r of actusResult) {
    const id = r.contractId || r.contractID;
    const evts = (r.events || []).length;
    console.log(`    ${id}: ${evts} events (${r.status})`);
  }

  // Step 3: Compute health
  console.log('\n  STEP 3: Compute health metrics');
  const health = computeHealth(merged, actusResult);

  // Step 4: Display
  displayResults(health, overrides);

  return health;
}

main().catch(err => {
  console.error('\n  ❌ Demo runner failed:', err.message);
  console.error('     Is ACTUS running on', SIM_HOST, '?');
  process.exit(1);
});
