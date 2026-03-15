# Approach 2 — Fix 1: PP Sign Convention

## Bug

ACTUS PAM contracts with `contractRole=RPA` return PP (prepayment/redemption) payoffs as **positive** values:

```
PP payoff=$14,000.00   ← positive = $14K supply burned, cash outflow to redeemer
PP payoff=$11,200.00   ← positive = $11.2K supply burned
```

The original Approach 2 scripts checked `pp.payoff < 0` to detect redemptions. Since all PP payoffs are positive, **zero** redemptions were detected. This caused:

1. Phase 6 subtracted $0 in redemptions → SC_CASH_DYN_I2 = SC_CASH_DYN_I1 (identical)
2. Iter 2 ran against the same indexes as Iter 1
3. Iter 2 produced identical PP events
4. Convergence = perfect 0 delta (fake — no feedback was actually applied)

## Fix Applied in 5 Locations

| # | Phase | File Section | Old Code | Fixed Code |
|---|-------|-------------|----------|------------|
| 1 | Phase 5 test | Iter 1 totalRedemptions | `if(pp.payoff < 0) totalRedemptions += Math.abs(pp.payoff)` | `if(pp.payoff > 0) totalRedemptions += pp.payoff` |
| 2 | Phase 6.1 pre-request | redemptionsByDate filter | `if(pp.payoff < 0)` + `Math.abs()` | `if(pp.payoff > 0)` (already positive) |
| 3 | Phase 7 test | Iter 2 totalRedemptionsI2 | `if(pp.payoff < 0) totalRedemptionsI2 += Math.abs(pp.payoff)` | `if(pp.payoff > 0) totalRedemptionsI2 += pp.payoff` |
| 4 | Phase 8.1 test | Convergence totals | `if(pp.payoff < 0) totalI1 += Math.abs(pp.payoff)` | `if(pp.payoff > 0) totalI1 += pp.payoff` |
| 5 | Phase 8.2 test | Dashboard redemptions + supply | `e.payoff < 0` + `supply += negative` | `e.payoff > 0` + `supply -= positive` |

## Expected Result After Fix

Phase 6 should now detect ~$66,152 in cumulative Iter 1 redemptions:

```
Mar 2:  $14,000
Mar 3:  $11,200
Mar 4:   $8,960
...
Mar 14:    $962
Total: ~$66,152
```

The Iter 2 cash index should then show:

```
Mar 1:  $6,000   (unchanged — no redemptions yet)
Mar 2:  $6,000 - $14,000 = $0   (clamped, cash goes negative → protocol stress)
Mar 15: $30,500 - $66,152 = $0  (still underwater even after TBill-A matures)
```

This will cause the BackingRatioModel in Iter 2 to see much lower reserves, potentially changing the PP event profile — which is the whole point of the feedback loop.

## Run

Import `Approach2-SequentialFeedback-MultiContract-100K-30d-fix1.json` into Postman, open Console (Ctrl+Alt+C), run collection in sequence.

Or via Newman:
```bash
newman run Approach2-SequentialFeedback-MultiContract-100K-30d-fix1.json \
  --env-var "actus_risk_host=34.203.247.32:8082" \
  --env-var "actus_sim_host=34.203.247.32:8083"
```
