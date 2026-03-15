# Approach 3 — iter2: Event Parsing Fix

## What Changed from iter1

**Root cause:** iter1 test scripts looked for `IED` (Initial Exchange Date) events to extract contract notional values. But the ACTUS server does NOT generate IED events when `statusDate == initialExchangeDate` — it only returns `IP` + `MD` events.

**Actual ACTUS server response (iter1 run):**
```
cash-reserve-001:  IP (nominalValue=12000, payoff=0) → MD (nominalValue=0, payoff=12000)
tbill-4wk-001:     IP (nominalValue=20000, payoff=0) → MD (nominalValue=0, payoff=20000)
```

**iter1 bug:** `if (e.type === 'IED')` never matched → `notional = 0` for all contracts → `$0` reserves

**iter2 fix — 3-level fallback extraction:**
```javascript
// Priority 1: IP event nominalValue (outstanding principal)
if (e.type === 'IP' && e.nominalValue > 0) notional = e.nominalValue;
// Priority 2: IED event (if ACTUS ever returns it)
if (e.type === 'IED') notional = Math.abs(e.payoff || e.nominalValue);
// Priority 3: MD event payoff (maturity repayment)
if (notional === 0 && e.type === 'MD' && e.payoff > 0) notional = e.payoff;
```

## ACTUS Event Types for PAM (zero-coupon, statusDate == initialExchangeDate)

| Event | Field | Contains |
|-------|-------|----------|
| IP (Interest Payment) | `nominalValue` | Outstanding principal (e.g., 12000) |
| IP (Interest Payment) | `payoff` | Interest payment amount (0 for zero-coupon) |
| MD (Maturity Date) | `payoff` | Principal repayment at maturity (e.g., 12000) |
| MD (Maturity Date) | `nominalValue` | 0 (principal fully repaid) |

**IED is NOT generated** because the contract is already past its initial exchange point at `statusDate`.

## Expected iter2 Results

### Phase 1 — Baseline (Day 1)
```
Total Reserves:    $100,000
Cash Reserves:     $22,000
T-Bill Reserves:   $78,000
Token Supply:      $100,000
Backing Ratio:     100.0%  ✅
Liquidity Ratio:   22.0%   ✅
MINT STATUS:       ALLOWED ✅
```

### Phase 2 — Stress (Day 8)
```
Total Reserves:    $82,000
Cash Reserves:     $4,000
T-Bill Reserves:   $78,000
Token Supply:      $82,000
Backing Ratio:     100.0%  ✅
Liquidity Ratio:   4.9%    🚫 ← FAILS
MINT STATUS:       HALTED 🛑
```

### Phase 3 — Recovery (Day 28)
```
Total Reserves:    $82,000
Cash Reserves:     $24,000
T-Bill Reserves:   $58,000
Token Supply:      $82,000
Backing Ratio:     100.0%  ✅
Liquidity Ratio:   29.3%   ✅
MINT STATUS:       ALLOWED ✅ (restored)
```

## Files

- `Approach3-EventsBatch-MultiContract-100K-30d-iter2.json` — Postman collection (fixed)
- `README.md` — This file

## Prerequisites

- actus-server on `localhost:8083` (no risksrv3 needed)
