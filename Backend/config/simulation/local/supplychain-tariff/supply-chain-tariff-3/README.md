# Supply Chain Tariff Simulation Set 3 — SWAPS & SWPPV

**Date:** March 1, 2026  
**Endpoint:** `POST http://localhost:8083/eventsBatch`  
**Alternative:** `POST http://34.203.247.32:8083/eventsBatch`  
**Contract types:** SWPPV (Plain Vanilla Swap), SWAPS (Structured Swap with FIL/SEL legs), PAM (loan)

## Overview

51 self-contained ACTUS simulation JSONs modeling exporter working capital hedging decisions under tariff stress. Each file targets `/eventsBatch` (Approach 1 — embedded risk factors) and requires **zero changes** to actus-webapp or actus-riskservice.

Based on:
- **CFO Working Capital Playbook** (cfo-working-capital-playbook.docx)
- **GTAP v11 Armington elasticities** (Purdue University)
- **Working examples:** tariff1-4 from master Postman collection
- **Official ACTUS docs:** [SWPPV](https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWPPV), [SWAPS](https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_SWAPS)
- **Risk Factor architecture:** Risk-Factor-2.md (38 behavioral models)

## Why These Don't Need actus-webapp/risksrv3 Changes

The supply-chain-tariff-2 files failed because they tried to call **non-existent behavioral model endpoints** (`/addTariffSpreadModel`, `/addRevenueElasticityModel`) via `/rf2/scenarioSimulation`. Those models are *designed* in Risk-Factor-2.md but **not yet implemented** in Java.

This set encodes each risk factor dimension **into the SOFR rate path itself** — the market-observable effect. The wrapper Python scripts compare baseline vs stressed paths to quantify tariff cost and swap savings.

**Approach mapping:**

| Risk Factor | How Encoded in Rate Path | Behavioral Model (Future) |
|-------------|--------------------------|---------------------------|
| TariffSpread | Bank widens spread: SOFR+200bps → SOFR+300bps | TariffSpreadModel |
| RevenueElasticity | Revenue drops → hedge notional right-sized | RevenueElasticityModel |
| PortCongestion | Logistics inflation → SOFR + congestion spread | PortCongestionModel |
| FXTariffCorrelation | INR depreciation amplifies SOFR spike | FXTariffCorrelationModel |
| HedgeEffectiveness | Different hedge ratios compared side-by-side | HedgeEffectivenessModel |
| WorkingCapitalStress | Higher WC need → larger loan + hedge at worse rates | WorkingCapitalStressModel |

## Quick Start

```bash
# Step 1: Generate all 51 simulation JSONs
python generate_simulations.py

# Step 2: Run comparisons against ACTUS server
python run_all_simulations.py
python run_all_simulations.py --url http://34.203.247.32:8083/eventsBatch
```

## File Organization (51 JSONs)

### 1. TariffSpread (5 files) — 01a through 01e
### 2. RevenueElasticity (4 files) — 02a through 02d  
### 3. PortCongestion (4 files) — 03a through 03d
### 4. FXTariffCorrelation (4 files) — 04a through 04d
### 5. HedgeEffectiveness (11 files) — 05a through 05c
### 6. WorkingCapitalStress (5 files) — 06a through 06e
### 7. Commodity Corridors (15 files) — 07-*
### 8. Integrated Multi-Factor (3 files) — 08a through 08c

See generate_simulations.py for full details and parameters.

## SOFR Rate Paths (from CFO Playbook)

```
Scenario A (No Tariff):    4.25% ─── 3.5% (easing)
Scenario B (26% Tariff):   4.25% ── 4.8% ── 4.0% (moderate)
Scenario C (50% Tariff):   4.25% ──── 5.5% ──── 4.5% (spike)
FX-Amplified:              4.25% ────── 6.0% ──── 4.5% (worst)
Port Congestion:           4.25% ── 4.8% ── 3.6% (logistics)
```
