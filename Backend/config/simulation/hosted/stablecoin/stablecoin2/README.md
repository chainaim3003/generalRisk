# Stablecoin2 — $100K Reserve Simulations

## Overview

These simulations address the **missing gaps** identified in the Converge.fi detailed design documents (§11.1–§11.5). All simulations use a **$100,000 USD initial reserve** modeled as ACTUS PAM (Principal At Maturity) contracts.

## Files

| File | Gap Addressed | What It Proves |
|------|--------------|----------------|
| `StableCoin-MintHaltRestore-100K-30d.json` | §14 (v2) — Mint→Halt→Restore lifecycle | Successful mint on health check pass, halt on failing checks, resume on restore |
| `StableCoin-TreasuryBacked-MultiContract-100K-30d.json` | §11.1 — Multi-contract simulation | Multiple T-bill PAM contracts show maturity ladder cash inflows |
| `StableCoin-MarketRisk-RateShock-100K-30d.json` | §11.4 — Interest rate shock | Market risk from rate hike devalues T-bill MtM, cascading to backing breach |
| `StableCoin-DepositPressure-100K-30d.json` | §11.3 — Deposit/mint pressure | Surge in deposit demand tests whether minting dilutes backing below threshold |
| `StableCoin-IntegrationTests-100K.json` | All gaps — Integrated test suite | TC-01 through TC-10 validate the entire pipeline end-to-end |

## Reserve Composition ($100K)

```
ASSET                  AMOUNT     MATURITY       ACTUS TYPE
────────────────────── ────────── ────────────── ──────────
Cash (bank deposits)   $6,000     Immediate      PAM (CSH)
T-Bill A (4-week)      $24,500    Mar 15, 2026   PAM
T-Bill B (8-week)      $24,500    Mar 30, 2026   PAM
T-Bill C (13-week)     $24,500    Apr 15, 2026   PAM
T-Bill D (13-week)     $24,500    Apr 30, 2026   PAM
────────────────────── ────────── ────────────── ──────────
TOTAL RESERVES         $104,000   (laddered)
STABLECOIN LIABILITY   $100,000   (outstanding supply)
BACKING RATIO          104%
```

## Behavioral Models Used

| Model | ID Pattern | What It Does |
|-------|-----------|-------------|
| **BackingRatioModel** | `br_*_100k_01` | Monitors reserves/supply ratio. Returns gap fraction when backing < 100%. Triggers via ACTUS behavioral callback at each PP event. |
| **RedemptionPressureModel** | `rp_*_100k_01` | Converts peg deviation to daily redemption rate (609-event empirical calibration). 2% de-peg → 8.5% daily redemptions. |
| **MaturityLadderModel** | `ml_*_100k_01` | T-bill roll decisions based on PEG_RISK_SCORE. Decision tree: <15=ROLL, 15-29=SHORTEN, 30-44=CASH, >=45=EMERGENCY. |

## Mint → Halt → Restore Lifecycle

```
Day 1:   MINT ✅   Backing=104%, Cash=$6K,   RiskScore=18  → All ACE policies HEALTHY
Day 8:   HALT 🛑   Backing=97.5%, Cash=$2K,  RiskScore=82  → All ACE policies UNHEALTHY
Day 12:  TROUGH    Backing=94%, Cash=$1K,    De-peg=4.2%   → Worst point
Day 15:  RESCUE    T-Bill A matures → +$24,500 cash        → Cash spikes $1.5K → $26K
Day 18:  MINT ✅   Backing=107.8%, Cash=$21K, RiskScore=22  → All ACE policies HEALTHY
```

## How to Run

### Prerequisites
- ACTUS Risk Service running on `34.203.247.32:8082` (or `34.203.247.32:8082` for AWS)
- ACTUS Simulation Engine running on `34.203.247.32:8083` (or `34.203.247.32:8083` for AWS)
- MongoDB running on port `27018`

### Running in Postman
1. Import any `.json` file as a Postman collection
2. Open Postman Console (`Ctrl+Alt+C` / `Cmd+Alt+C`)
3. Set collection variables `actus_risk_host` and `actus_sim_host` if using AWS
4. Click "Run Collection" to execute all requests in order
5. Watch console output for detailed metrics and lifecycle state

### Running via Newman (CLI)
```bash
# Install Newman
npm install -g newman

# Run the mint→halt→restore lifecycle
newman run StableCoin-MintHaltRestore-100K-30d.json

# Run the integration tests
newman run StableCoin-IntegrationTests-100K.json

# Run with AWS endpoints
newman run StableCoin-MintHaltRestore-100K-30d.json \
  --env-var "actus_risk_host=34.203.247.32:8082" \
  --env-var "actus_sim_host=34.203.247.32:8083"
```

## ACE Policy Thresholds

| Policy | Threshold | What Triggers Mint Block |
|--------|-----------|------------------------|
| BackingRatioPolicy | ≥ 10000 bps (100%) | Reserves/supply drops below 100% |
| LiquidityRatioPolicy | ≥ 2000 bps (20%) | Cash/reserves drops below 20% |
| RiskScorePolicy | ≤ 75/100 | Composite risk exceeds 75 |

## ACTUS Contract Type: PAM

All contracts use **PAM (Principal At Maturity)** which is the standard ACTUS type for:
- Zero-coupon bonds (T-bills) — purchased at discount, mature at par
- Stablecoin liabilities — modeled as the outstanding supply obligation
- Cash positions — modeled as immediate-maturity PAM

Key PAM parameters:
- `notionalPrincipal`: Face value ($100,000 for liability, $24,500 for each T-bill)
- `premiumDiscountAtIED`: Purchase discount (negative for T-bills bought below par)
- `nominalInterestRate`: 0.0 for both stablecoins and T-bills
- `stablecoinModels`: Array of behavioral model IDs for callback-driven dynamics

## Reference Index Market Object Codes

| MOC | What It Tracks |
|-----|---------------|
| `SC_TOTAL_RESERVES` | Aggregate reserve value (cash + T-bill MtM) |
| `SC_CASH_RESERVE` | Cash component only (immediate liquidity) |
| `STABLECOIN_PEG_DEV` | Peg deviation from $1.00 (0.0 = on peg, 0.05 = 5% de-peg) |
| `PEG_RISK_SCORE` | Composite risk score (0-100) for MaturityLadderModel |
| `SC_TBILL_MV` | T-bill mark-to-market aggregate |
| `SC_TBILL_RATE` | Fed funds / T-bill yield rate |
| `SC_DEPOSIT_DEMAND` | Incoming deposit/mint demand ($USD/day) |
