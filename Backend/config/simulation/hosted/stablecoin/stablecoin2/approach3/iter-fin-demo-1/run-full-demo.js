/**
 * run-full-demo.js — Single-command 3-phase demo
 *
 * Runs PHASE A (healthy) → PHASE B (stress) → PHASE C (restore)
 * all in sequence, with pauses between phases.
 *
 * Usage:
 *   node run-full-demo.js                                    # 34.203.247.32:8083
 *   node run-full-demo.js --sim http://34.203.247.32:8083    # AWS ACTUS
 *
 * No npm install needed — Node 18+ only.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEMO_DIR = __dirname;
const PAUSE_SECONDS = 5;

const SIM_FLAG = process.argv.includes('--sim')
  ? `--sim ${process.argv[process.argv.indexOf('--sim') + 1]}`
  : '';

// ════════════════════════════════════════════════════════════════════

function writeOverride(content) {
  fs.writeFileSync(path.join(DEMO_DIR, 'reserve_overrides.json'), JSON.stringify(content, null, 2));
}

function copyOverride(filename) {
  const src = path.join(DEMO_DIR, filename);
  const dst = path.join(DEMO_DIR, 'reserve_overrides.json');
  fs.copyFileSync(src, dst);
}

function runDemoRunner() {
  try {
    execSync(`node "${path.join(DEMO_DIR, 'demo-runner.js')}" ${SIM_FLAG}`, {
      stdio: 'inherit',
      cwd: DEMO_DIR
    });
  } catch (e) {
    console.error('  demo-runner.js failed — is ACTUS 8083 running?');
    process.exit(1);
  }
}

function pause(seconds) {
  console.log(`\n  ⏳ Waiting ${seconds} seconds (simulating CRE cron interval)...\n`);
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) { /* busy wait for sync pause */ }
}

// ════════════════════════════════════════════════════════════════════

console.log('\n' + '█'.repeat(72));
console.log('█                                                                      █');
console.log('█   CONVERGE.FI — FULL LIFECYCLE DEMO                                  █');
console.log('█   MINT ✅  →  HALT 🔴  →  RESTORE ✅                                 █');
console.log('█                                                                      █');
console.log('█   3 CRE cron periods. Same collection.json.                          █');
console.log('█   Only the reserve_overrides.json changes between periods.            █');
console.log('█                                                                      █');
console.log('█'.repeat(72));

// ── PHASE A ──────────────────────────────────────────────────────

console.log('\n\n');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  PHASE A / 3 :  HEALTHY BASELINE — No overrides active             ║');
console.log('║                                                                    ║');
console.log('║  Portfolio: $120K cash + $10K ops + $130K 4wk + $130K 13wk         ║');
console.log('║             + $125K 26wk = $515K backing $500K supply              ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

writeOverride({
  overrideActive: false,
  description: "Default state — no interventions.",
  portfolioAdjustments: [],
  contracts: [],
  earlyLiquidations: []
});

runDemoRunner();

pause(PAUSE_SECONDS);

// ── PHASE B ──────────────────────────────────────────────────────

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  PHASE B / 3 :  STRESS — $100K cash withdrawn (regulatory payment) ║');
console.log('║                                                                    ║');
console.log('║  cash-reserve-001: $120,000 → $20,000                              ║');
console.log('║  Total reserves drop to $415K. Backing 83%. Liquidity 7.2%.        ║');
console.log('║                                                                    ║');
console.log('║  ⚠  A simple check catches 83% backing.                            ║');
console.log('║  ⚠  ONLY Converge.fi catches 7.2% liquidity — $385K is LOCKED      ║');
console.log('║     in T-bills that mature in 23, 85, and 175 days.                ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

copyOverride('override_phaseB_stress.json');

runDemoRunner();

pause(PAUSE_SECONDS);

// ── PHASE C ──────────────────────────────────────────────────────

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  PHASE C / 3 :  RESTORE — TradFi mechanisms restore health         ║');
console.log('║                                                                    ║');
console.log('║  1. EARLY T-BILL LIQUIDATION: tbill-26wk-001                       ║');
console.log('║     Sold on secondary market BEFORE maturity at 3% penalty.         ║');
console.log('║     $125,000 × 0.97 = $121,250 freed as immediate cash.            ║');
console.log('║     Penalty cost: $3,750 (mark-to-market haircut)                  ║');
console.log('║                                                                    ║');
console.log('║  2. CAPITAL INJECTION: $90,000 from treasury fund                  ║');
console.log('║                                                                    ║');
console.log('║  Combined: backing restored to 100.3%, liquidity to 48.1%.         ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');

copyOverride('override_phaseC_restore.json');

runDemoRunner();

// ── RESET + SUMMARY ──────────────────────────────────────────────

// Reset override to default
writeOverride({
  overrideActive: false,
  description: "Default state — no interventions.",
  portfolioAdjustments: [],
  contracts: [],
  earlyLiquidations: []
});

console.log('\n');
console.log('█'.repeat(72));
console.log('█                                                                      █');
console.log('█   DEMO COMPLETE                                                      █');
console.log('█                                                                      █');
console.log('█   Phase A:  🟢 MINT ALLOWED    backing 103.0%   liquidity 25.2%      █');
console.log('█   Phase B:  🔴 MINT BLOCKED    backing  83.0%   liquidity  7.2%      █');
console.log('█   Phase C:  🟢 MINT ALLOWED    backing 100.3%   liquidity 48.1%      █');
console.log('█                                                                      █');
console.log('█   T-bill early liquidation penalty: $3,750 (3% of $125,000)          █');
console.log('█   Capital injection: $90,000                                          █');
console.log('█                                                                      █');
console.log('█   reserve_overrides.json has been reset to default.                   █');
console.log('█                                                                      █');
console.log('█'.repeat(72));
console.log('');
