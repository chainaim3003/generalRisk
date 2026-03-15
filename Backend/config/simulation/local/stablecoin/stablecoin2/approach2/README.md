# Approach 2: Sequential Simulation with Feedback Loop

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    APPROACH 2 DATA FLOW                             │
│                                                                     │
│  Phase 1        Phase 2           Phase 3          Phase 4-5        │
│  ────────       ────────          ────────         ────────         │
│  Exogenous   →  T-Bill Sim   →  Dynamic Index  →  Liability Sim    │
│  PEG_RISK      (4 contracts)    Builder           (Iteration 1)    │
│                     │               ▲                   │           │
│                     │               │                   │           │
│                     ▼               │                   ▼           │
│              Actual IED/MD    Pre-req scripts     PP events         │
│              events           read events,        (redemptions)     │
│                               compute daily                         │
│                               cash/MtM/reserves        │           │
│                                                        │           │
│                                                        ▼           │
│  Phase 6                Phase 7                Phase 8              │
│  ────────              ────────               ────────             │
│  Rebuild indexes  →   Liability Sim    →    Convergence            │
│  cash -= redemptions  (Iteration 2)        Iter1 vs Iter2         │
│  from Iter 1                                                       │
│                                                                     │
│  FEEDBACK LOOP: Iter1 outputs → Iter2 inputs                       │
└─────────────────────────────────────────────────────────────────────┘
```

## What Makes This Different From Approach 1

| Aspect | Approach 1 | Approach 2 |
|--------|-----------|-----------|
| T-Bill MtM | Pre-computed static values | Interpolated from actual IED/MD events |
| Cash inflows | Manually calculated maturity dates | From actual MD event payoffs |
| Cash outflows (redemptions) | Pre-computed guess | Iter 1: none, Iter 2: from actual PP events |
| Reserves index | Static, loaded before sim | Dynamically built from T-Bill sim output |
| Behavioral model accuracy | Reads guesswork | Iter 1: optimistic, Iter 2: corrected |
| Feedback | None | PP events from Iter 1 fed into Iter 2 |

## The Key Innovation: Pre-Request Scripts

Phases 3 and 6 use Postman **pre-request scripts** to dynamically construct reference index
request bodies. The pattern:

```
Phase 2 test script:
  → Parse T-Bill simulation response
  → Compute daily cash/MtM/reserves from actual events
  → Store in pm.collectionVariables('daily_data_iter0')

Phase 3 pre-request script:
  → Read daily_data_iter0 from collection variables
  → Build {riskFactorID, marketObjectCode, data[]} JSON body
  → Set as pm.collectionVariables('dynamic_cash_body')

Phase 3 request body:
  → Uses {{dynamic_cash_body}} variable substitution
  → POSTs dynamically built index to /addReferenceIndex
```

## Collection Phases

### Phase 1: Exogenous Data
- `SC_PEG_RISK_SEQ_01` — External peg risk signal (not contract-derived)
- `sc_tbill_only_100k` — Minimal scenario for T-Bill-only run

### Phase 2: T-Bill Only Simulation
- Runs 4 T-Bill PAM contracts (no behavioral models)
- Test script extracts:
  - Actual IED events (purchase dates/amounts)
  - Actual MD events (maturity dates/payoffs)
- Computes daily timeline:
  - T-Bill MtM = interpolated purchase price → par (pull-to-par)
  - Cash = $6,000 initial + cumulative MD payoffs
  - Total reserves = cash + T-Bill MtM
- Stores `daily_data_iter0` for Phase 3

### Phase 3: Dynamic Index Building
- **3.1 SC_TBILL_MV_DYN_I1** — Daily T-Bill aggregate MtM from interpolation
- **3.2 SC_CASH_DYN_I1** — Cash = initial + actual maturity inflows (NO redemptions)
- **3.3 SC_RESERVES_DYN_I1** — Total = cash + T-Bill MtM
- All built dynamically in pre-request scripts

### Phase 4: Behavioral Models + Scenario (Iteration 1)
- `br_seq_100k_i1` — BackingRatioModel (reads dynamic indexes)
- `ml_seq_100k_i1` — MaturityLadderModel (reads PEG_RISK_SCORE)
- `sc_seq_iter1_100k` — Bundles dynamic indexes + models

### Phase 5: Liability Simulation — Iteration 1
- Runs StableCoin-Liability ONLY against Iter 1 indexes
- Cash index is optimistic (no redemptions) so:
  - BackingRatioModel sees higher reserves than reality
  - May under-estimate redemption pressure
- Captures PP/MRD events (actual behavioral model outputs)
- Stores `iter1_pp_events` for Phase 6

### Phase 6: Feedback Loop — Rebuild Indexes
- **6.1 SC_CASH_DYN_I2** — Cash = Iter0 cash - cumulative Iter 1 redemptions
- **6.2 SC_RESERVES_DYN_I2** — Corrected total reserves
- **6.3 br_seq_100k_i2** — New BackingRatioModel reading Iter 2 indexes
- **6.4 sc_seq_iter2_100k** — Updated scenario

### Phase 7: Liability Simulation — Iteration 2
- Re-runs liability with corrected indexes
- BackingRatioModel now sees more accurate cash (with redemption drain)
- Captures Iter 2 PP events for convergence check

### Phase 8: Convergence + Dashboard
- **8.1** Compares Iter 1 vs Iter 2 PP events:
  - Total redemption amounts
  - Day-by-day payoff comparison
  - Convergence threshold: < $500 total delta
- **8.2** Full portfolio dashboard using best-estimate (Iter 2) data:
  - Daily cash, T-Bill MtM, total reserves, supply, backing %, liquidity %
  - ACE policy checks per day
  - Stress period detection
  - Data provenance for each metric

## Unique IDs Used

To avoid collisions with other simulations, all entities use unique IDs:

| Entity | Iter 1 ID | Iter 2 ID |
|--------|-----------|-----------|
| T-Bill MtM Index | SC_TBILL_MV_DYN_I1 | (reused) |
| Cash Index | SC_CASH_DYN_I1 | SC_CASH_DYN_I2 |
| Reserves Index | SC_RESERVES_DYN_I1 | SC_RESERVES_DYN_I2 |
| BackingRatioModel | br_seq_100k_i1 | br_seq_100k_i2 |
| MaturityLadderModel | ml_seq_100k_i1 | (reused) |
| Scenario | sc_seq_iter1_100k | sc_seq_iter2_100k |
| Liability Contract | StableCoin-100K-Liability-I1 | StableCoin-100K-Liability-I2 |

## Remaining Limitations

1. **Two iterations may not converge**: If Iter 2 redemptions differ significantly from
   Iter 1, a 3rd iteration would be needed. The convergence check in Phase 8 detects this.

2. **MtM is interpolated, not market-observed**: We compute pull-to-par linearly between
   purchase price and par. Real T-bill MtM depends on secondary market rates. This could
   be improved by adding a rate shock reference index.

3. **No intra-day feedback**: Within a single simulation run, the behavioral model still
   reads a static snapshot. Updates only happen BETWEEN iterations.

4. **Assumption: T-bills are independent of liability**: We assume T-bill events don't
   change based on liability state. This is true for held-to-maturity but not if the
   MaturityLadderModel triggers early liquidation.

## Run Instructions

```bash
# Import into Postman, open Console (Ctrl+Alt+C), run collection in order
# IMPORTANT: Must run in sequence — Phase 3+ depends on Phase 2 output

# Or via Newman:
newman run Approach2-SequentialFeedback-MultiContract-100K-30d.json \
  --env-var "actus_risk_host=localhost:8082" \
  --env-var "actus_sim_host=localhost:8083"
```

## What Approach 3 Would Add

Approach 3 (Portfolio State Service) would replace the iteration loop with real-time
middleware that:
- Intercepts every event as it's generated
- Updates a shared portfolio state (cashBalance, tbillMV, totalReserves)
- Writes updated values back to the risk service
- Behavioral models read LIVE state, not snapshots
- No iterations needed — single-pass accuracy
