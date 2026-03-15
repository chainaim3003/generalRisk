# Converge.fi — 2-Minute Demo Script
## MINT → HALT → RESTORE with Real ACTUS Contracts

---

## COMPELLING NARRATIVE (for voiceover / presenter)

> "Today, stablecoin issuers check one number: total reserves versus total supply.
> If reserves are $103M and supply is $100M — green light, mint more tokens.
>
> But here's what that simple check misses: $97M of those reserves could be
> locked in 6-month Treasury Bills. Only $6M is actual cash. If 10% of holders
> redeem tomorrow, the issuer can't pay. The coin is 103% BACKED but only
> 5.8% LIQUID. That's how stablecoins break.
>
> Converge.fi brings deep TradFi reserve management practices into stablecoin
> infrastructure. We model every reserve contract — cash positions, T-bills
> at different maturities, commercial paper — as ACTUS financial contracts.
> An ISO-grade standard used by banks and central banks worldwide.
>
> Our system runs three concurrent health checks, not one:
>   1. Backing Ratio — are total reserves ≥ 100% of supply? (GENIUS Act / MiCA)
>   2. Liquidity Ratio — is immediate cash ≥ 20% of reserves? (MiCA Art.45)
>   3. Risk Score — a composite of concentration, maturity ladder, and quality.
>
> All three must pass. If any single metric fails, minting is automatically
> blocked on-chain through Chainlink CRE and ACE policies.
>
> Now watch what happens when the reserve portfolio comes under stress — and
> how TradFi's own toolkit (early T-bill liquidation with penalty, capital
> injection) restores health. This is not a theoretical model. Every contract
> you'll see is processed by a real ACTUS server."

---

## PREREQUISITES

```
1. ACTUS Simulation Engine running on 34.203.247.32:8083
   (OR AWS: 34.203.247.32:8083)

2. Node.js 18+ installed (for native fetch)

3. Terminal open in the demo directory:
   cd C:\SATHYA\CHAINAIM3003\mcp-servers\ACTUS-LOCAL-EXT\actus-risk-service-extension1\actus-riskservice\simulations\local\stablecoin\demo
```

---

## DEMO FLOW (3 phases, ~2 minutes total)

```
PHASE A  ──→  PHASE B  ──→  PHASE C
HEALTHY       STRESSED       RESTORED
MINT ✅       MINT 🔴        MINT ✅

  │              │              │
  │  copy        │  copy        │
  │  phaseB      │  phaseC      │
  │  override    │  override    │
  ▼              ▼              ▼
  run            run            run
  demo-runner    demo-runner    demo-runner
```

---

## EXACT STEPS TO EXECUTE

### Phase A: Healthy Baseline — MINT SUCCEEDS

**[~20 seconds]**

The override file is already set to inactive (default state).

```bash
# Verify override is inactive
type reserve_overrides.json
```

Expected output:
```json
{
  "overrideActive": false,
  "portfolioAdjustments": [],
  "contracts": [],
  "earlyLiquidations": []
}
```

```bash
# Run the health check
node demo-runner.js
```

**What the audience sees:**
```
  PORTFOLIO COMPOSITION:
    ✅ cash-reserve-001      CASH    $20,000   ACTUS: 2 events (Success)
    ✅ operating-cash-001    CASH     $5,000   ACTUS: 2 events (Success)
    ✅ tbill-4wk-001         TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-13wk-001        TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-26wk-001        TBILL   $26,000   ACTUS: 2 events (Success)

    Token supply:    $100,000
    Total reserves:  $103,000
    ├─ Cash:         $25,000
    └─ T-bills:      $78,000

  HEALTH METRICS:                     VALUE      THRESHOLD   STATUS
    Backing Ratio   (reserves/supply)   103.0%     ≥ 100%      ✅ PASS
    Liquidity Ratio (cash/reserves)      24.3%     ≥  20%      ✅ PASS
    Risk Score      (composite)              0     ≤  75       ✅ PASS

  ┌─────────────────────────────────────────────────┐
  │          🟢  MINT ALLOWED — ALL CHECKS PASS     │
  │          ACE Policy Gate: OPEN                   │
  └─────────────────────────────────────────────────┘
```

**Presenter says:**
> "Five real ACTUS contracts — two cash positions and three Treasury Bills at different
> maturities. Total reserves $103K backing $100K supply. All three metrics pass.
> Minting is allowed."

---

### Phase B: Stress — MINT BLOCKED

**[~30 seconds]**

Simulate a cash withdrawal (regulatory compliance payment drains $16K from cash reserves).

```bash
# Apply the stress override
copy override_phaseB_stress.json reserve_overrides.json
```

On Mac/Linux:
```bash
cp override_phaseB_stress.json reserve_overrides.json
```

```bash
# Run the health check again (same collection, same cron)
node demo-runner.js
```

**What the audience sees:**
```
  STEP 1: Merge overrides into portfolio
  ↓  cash-reserve-001: $20,000 → $4,000 (Cash withdrawn — $16,000 regulatory compliance payment)

  PORTFOLIO COMPOSITION:
    ✅ cash-reserve-001      CASH     $4,000   ACTUS: 2 events (Success)
    ✅ operating-cash-001    CASH     $5,000   ACTUS: 2 events (Success)
    ✅ tbill-4wk-001         TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-13wk-001        TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-26wk-001        TBILL   $26,000   ACTUS: 2 events (Success)

    Token supply:    $100,000
    Total reserves:  $87,000
    ├─ Cash:         $9,000
    └─ T-bills:      $78,000

  HEALTH METRICS:                     VALUE      THRESHOLD   STATUS
    Backing Ratio   (reserves/supply)    87.0%     ≥ 100%      ❌ FAIL
    Liquidity Ratio (cash/reserves)      10.3%     ≥  20%      ❌ FAIL
    Risk Score      (composite)             59     ≤  75       ✅ PASS

  ┌─────────────────────────────────────────────────┐
  │          🔴  MINT BLOCKED — HEALTH CHECK FAILED  │
  │          Failures: BACKING < 100%, LIQUIDITY < 20%│
  │          ACE Policy Gate: CLOSED                  │
  └─────────────────────────────────────────────────┘
```

**Presenter says:**
> "A $16,000 regulatory payment just drained our cash reserve. Watch what happens.
> The SAME cron job runs the SAME collection — but now it reads the updated override file.
>
> Backing drops to 87%. Liquidity collapses to 10%. TWO metrics fail simultaneously.
> Minting is automatically blocked. No human intervention needed for the halt —
> the ACE policy gate closes on-chain.
>
> A simple reserves-vs-supply check would have caught the backing drop. But it would
> have MISSED the liquidity crisis entirely — because the T-bills are still there,
> they just can't be redeemed tomorrow.
>
> Now watch how TradFi's own toolkit fixes this."

---

### Phase C: Restore — MINT SUCCEEDS AGAIN

**[~40 seconds]**

Apply two TradFi interventions: early T-bill liquidation with penalty + capital injection.

```bash
# Apply the restore override
copy override_phaseC_restore.json reserve_overrides.json
```

On Mac/Linux:
```bash
cp override_phaseC_restore.json reserve_overrides.json
```

```bash
# Run the health check again (same collection, same cron)
node demo-runner.js
```

**What the audience sees:**
```
  STEP 1: Merge overrides into portfolio
  ↓  cash-reserve-001: $20,000 → $4,000 (Cash still withdrawn from Phase B)
  ⚡ EARLY LIQUIDATION: tbill-26wk-001
     maturity: 2026-08-28T00:00:00 → 2026-03-10T00:00:00
     principal: $26,000 → $25,220
     penalty: 3% = $780 cost
  +  ADDED: emergency-cash-inject-001 — $15,000 (Emergency capital injection)

  PORTFOLIO COMPOSITION:
    ✅ cash-reserve-001      CASH     $4,000   ACTUS: 2 events (Success)
    ✅ operating-cash-001    CASH     $5,000   ACTUS: 2 events (Success)
    ✅ tbill-4wk-001         TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-13wk-001        TBILL   $26,000   ACTUS: 2 events (Success)
    ✅ tbill-26wk-001        CASH    $25,220   ACTUS: 2 events (Success)
    ✅ emergency-cash-inject  CASH   $15,000   ACTUS: 2 events (Success)

    Token supply:    $100,000
    Total reserves:  $101,220
    ├─ Cash:         $49,220
    └─ T-bills:      $52,000

  HEALTH METRICS:                     VALUE      THRESHOLD   STATUS
    Backing Ratio   (reserves/supply)   101.2%     ≥ 100%      ✅ PASS
    Liquidity Ratio (cash/reserves)      48.6%     ≥  20%      ✅ PASS
    Risk Score      (composite)              0     ≤  75       ✅ PASS

  ┌─────────────────────────────────────────────────┐
  │          🟢  MINT ALLOWED — ALL CHECKS PASS     │
  │          ACE Policy Gate: OPEN                   │
  └─────────────────────────────────────────────────┘
```

**Presenter says:**
> "Two real TradFi mechanisms just restored health:
>
> First, we sold the 26-week Treasury Bill on the secondary market BEFORE maturity.
> That costs a 3% penalty — $780 — but it converts $25,220 of locked value into
> immediate cash. This is exactly what a TradFi reserve manager would do.
>
> Second, we injected $15,000 of capital from the treasury fund.
>
> Result: backing jumps from 87% to 101.2%. Liquidity jumps from 10% to 48.6%.
> ALL THREE metrics pass. Minting is restored.
>
> The $780 penalty was the price of emergency liquidity. In TradFi, this is called
> a mark-to-market haircut on early redemption. It's a real cost with real accounting
> impact. Converge.fi models it, enforces it, and records it — continuously,
> not in a monthly audit."

---

## CLOSING (after the 3 phases)

**Presenter says:**
> "What you just saw is the convergence of TradFi and DeFi in action.
>
> ACTUS — the same financial contract standard used by the European Central Bank —
> processing real reserve contracts. Chainlink CRE running periodic health checks
> like a bank's risk management system. ACE policies automatically blocking minting
> when reserves are insufficient — not based on one number, but on three concurrent
> metrics: backing, liquidity, and risk.
>
> And when things go wrong, TradFi's own toolkit — maturity ladder management,
> early liquidation with penalty, capital injection — brings things back. All
> modeled, all auditable, all on-chain.
>
> This is Converge.fi. Not just 'are reserves greater than supply.'
> But 'can you actually pay your holders back tomorrow.'"

---

## CRON DEMONSTRATION (alternative to manual phases)

If you want to show the cron running automatically instead of manual steps,
use this wrapper script:

```bash
# cron-demo.bat (Windows)
@echo off
echo ════════════════════════════════════════════════════
echo  CONVERGE.FI — CRON SIMULATION (3 periods)
echo ════════════════════════════════════════════════════

echo.
echo ═══ PERIOD 1: Healthy baseline ═══
copy /Y reserve_overrides.json reserve_overrides.json >nul
node demo-runner.js
echo.
echo --- Waiting 10 seconds (simulating cron interval) ---
timeout /t 10 /nobreak

echo.
echo ═══ PERIOD 2: Stress event — cash withdrawn ═══
copy /Y override_phaseB_stress.json reserve_overrides.json >nul
node demo-runner.js
echo.
echo --- Waiting 10 seconds (simulating cron interval) ---
timeout /t 10 /nobreak

echo.
echo ═══ PERIOD 3: Operator intervention — health restored ═══
copy /Y override_phaseC_restore.json reserve_overrides.json >nul
node demo-runner.js

echo.
echo ════════════════════════════════════════════════════
echo  DEMO COMPLETE: MINT ✅ → HALT 🔴 → RESTORE ✅
echo ════════════════════════════════════════════════════
```

```bash
# cron-demo.sh (Mac/Linux)
#!/bin/bash
echo "════════════════════════════════════════════════════"
echo " CONVERGE.FI — CRON SIMULATION (3 periods)"
echo "════════════════════════════════════════════════════"

echo ""
echo "═══ PERIOD 1: Healthy baseline ═══"
node demo-runner.js
echo ""
echo "--- Waiting 10 seconds (simulating cron interval) ---"
sleep 10

echo ""
echo "═══ PERIOD 2: Stress event — cash withdrawn ═══"
cp override_phaseB_stress.json reserve_overrides.json
node demo-runner.js
echo ""
echo "--- Waiting 10 seconds (simulating cron interval) ---"
sleep 10

echo ""
echo "═══ PERIOD 3: Operator intervention — health restored ═══"
cp override_phaseC_restore.json reserve_overrides.json
node demo-runner.js

echo ""
echo "════════════════════════════════════════════════════"
echo " DEMO COMPLETE: MINT ✅ → HALT 🔴 → RESTORE ✅"
echo "════════════════════════════════════════════════════"
```

---

## FILE SUMMARY

```
demo/
├── base_portfolio.json             5 ACTUS PAM contracts ($103K reserves)
├── reserve_overrides.json          Active override (changes between phases)
├── override_phaseB_stress.json     Cash withdrawal — causes FAIL
├── override_phaseC_restore.json    Early T-bill liq + injection — RESTORES
├── demo-runner.js                  Node.js runner (no npm install needed)
├── cron-demo.bat                   Windows automated 3-phase demo
├── cron-demo.sh                    Mac/Linux automated 3-phase demo
└── DEMO-SCRIPT.md                  This file — narrative + exact steps
```

---

## WHY THIS IS NOT A SIMPLE CHECK

| What Most Stablecoins Check | What Converge.fi Checks |
|----------------------------|------------------------|
| Total reserves ≥ total supply | Backing Ratio (reserves/supply ≥ 100%) |
| (nothing else) | Liquidity Ratio (cash/reserves ≥ 20%) |
| (nothing else) | Risk Score (concentration, maturity, quality) |
| Monthly audit | CRE periodic cron (every 5 min / hourly / daily) |
| Manual intervention | ACE automatic mint gate (on-chain) |
| No maturity analysis | ACTUS contract-level maturity ladder |
| No early liquidation modeling | T-bill early liq with penalty (mark-to-market) |

The Phase B scenario demonstrates this perfectly: backing drops to 87% (a simple check catches this), BUT liquidity drops to 10% (a simple check MISSES this entirely because T-bills are counted as "reserves" without distinguishing their maturity dates).

---

## ACTUS DOCUMENTATION REFERENCES

- ACTUS Taxonomy: https://www.actusfrf.org/taxonomy
- ACTUS Data Dictionary: https://www.actusfrf.org/dictionary
- PAM Contract Example: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM
- GENIUS Act stablecoin reserve requirements: 100% backing mandate
- MiCA Art.45: Liquidity requirements for stablecoin issuers (20% immediate redemption)
