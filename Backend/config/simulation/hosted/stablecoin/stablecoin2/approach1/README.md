# Approach 1: Post-Simulation Cross-Contract Aggregation

## The Problem

ACTUS contract state is **contract-scoped**. Each PAM contract has its own isolated state machine:

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│  TBill-A-100K    │   │  TBill-B-100K    │   │  StableCoin-     │
│                  │   │                  │   │  Liability-MC    │
│  notionalPrinc   │   │  notionalPrinc   │   │  notionalPrinc   │
│  accruedInterest │   │  accruedInterest │   │  accruedInterest │
│  events[]        │   │  events[]        │   │  events[]        │
│                  │   │                  │   │                  │
│  ❌ No access to │   │  ❌ No access to │   │  ❌ No access to │
│  other contracts │   │  other contracts │   │  other contracts │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

When TBill-A generates an MD event (+$24,500), that cash inflow exists ONLY in TBill-A's event stream. There is **no shared `cashBalance` variable** that StableCoin-Liability can read.

## The Workaround (Approach 1)

```
DURING simulation:
  - Behavioral models read PRE-COMPUTED static reference indexes
  - These were manually calculated by us before the simulation ran
  - The ACTUS engine has no way to aggregate live contract state

AFTER simulation:
  - Test script collects ALL events from ALL 5 contracts
  - Sorts them chronologically
  - Maintains a running cashBalance across all events
  - Computes backing ratio and liquidity ratio at each step
  - Compares pre-computed indexes vs actual aggregated values
```

## Collection Structure

### Phase 1: Reference Indexes (Requests 1.1–1.4)
Same as original simulation. These are **static, pre-computed** data:
- `SC_TBILL_MV_100K_01` — T-Bill aggregate mark-to-market
- `SC_RESERVES_MC_100K_01` — Total reserves (cash + T-bill MV)
- `SC_CASH_MC_100K_01` — Cash component only
- `SC_PEG_RISK_100K_01` — Peg risk score

### Phase 2: Behavioral Models (Requests 2.1–2.3)
Same as original. These models read from the static indexes above:
- `br_mc_100k_01` — BackingRatioModel
- `ml_mc_100k_01` — MaturityLadderModel
- `sc_multi_contract_100k_01` — Scenario bundle

### Phase 3: Simulation Execution (Request 3.1)
Runs 5 contracts simultaneously. Stores raw output in `pm.collectionVariables`.

### Phase 4: Post-Simulation Aggregation (NEW — Requests 4.1–4.4)

**4.1 — Cash Balance Aggregation**
- Collects ALL events from ALL contracts
- Sorts chronologically
- Walks through each event maintaining:
  - `cashBalance` — updated by MD inflows (T-bill maturity) and PP outflows (redemptions)
  - `stablecoinSupply` — updated by PP events (redemptions reduce, mints increase)
  - `tbillHoldings` — tracks which T-bills are still alive
  - `totalReserves` = cashBalance + alive T-bill par values
  - `backingRatio` = totalReserves / stablecoinSupply
  - `liquidityRatio` = cashBalance / stablecoinSupply
- Logs each cash-impacting event with before/after state

**4.2 — Pre-Computed vs Actual Comparison**
- Takes the SC_CASH_MC_100K_01 values we loaded in Phase 1
- Compares them against the actual aggregated cash from 4.1
- Reports discrepancies with explanation of why they matter

**4.3 — Daily Portfolio Dashboard**
- End-of-day snapshots showing all portfolio metrics
- ACE policy checks (Backing ≥100%, Liquidity ≥20%)
- Stress period detection
- Recovery date identification

**4.4 — Maturity Ladder Verification**
- Checks each expected T-bill maturity against actual MD events
- Verifies dates and amounts match
- Reports total inflow from maturity ladder

## Limitations (Stated Honestly)

1. **No real-time feedback**: The behavioral models during simulation read STATIC indexes.
   If the actual contract events diverge from what we pre-computed, the models make
   decisions on wrong data.

2. **Manual pre-computation**: The SC_CASH_MC_100K_01 index values ($6K → $1K → $26K)
   were calculated by us. If we got the math wrong, the whole simulation is flawed.

3. **No behavioral model response to actual state**: If a PP event drains more cash than
   expected, the BackingRatioModel doesn't see this. It sees our pre-computed value.

## Run Instructions

```bash
# Import into Postman, open Console (Ctrl+Alt+C), run collection
# Or via Newman:
newman run Approach1-PostSimAggregation-MultiContract-100K-30d.json \
  --env-var "actus_risk_host=34.203.247.32:8082" \
  --env-var "actus_sim_host=34.203.247.32:8083"
```

## What Comes Next

- **Approach 2 (Sequential Simulation)**: Run T-bill contracts first → capture MD events → dynamically build SC_CASH index → then run liability contract with accurate data.
- **Approach 3 (Portfolio State Service)**: Middleware that intercepts events in real-time and updates reference indexes during simulation.
