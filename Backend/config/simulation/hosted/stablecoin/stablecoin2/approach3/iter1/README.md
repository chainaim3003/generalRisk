# Approach 3: Full Multi-Contract eventsBatch with Post-Processing Risk Dashboard

## Iteration 1

### What This Is

Unlike **Approach 2** (which uses `rf2/scenarioSimulation` with risksrv3 behavioral callbacks and multi-iteration sequential feedback), **Approach 3** sends ALL contracts through a SINGLE `/eventsBatch` call and computes ALL risk metrics in Postman test scripts.

### Why Approach 3?

| Aspect | Approach 2 | Approach 3 |
|--------|-----------|-----------|
| Complexity | High (19 requests, 3 iterations) | Low (4 requests, single-pass) |
| Infrastructure | risksrv3 + actus-server | **actus-server only** |
| Behavioral models | 8 Java classes required | **None** |
| Feedback mechanism | Sequential iterations with convergence | State transitions as separate requests |
| Risk computation | During simulation (risksrv3) | **Post-processing (Postman scripts)** |
| Use case | Deep behavioral modeling | Dashboard assessment, CRE integration |
| Deployment | Complex (2 services, Java builds) | **Simple (1 service, no builds)** |

### Portfolio ($100,000 Stablecoin Reserves)

| Contract | Type | Amount | Maturity | HQLA |
|----------|------|--------|----------|------|
| cash-reserve-001 | PAM (overnight) | $12,000 | Day 1 | L1 |
| operating-cash-001 | PAM (overnight) | $10,000 | Day 1 | L1 |
| tbill-4wk-001 | PAM (zero coupon) | $20,000 | Day 28 | L1 |
| tbill-13wk-001 | PAM (zero coupon) | $33,000 | Day 91 | L1 |
| tbill-26wk-001 | PAM (zero coupon) | $25,000 | Day 182 | L1 |

### Lifecycle Narrative (30-day horizon)

```
Day 1:  MINT ALLOWED ✅
        Reserves $100K, Supply $100K, Cash $22K
        Backing 100%, Liquidity 22% (above 20% min)

Day 8:  MINT HALTED 🛑  ← Redemption shock $18K
        Cash drops to $4K, Supply drops to $82K
        Backing ~95%, Liquidity 4.9% (below 20% min)
        T-bills locked until maturity → illiquid

Day 28: MINT RESTORED ✅  ← 4-week T-Bill matures
        $20K T-bill → cash. Cash rises to $24K
        Backing ~100%, Liquidity 29.3% (above 20% min)
        Health checks pass → minting resumes
```

### Risk Metrics Computed (in Postman Test Scripts)

1. **Backing Ratio** = Total Reserves / Token Supply (min: 100%)
2. **Liquidity Ratio** = Cash Reserves / Token Supply (min: 20%)
3. **Concentration HHI** = Σ(share_i²) (lower is better)
4. **Asset Quality Score** = 100 (all L1 HQLA)
5. **Maturity Ladder** = days to nearest T-bill maturity (max: 93 per GENIUS Act)
6. **STABLE/GENIUS Act Compliance** = combined check

### Prerequisites

- **actus-server** running on `34.203.247.32:8083`
- **No risksrv3 needed** (port 8082 NOT required)

### How to Run

1. Import `Approach3-EventsBatch-MultiContract-100K-30d-iter1.json` into Postman
2. Open Postman Console (`Ctrl+Alt+C`)
3. Run Collection in sequence: Phase 1 → 2 → 3 → 4
4. Watch Console for risk dashboards and lifecycle narrative

**Via Newman:**
```bash
newman run Approach3-EventsBatch-MultiContract-100K-30d-iter1.json
```

### Collection Structure

```
Phase 1: POST /eventsBatch (5 contracts) → Baseline dashboard
Phase 2: POST /eventsBatch (4 contracts) → Stress dashboard
Phase 3: POST /eventsBatch (3 contracts) → Recovery dashboard
Phase 4: POST /eventsBatch (3 contracts) → Lifecycle summary
```

### ACTUS Contract Attributes (per official documentation)

- `contractType`: "PAM" (Principal At Maturity)
- `contractRole`: "RPA" (Real Position Asset)
- `dayCountConvention`: "A365"
- `nominalInterestRate`: "0.0" (zero coupon for T-bills)
- All dates in ISO format: "YYYY-MM-DDTHH:MM:SS"

### Key Insight

**Maturity mismatch risk** is the primary driver of liquidity failure. T-bills provide backing but not immediate liquidity. This is exactly what GENIUS Act and MiCA regulations aim to prevent with maturity limits (93 days max).

### ACTUS Official References

- https://www.actusfrf.org/taxonomy (PAM contract type)
- https://www.actusfrf.org/dictionary (attribute definitions)
- https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM
- https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_CSH
