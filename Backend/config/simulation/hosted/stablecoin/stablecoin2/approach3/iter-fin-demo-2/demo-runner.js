/**
 * Converge.fi Demo Runner V4 — Option B: Thin wrapper calling Express server.
 *
 * Single source of truth: the Express server computes all metrics.
 * This script is display-only — ZERO computation.
 *
 * Usage:
 *   node demo-runner.js                           # Phase A, 34.203.247.32:3001
 *   node demo-runner.js --phase B                 # Phase B
 *   node demo-runner.js --phase C                 # Phase C
 *   node demo-runner.js --url http://host:3001    # Custom server URL
 *
 * Requires: Express server running on port 3001
 *   cd converge.fi-1/risk-engine && npm run dev
 */

const RISK_ENGINE = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : 'http://34.203.247.32:3001';

const phase = process.argv.includes('--phase')
  ? process.argv[process.argv.indexOf('--phase') + 1].toUpperCase()
  : 'A';

async function main() {
  const url = `${RISK_ENGINE}/api/demo/health-check?phase=${phase}`;
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Converge.fi Demo Runner V4 — Phase ${phase}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  Fetching: ${url}`);
  console.log('');

  const res = await fetch(url);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`❌ Server returned ${res.status}: ${errorBody}`);
    process.exit(1);
  }

  const data = await res.json();
  displayHealthReport(data);
}

function displayHealthReport(data) {
  const h = data.health;
  const t = data.thresholds;

  console.log(`  Phase:           ${data.phase}`);
  console.log(`  Override Active: ${data.overrideActive}`);
  console.log(`  ACTUS Server:    ${data.actusServer}`);
  console.log(`  Contracts:       ${data.contractCount}`);
  console.log(`  ACTUS Events:    ${data.totalACTUSEvents}`);
  console.log('');
  console.log('  ─── PORTFOLIO ───────────────────────────────────────────');
  console.log(`  Token Supply:       ${h.tokenSupply.toLocaleString()}`);
  console.log(`  Total Reserves:     $${h.totalReserves.toLocaleString()}`);
  console.log(`  Cash Reserves:      $${h.cashReserves.toLocaleString()}`);
  console.log(`  T-bill Reserves:    $${h.tbillReserves.toLocaleString()}`);
  console.log(`  Ineligible:         $${h.ineligibleReserves.toLocaleString()}`);
  console.log('');
  console.log('  ─── HEALTH METRICS ──────────────────────────────────────');
  console.log(`  Backing Pct:        ${h.backingPct}%   ${h.backingPass ? '✅' : '❌'} (threshold: ≥${t.backingPct}%)`);
  console.log(`  Liquidity Pct:      ${h.liquidityPct}%   ${h.liquidityPass ? '✅' : '❌'} (threshold: ≥${t.liquidityPct}%)`);
  console.log(`  Risk Score:         ${h.riskScore}     ${h.riskPass ? '✅' : '❌'} (threshold: ≤${t.riskScore})`);
  console.log(`  Asset Eligibility:  ${h.assetEligibilityPct}%   ${h.eligibilityPass ? '✅' : '❌'} (threshold: ≥${t.assetEligibilityPct}%)`);
  console.log(`  WAM (days):         ${h.wamDays}`);
  console.log(`  Custodian Diversity:${h.custodianDiversityScore}`);
  console.log('');
  console.log('  ─── MINT GATE ───────────────────────────────────────────');
  const gateIcon = h.mintGate === 'OPEN' ? '🟢' : '🔴';
  console.log(`  ${gateIcon} Mint Gate: ${h.mintGate}`);
  if (!h.healthy) {
    const failures = [];
    if (!h.backingPass) failures.push(`Backing ${h.backingPct}% < ${t.backingPct}%`);
    if (!h.liquidityPass) failures.push(`Liquidity ${h.liquidityPct}% < ${t.liquidityPct}%`);
    if (!h.riskPass) failures.push(`Risk Score ${h.riskScore} > ${t.riskScore}`);
    if (!h.eligibilityPass) failures.push(`Eligibility ${h.assetEligibilityPct}% < ${t.assetEligibilityPct}%`);
    console.log(`  Blocked by: ${failures.join(', ')}`);
  }
  console.log('');
  console.log('  ─── MATURITY LADDER ─────────────────────────────────────');
  for (const m of h.maturityLadder || []) {
    if (m.principal <= 0) continue;
    const eligible = m.isGeniusEligible ? '✅' : '❌';
    const custInfo = m.custodian ? ` [${m.custodian}]` : '';
    console.log(`  ${m.contractID}: $${m.principal.toLocaleString()} | ${m.category} | ${m.daysToMaturity}d | GENIUS:${eligible}${custInfo}`);
  }
  console.log('');
  console.log('════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
