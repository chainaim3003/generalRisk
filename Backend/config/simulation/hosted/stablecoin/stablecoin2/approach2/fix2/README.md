# Approach 2 — Fix 2: Three-Iteration Convergence

## Background

Fix 1 corrected the PP sign convention bug and revealed that 2 iterations are insufficient:

| Iteration | Redemptions | Supply Remaining | Days Active | Delta |
|-----------|-------------|-----------------|-------------|-------|
| Iter 1 | $66,151.71 | $33,848.29 | 13 (Mar 2-14) | — |
| Iter 2 | $99,811.76 | $188.24 | 29 (Mar 2-30) | $33,660 (50.9%) |

Fix 2 adds Iteration 3 to verify convergence.

## Hypothesis

Iter 2 burned 99.8% of supply ($100K → $188). The Iter 3 cash index (built from Iter 2 redemptions) will be very similar to the Iter 2 cash index, since both show near-total supply exhaustion. Therefore Iter 3 PP events should closely match Iter 2, achieving convergence.

## What Changed From Fix 1

Fix 2 keeps Phases 1-7 identical to Fix 1 and adds:

| Phase | Purpose | New IDs |
|-------|---------|---------|
| 8 | Feedback Iter 2 → Iter 3: rebuild cash/reserves indexes | SC_CASH_DYN_I3, SC_RESERVES_DYN_I3 |
| 9 | BackingRatioModel + Scenario for Iter 3 | br_seq_100k_i3, sc_seq_iter3_100k |
| 10 | Run Liability Iter 3 | StableCoin-100K-Liability-I3 |
| 11 | Three-iteration convergence check + final dashboard | — |

## Expected Result

Phase 11 convergence check should show:
- Δ(Iter1→2) = ~$33,660 (50.9%) — large, not converged
- Δ(Iter2→3) = small (< $500) — converged

The dashboard (Phase 11.2) uses Iter 3 as the "best estimate" of actual protocol behavior.

## Run

Import `Approach2-SequentialFeedback-MultiContract-100K-30d-fix2.json` into Postman, open Console (Ctrl+Alt+C), run collection in sequence.

```bash
newman run Approach2-SequentialFeedback-MultiContract-100K-30d-fix2.json \
  --env-var "actus_risk_host=34.203.247.32:8082" \
  --env-var "actus_sim_host=34.203.247.32:8083"
```
