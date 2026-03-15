# HybridTreasury V2 — Risk Factors Audit Report

**Date:** 2026-02-25  
**Simulation file:** `simulations/HybridTreasury-MultiContract-RiskFactors-V2-6mo.json`  
**Status:** ✅ COMPLETE — all files verified, 1 file updated

---

## FILE INVENTORY — hybridtreasury1 directories (4 layers × 8 models = 32 files)

### `utils/hybridtreasury1/` — Behavioral model logic (8 files)

| File | Status | V2 Used | MOCs Consumed |
|------|--------|---------|---------------|
| AllocationDriftModel.java | ✅ Unchanged | ✅ ad_btc01 | BTC_USD_SPOT, PORTFOLIO_TOTAL_VALUE |
| LiquidityBufferModel.java | ✅ Unchanged | ✅ lb_tr01 | PROJECTED_OUTFLOWS, TBILL_MATURITY_SCHEDULE |
| **PegStressModel.java** | **🔧 UPDATED** | ✅ ps_usdc01 | USDC_USD_PEG, USDT_USD_PEG |
| YieldArbitrageModel.java | ✅ Unchanged | ✅ ya_tr01 | UST_3M_YIELD, ETH_STAKING_YIELD, DEFI_USDC_LEND_RATE |
| FairValueComplianceModel.java | ✅ Unchanged | ✅ fv_btc01 | BTC_USD_SPOT, BTC_MVRV_RATIO |
| RegulatoryDeRiskModel.java | ✅ Unchanged | — | (available, not in V2 scenario) |
| CashConversionCycleModel.java | ✅ Unchanged | — | (available, not in V2 scenario) |
| IntegratedStressModel.java | ✅ Unchanged | — | (available, not in V2 scenario) |

### `models/hybridtreasury1/` — MongoDB document classes (8 files)

| File | Status |
|------|--------|
| AllocationDriftModelData.java | ✅ Unchanged |
| LiquidityBufferModelData.java | ✅ Unchanged |
| PegStressModelData.java | ✅ Unchanged |
| YieldArbitrageModelData.java | ✅ Unchanged |
| FairValueComplianceModelData.java | ✅ Unchanged |
| RegulatoryDeRiskModelData.java | ✅ Unchanged |
| CashConversionCycleModelData.java | ✅ Unchanged |
| IntegratedStressModelData.java | ✅ Unchanged |

### `repository/hybridtreasury1/` — MongoRepository interfaces (8 files)

| File | Status |
|------|--------|
| AllocationDriftModelStore.java | ✅ Unchanged |
| LiquidityBufferModelStore.java | ✅ Unchanged |
| PegStressModelStore.java | ✅ Unchanged |
| YieldArbitrageModelStore.java | ✅ Unchanged |
| FairValueComplianceModelStore.java | ✅ Unchanged |
| RegulatoryDeRiskModelStore.java | ✅ Unchanged |
| CashConversionCycleModelStore.java | ✅ Unchanged |
| IntegratedStressModelStore.java | ✅ Unchanged |

### `controllers/hybridtreasury1/` — Exception classes (8 files)

| File | Status |
|------|--------|
| AllocationDriftModelNotFoundException.java | ✅ Unchanged |
| LiquidityBufferModelNotFoundException.java | ✅ Unchanged |
| PegStressModelNotFoundException.java | ✅ Unchanged |
| YieldArbitrageModelNotFoundException.java | ✅ Unchanged |
| FairValueComplianceModelNotFoundException.java | ✅ Unchanged |
| RegulatoryDeRiskModelNotFoundException.java | ✅ Unchanged |
| CashConversionCycleModelNotFoundException.java | ✅ Unchanged |
| IntegratedStressModelNotFoundException.java | ✅ Unchanged |

---

## INTEGRATION FILES (shared controllers)

| File | Status | Verification |
|------|--------|-------------|
| `controllers/RiskDataManager.java` | ✅ Already complete | Has POST/DELETE/GET/GET-ALL for all 8 hybrid treasury models |
| `controllers/RiskObservationHandler.java` | ✅ Already complete | Has `else if` branches for all 8 hybrid treasury model types (fnp230-237) |

---

## CHANGE LOG

### 1. `PegStressModel.java` — UPDATED (bug fix)

**Problem:** Model treated the MOC value directly as a deviation. When fed actual
peg rates (e.g., `USDC_USD_PEG = 0.9985`), `primaryDev = |0.9985| = 0.9985` which
always exceeds any threshold (designed for values like 0.0015).

**Fix:** Auto-detect whether MOC value is a peg rate or deviation:
```java
// Auto-detect: if |value| > 0.5 it is a peg rate → compute deviation from 1.0
double primaryDev = Math.abs(primaryRaw) > 0.5
        ? Math.abs(1.0 - primaryRaw)    // peg rate: 0.9985 → dev = 0.0015
        : Math.abs(primaryRaw);          // deviation: -0.0015 → dev = 0.0015
```

This ensures backward compatibility with both old deviation-style MOCs
and the new V2 peg-rate-style MOCs (`USDC_USD_PEG`, `USDT_USD_PEG`).

### 2. `simulations/HybridTreasury-MultiContract-RiskFactors-V2-6mo.json` — NEW

New Postman collection with 18 API calls (8 new market RFs + 3 legacy + 5 behavioral models + 1 scenario + 1 simulation).

---

## RISK FACTOR ARCHITECTURE — V2 vs V1

### V1 (original)
```
Reference Indexes:  4 (only 1 true market observable)
Behavioral Models:  2 (AllocationDrift, LiquidityBuffer)
Contracts:          5 (1 STK + 4 PAM T-bills)
```

### V2 (enriched)
```
Reference Indexes: 11 (8 market observables + 3 legacy)
Behavioral Models:  5 (AllocationDrift, LiquidityBuffer, PegStress, YieldArbitrage, FairValueCompliance)
Contracts:          7 (1 STK + 4 PAM T-bills + 1 PAM USDC + 1 PAM Fiat)
```

### New Market Risk Factor → Behavioral Model Wiring

```
BTC_USD_SPOT ──────────┬──→ AllocationDriftModel (ad_btc01)
                       └──→ FairValueComplianceModel (fv_btc01)

UST_3M_YIELD ─────────────→ YieldArbitrageModel (ya_tr01)

USDC_USD_PEG ──────────────→ PegStressModel (ps_usdc01) [primary]
USDT_USD_PEG ──────────────→ PegStressModel (ps_usdc01) [alt]

ETH_STAKING_YIELD ────────→ YieldArbitrageModel (ya_tr01)
DEFI_USDC_LEND_RATE ──────→ YieldArbitrageModel (ya_tr01)

BTC_MVRV_RATIO ───────────→ FairValueComplianceModel (fv_btc01)
BTC_REALIZED_VOL ─────────→ (context/diagnostic — available for future models)

PORTFOLIO_TOTAL_VALUE ─────→ AllocationDriftModel (ad_btc01) [legacy]
PROJECTED_OUTFLOWS ────────→ LiquidityBufferModel (lb_tr01) [legacy]
TBILL_MATURITY_SCHEDULE ───→ LiquidityBufferModel (lb_tr01) [legacy]
```

### Contract → Behavioral Model Assignment

```
BTC-Position-40 (STK)     →  treasuryModels: [ad_btc01, ps_usdc01, fv_btc01]
USDC-Reserve-3M (PAM)     →  treasuryModels: [ya_tr01, ps_usdc01]
FiatCash-5M (PAM)         →  treasuryModels: [lb_tr01]
TBILL-*  (4× PAM)         →  no behavioral models (pure ACTUS contract events)
```
