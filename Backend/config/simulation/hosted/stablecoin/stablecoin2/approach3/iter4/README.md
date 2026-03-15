# Approach 3 — iter4: Integrated Behavioral + Depeg Stress

## What Changed from iter3 → iter4

| Feature | iter3 | iter4 |
|---------|-------|-------|
| **Contracts** | 6 (assets only) | **7 (6 assets + 1 liability PAM RPL)** |
| **Behavioral models** | 8 models | **10 models (+TwoDimensionalPrepayment, +DepositPressure)** |
| **Phases** | 5 (single-pass per phase) | **7 phases + 3 depeg scenarios** |
| **TwoDimensionalPrepayment** | Not present | **6×6 2D surface (pegDeviation × daysInStress → multiplier)** |
| **Deposit pressure** | Not modeled | **Mint demand gate: accept/reject per phase** |
| **Feedback convergence** | None | **P3a→P3b sequential iteration with 2D-PP escalation** |
| **T-bill early liquidation** | Not modeled | **Phase 4-EL: secondary market sale at MtM haircut** |
| **Depeg stress** | Not covered | **Separate collection: Mild/Moderate/Severe scenarios** |
| **Cross-phase state** | pm.environment | **pm.collectionVariables (portable)** |
| **Liability contract** | Token supply hardcoded | **ACTUS PAM with contractRole=RPL** |

## Files in iter4

| File | Size | Phases | Purpose |
|------|------|--------|---------|
| `Approach3-IntegratedBehavioral-MultiContract-100K-30d-iter4.json` | ~192KB | 7 | Full integrated simulation with all 10 models |
| `Approach3-DepegStress-MultiContract-100K-30d-iter4.json` | ~98KB | 4 | Isolated depeg severity comparison (Mild/Moderate/Severe) |
| `README.md` | This file | — | Documentation |
| `generate_iter4.py` | — | — | Python generator (reproducible) |

## Why Depeg Stress is a SEPARATE Collection

The integrated simulation (Collection 1) models a **compound crisis** where rate shock + bank stress + peg deviation + early warning signals all interact simultaneously. This is realistic but makes it hard to isolate which risk channel drives the crisis.

The depeg stress collection (Collection 2) **isolates the peg deviation channel** by running the same $100K portfolio through three severity levels with minimal compounding factors. This answers: *"How bad does the peg deviation alone need to get before the system fails?"*

| Scenario | Peg Dev | Days | Historical Analog | Expected 2D-PP Multiplier |
|----------|---------|------|-------------------|--------------------------|
| A: Mild | 0.5% | 3 | USDT Mar 2023 | ~1.2x |
| B: Moderate | 3.0% | 7 | UST Phase 1 | ~5.0x |
| C: Severe | 8.0% | 14 | UST death spiral | ~25x+ |

## The 10 Behavioral Models

### Models 1-8 (from iter3, enhanced)

| # | Model | What It Does | Source |
|---|-------|-------------|--------|
| 1 | BackingRatioModel | MtM-adjusted reserves / token supply | Risk-Factor-2.md §6.1 |
| 2 | RedemptionPressureModel | 609-event calibrated daily redemption curves | Risk-Factor-2.md §6.2 |
| 3 | MaturityLadderModel | Roll/keep/emergency decision per phase | Risk-Factor-2.md §6.3 |
| 4 | AssetQualityModel | HQLA degradation (bank stress, sovereign, rate shock) | Risk-Factor-2.md §6.4 |
| 5 | ConcentrationDriftModel | HHI across asset types per phase | Risk-Factor-2.md §6.5 |
| 6 | ComplianceDriftModel | STABLE/GENIUS/MiCA continuous compliance | Risk-Factor-2.md §6.6 |
| 7 | EarlyWarningModel | 4-signal composite (curve/orderbook/CEX/sentiment) | Risk-Factor-2.md §6.7 |
| 8 | ContinuousAttestationModel | ZK-ready attestation data per phase | Risk-Factor-2.md §6.8 |

### Models 9-10 (NEW in iter4)

| # | Model | What It Does | Source |
|---|-------|-------------|--------|
| 9 | **TwoDimensionalPrepaymentModel** | 6×6 2D surface: (pegDeviation × daysInStress) → redemption multiplier. Bilinear interpolation matching risksrv3 `TwoDimensionalPrepaymentModel.java` pattern. Calibrated from 609 historical stablecoin depeg events. | Risk_FACTOR_1.md §7-8 |
| 10 | **DepositPressureModel** | Mint demand gate: given incoming deposit, checks if honoring the mint would breach backing ratio. Accept/reject decision per phase. | StableCoin-DepositPressure-100K-30d.json |

## 2D Prepayment Surface (Model 9)

The key innovation. Maps to the risksrv3 `/addTwoDimensionalPrepaymentModel` endpoint pattern but computed in post-processing (Approach 3 philosophy).

### Surface Axes

- **X-axis**: Peg deviation buckets: `[0%, 0.5%, 1%, 3%, 5%, 10%]`
- **Y-axis**: Days in stress: `[0, 1, 3, 7, 14, 30]`
- **Z-value**: Daily redemption multiplier (applied to base 609-event rate)

### Surface Values

```
         PegDev: 0.0%  0.5%  1.0%  3.0%  5.0%  10.0%
Days=0        [ 1.0   1.0   1.2   1.8   3.0   8.0  ]
Days=1        [ 1.0   1.1   1.5   2.5   5.0  12.0  ]
Days=3        [ 1.0   1.2   1.8   3.5   7.0  18.0  ]
Days=7        [ 1.0   1.3   2.2   5.0  10.0  25.0  ]
Days=14       [ 1.0   1.5   2.8   7.0  14.0  35.0  ]
Days=30       [ 1.0   1.8   3.5  10.0  20.0  50.0  ]
```

### How It Works

At each phase, the 2D surface takes the current peg deviation and days of sustained stress, performs bilinear interpolation (same algorithm as `TwoDimensionalPrepaymentModel.java`), and returns a multiplier. This multiplier is applied to the base 609-event redemption rate:

```
Effective Daily Redemption = Base_Rate × PP_Multiplier × Token_Supply
```

At P3b (peg=3%, 8 days): multiplier ≈ 5.0x → base 14.2%/day becomes ~71%/day — matching observed death spiral dynamics where redemptions accelerate non-linearly.

This is the **stablecoin equivalent of CollateralLTVModel**: just as LTV feedback makes crypto lending non-linear, peg deviation × time makes stablecoin redemptions non-linear.

## Collection 1: Integrated Behavioral (7 Phases)

### Phase Lifecycle

```
Phase 1 (Day 1):  BASELINE ✅ — 7 contracts, all 10 models green
    Portfolio: $100K (6 assets + 1 liability PAM)
    Cash: $22K (22%), backing: 100%, liquidity: 22%
    PP-Mult: 1.0x, EW: NORMAL, Deposit gate: ACCEPT $500

Phase 2 (Day 8):  EARLY WARNING ⚠️ — 2/4 EW signals fire
    $6K redeemed, $3K deposit spike absorbed (net -$3K)
    Cash: $13K, supply: $97K, PP-Mult: ~1.1x
    Mint gate tests: $3K deposit → ACCEPT (backing OK)

Phase 3a (Day 15): COMPOUND CRISIS — Iteration 1 🚨
    +50bps rate shock, peg -1.5%, bank stress 0.6, 4/4 EW
    Cash: $2K, supply: $83K, PP-Mult: ~5.0x (7 days stress)
    Deposit gate: REJECT (would breach backing)
    MINT HALTED

Phase 3b (Day 15): FEEDBACK CONVERGENCE 🔄
    Peg worsens to 3% (feedback from P3a halt)
    PP-Mult escalates to ~8-10x → cash exhausted to $200
    Supply: $81.2K, MINT HALTED (confirmed)

Phase 4-EL (Day 15 alt): T-BILL EARLY LIQUIDATION 🔀
    Sell 4-wk T-bill at MtM haircut ($69 loss)
    Cash: ~$18,131, liquidity restored to ~22%
    Trade-off: $69 realized loss vs 8-day minting halt

Phase 5 (Day 22): RECOVERY ✅
    4-wk T-Bill matures naturally → $18K cash inflow
    $2K deposit inflow. Cash: $20,200, supply: $81.2K
    PP-Mult: ~1.0x, EW: NORMAL, MINT RESTORED

Phase 6 (Day 28): LIFECYCLE DASHBOARD 📊
    Cross-phase comparison table + HTM vs Early Liq analysis
    All 10 models tracked across full lifecycle
```

## Collection 2: Depeg Stress (4 Phases)

### Scenario Comparison

| Metric | A: Mild (USDT) | B: Moderate (UST-1) | C: Severe (UST-spiral) |
|--------|----------------|---------------------|----------------------|
| Peg deviation | 0.5% | 3.0% | 8.0% |
| Days in stress | 3 | 7 | 14 |
| PP multiplier | ~1.2x | ~5.0x | ~25x+ |
| Base redm rate | 2.3%/day | 14.2%/day | 28.5%/day |
| Effective rate | 2.8%/day | ~71%/day | ~712%/day |
| Mint status | ALLOWED ✅ | HALTED 🛑 | HALTED 🛑 |

## Integration Sources

This iter4 integrates concepts from all these simulation files:

| Source File | What Was Integrated |
|-------------|-------------------|
| iter3/Approach3-CompoundStress...iter3.json | 8 behavioral models, 6 contracts, 5 phases |
| iter3/Approach3-EventsBatch...iter2.json | Notional extraction fix (IP.nominalValue / MD.payoff) |
| StableCoin-DepositPressure-100K-30d.json | Deposit demand curve → Model 10 (DepositPressureModel) |
| StableCoin-MarketRisk-RateShock-100K-30d.json | Rate shock MtM haircut → Model 4 (AssetQualityModel) |
| StableCoin-MintHaltRestore-100K-30d.json | Mint/halt/restore lifecycle → Phase 1-3-5 pattern |
| StableCoin-TreasuryBacked-MultiContract-100K-30d.json | Multi-contract portfolio structure |
| Risk_FACTOR_1.md §7-8 | TwoDimensionalPrepaymentModel endpoints + 2D surface pattern |
| Risk-Factor-2.md §6 | Domain 5: All 8 stablecoin behavioral model specifications |
| Risk_FACTOR_1.md §2 | risksrv3 `/addTwoDimensionalPrepaymentModel` endpoint mapping |

## Prerequisites

- **actus-server** running on `34.203.247.32:8083`
- **No risksrv3 needed** (port 8082 NOT required) — all models in post-processing
- Open **Postman Console** (`Ctrl+Alt+C`) before running
- Run each collection **in sequence** (phases depend on cross-phase variables)

## Running

1. Import the JSON file into Postman
2. Open Console: `Ctrl+Alt+C`
3. Click **Run Collection** → run in order
4. Watch the dashboards appear in console output
