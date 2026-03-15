# Converge.fi V4 — Demo Script

## Overview

3-phase demo: MINT → HALT → RESTORE using Chainlink CRE + ACTUS + GENIUS Act compliance.

## Deployed Contracts (Ethereum Sepolia)

| Contract | Address |
|----------|---------|
| MultiAttributeRiskPolicy | `0x61dc9d5904094829fFcBAf7f1970b9d387Dc1d71` |
| MultiAttributeConvergeRiskConsumer | `0x904b5C81705918b4B00439468a7e1d97dF2b6934` |
| ConvergeStablecoin (cvUSD) | `0x19b6B9434D077DF9DFcE82be3568b4c0B39e6568` |
| MockKeystoneForwarder (shared) | `0x15fC6ae953E024d975e77382eEeC56A9101f9F88` |

## 8 Risk Metrics (all uint16, 256 bytes on-chain)

| Field | Scale | Regulatory basis |
|-------|-------|-----------------|
| backingPct | Integer % (490 = 490%) | GENIUS Act §4(a)(1): ≥100% |
| liquidityPct | Integer % (69 = 69%) | MiCA Art.54: ≥30% |
| riskScore | 0-100 (0 = safe) | Composite: ≤70 |
| maturityGapDays | WAM days | GENIUS Act: ≤93d Treasuries |
| assetEligibilityPct | 0-100 (100 = all eligible) | GENIUS Act §4(a)(1)(A): =100% |
| custodianDiversityScore | 0-100 (80 = diversified) | SVB lesson + MiCA Art.37 |
| timestamp | Unix seconds | Staleness: ≤86400s |
| scenarioId | keccak256 hash | Audit trail |

## 4 Hard Gates (on-chain in isHealthy())

- backing ≥ 100%
- liquidity ≥ 30%
- riskScore ≤ 70
- eligibility = 100%

## Phase A — The Gold Standard ✅

**Portfolio:** $340K cash (5 FDIC-insured banks × $68K) + $150K T-bills (14d + 28d) = $490K
**Supply:** 100K tokens

| Metric | Value | Gate |
|--------|-------|------|
| backingPct | 490% | ✅ ≥100 |
| liquidityPct | 69% | ✅ ≥30 |
| riskScore | **0** | ✅ ≤70 |
| assetEligibilityPct | 100% | ✅ =100 |
| custodianDiversityScore | 80 | — |
| wamDays | 21 | — |
| **mintGate** | **OPEN** | |

**Narrative:** All reserves GENIUS-eligible. Cash across 5 banks (SVB lesson). Both T-bills under 93-day limit. Risk score zero — every factor at safe floor.

## Phase B — Three Violations, One Backing Pass 🔴

**Changes:** Cash drained from 3 banks. Operator bought $120K corporate bond (NOT GENIUS-permitted). Supply doubled to 200K.

| Metric | Value | Gate |
|--------|-------|------|
| backingPct | 140% | ✅ ≥100 |
| liquidityPct | 4% | ❌ <30 |
| riskScore | **71** | ❌ >70 |
| assetEligibilityPct | 57% | ❌ <100 |
| custodianDiversityScore | 50 | — |
| wamDays | 174 | — |
| **mintGate** | **CLOSED** | **3 gates fail** |

**Narrative:** Simple backing check shows 140% — PASS. But Converge.fi catches THREE violations: liquidity crash (4%), ineligible assets (43% in corp bonds), and composite risk score 71. A basic 1:1 check would approve this mint.

## Phase C — Recovery With Scars ✅

**Changes:** Corp bond sold at 5% loss ($120K → $114K cash). $90K emergency injection. All reserves now GENIUS-eligible.

| Metric | Value | Gate |
|--------|-------|------|
| backingPct | 182% | ✅ ≥100 |
| liquidityPct | 59% | ✅ ≥30 |
| riskScore | **9** | ✅ ≤70 |
| assetEligibilityPct | 100% | ✅ =100 |
| custodianDiversityScore | 54 | — |
| wamDays | 21 | — |
| **mintGate** | **OPEN** | |

**Narrative:** Operator corrected both mistakes. Score is 9, not zero — custodial diversity still at 54 (below 80 safe floor). The $114K bond sale proceeds and $90K injection landed at only 2 accounts. System says: approved, but rebalance your custodians.

## Demo Commands

```powershell
# Terminal 1: ACTUS server on 8082+8083
# Terminal 2: Express server
cd converge.fi-1/risk-engine && npm run dev

# Terminal 3: CRE workflow
cd converge.fi-1
cre workflow simulate workflows/risk-monitoring --target demo-A --broadcast
Start-Sleep -Seconds 5
cre workflow simulate workflows/risk-monitoring --target demo-B --broadcast
Start-Sleep -Seconds 5
cre workflow simulate workflows/risk-monitoring --target demo-C --broadcast

# Browser verification
http://localhost:3001/api/demo/health-check           # Phase A
http://localhost:3001/api/demo/health-check?phase=B    # Phase B
http://localhost:3001/api/demo/health-check?phase=C    # Phase C

# CLI verification
cd iter-fin-demo-2
node demo-runner.js --phase A
node demo-runner.js --phase B
node demo-runner.js --phase C
```
