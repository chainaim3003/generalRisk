# 📋 ACTUS Contract Types - Quick Reference

## One-Line Summaries

| Type | Name | Cash Flow | Best For |
|------|------|-----------|----------|
| **PAM** | Principal at Maturity | Interest only → Principal at end | T-Bills, Deposits, Zero-coupon bonds |
| **ANN** | Annuity | Equal payments (principal + interest) | Mortgages, Auto loans, Personal loans |
| **NAM** | Negative Amortizer | Payment < Interest → Principal grows | Deferred loans, Payment option ARMs |
| **LAM** | Linear Amortizer | Fixed principal + decreasing interest | Commercial real estate, Construction loans |
| **CLM** | Call Money | No fixed maturity, callable anytime | Overnight deposits, Money market, Repos |

---

## Essential ACTUS Fields (Required for All)

```json
{
  "contractType": "PAM|ANN|NAM|LAM|CLM",
  "contractID": "unique-identifier",
  "contractRole": "RPA (Asset) | RPL (Liability)",
  "contractDealDate": "2025-02-01T00:00:00",
  "initialExchangeDate": "2025-02-01T00:00:00",
  "statusDate": "2025-02-14T00:00:00",
  "notionalPrincipal": "1000000",
  "maturityDate": "2026-02-01T00:00:00",
  "nominalInterestRate": "0.0450",
  "currency": "USD",
  "dayCountConvention": "A365|A360|30E360|30360"
}
```

## StableRisk-Specific Fields (For Assets Only)

```json
{
  "reserveType": "cash|treasury|corporate|other",
  "liquidityScore": 90,    // 0-100
  "creditRating": 85,      // 0-100
  "maturityDays": 90       // Days to maturity
}
```

---

## Type-Specific Required Fields

### PAM (Principal at Maturity)
```json
{
  "cycleAnchorDateOfInterestPayment": "2025-05-01T00:00:00",
  "cycleOfInterestPayment": "P3M"  // P1M=monthly, P3M=quarterly, P6M=semi-annual
}
```

### ANN (Annuity)
```json
{
  "cycleOfPrincipalRedemption": "P1M",
  "cycleOfInterestPayment": "P1M",
  "nextPrincipalRedemptionPayment": "50000"
}
```

### NAM (Negative Amortizer)
```json
{
  "cycleOfInterestPayment": "P1M",
  "cycleOfInterestCapitalization": "P1M",
  "interestCalculationBase": "NT",
  "capitalizationEndDate": "2027-02-01T00:00:00"
}
```

### LAM (Linear Amortizer)
```json
{
  "cycleOfPrincipalRedemption": "P3M",
  "cycleOfInterestPayment": "P1M",
  "nextPrincipalRedemptionPayment": "100000"
}
```

### CLM (Call Money)
```json
{
  "cycleOfInterestPayment": "P1D"  // Usually daily
  // No other required fields beyond base
}
```

---

## Cycle Period Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `P1D` | 1 Day | Daily interest (CLM) |
| `P1W` | 1 Week | Weekly payments |
| `P1M` | 1 Month | Monthly payments/interest |
| `P3M` | 3 Months | Quarterly |
| `P6M` | 6 Months | Semi-annual |
| `P1Y` | 1 Year | Annual |

---

## Day Count Conventions

| Code | Name | Usage |
|------|------|-------|
| `A365` | Actual/365 | Most common for USD |
| `A360` | Actual/360 | Money markets, short-term |
| `30360` | 30/360 US | Corporate bonds |
| `30E360` | 30E/360 | Eurobonds |
| `AA` | Actual/Actual | Government bonds |

---

## Reserve Type Guidelines

### Cash (liquidityScore: 95-100, creditRating: 95-100)
- Overnight deposits
- Money market funds
- T-Bills < 30 days
- Demand deposits

### Treasury (liquidityScore: 85-98, creditRating: 95-100)
- US Treasury securities
- Government bonds
- T-Bills > 30 days
- Agency securities

### Corporate (liquidityScore: 60-85, creditRating: 70-95)
- Investment grade corporate bonds
- Commercial paper
- Asset-backed securities
- High-quality private debt

### Other (liquidityScore: 40-75, creditRating: 60-85)
- Municipal bonds
- Foreign bonds
- Lower-grade corporates
- Alternative assets

---

## Typical Stablecoin Portfolio Mix

### Conservative (Low Risk)
```
60% Cash (CLM + PAM short-term)
30% Treasury (PAM medium-term)
10% Corporate (ANN/LAM high-grade)
```

### Balanced (Medium Risk)
```
40% Cash (CLM + PAM short-term)
35% Treasury (PAM mixed terms)
25% Corporate (ANN/LAM/PAM mixed)
```

### Aggressive (Higher Yield)
```
20% Cash (CLM)
30% Treasury (PAM longer-term)
45% Corporate (PAM/ANN/LAM)
5% Other (NAM growth instruments)
```

---

## Regulatory Thresholds (Quick Reference)

### EU MiCA
- Backing Ratio: ≥100%
- Liquidity Ratio: ≥30%
- Concentration Limit: ≤30%
- Asset Quality: ≥85

### US GENIUS Act
- Backing Ratio: ≥100%
- Liquidity Ratio: ≥20%
- Concentration Limit: ≤40%
- Asset Quality: ≥80

---

## Quick File Upload Test

**Simplest Valid Portfolio:**
```json
{
  "portfolioMetadata": {
    "portfolioId": "TEST_001",
    "totalNotional": 1000000,
    "currency": "USD"
  },
  "contracts": [
    {
      "contractType": "PAM",
      "contractID": "ASSET_001",
      "contractRole": "RPA",
      "contractDealDate": "2025-02-01T00:00:00",
      "initialExchangeDate": "2025-02-01T00:00:00",
      "statusDate": "2025-02-14T00:00:00",
      "notionalPrincipal": "1000000",
      "maturityDate": "2026-02-01T00:00:00",
      "nominalInterestRate": "0.0400",
      "currency": "USD",
      "dayCountConvention": "A365",
      "reserveType": "cash",
      "liquidityScore": 95,
      "creditRating": 90
    },
    {
      "contractType": "PAM",
      "contractID": "LIABILITY_001",
      "contractRole": "RPL",
      "contractDealDate": "2025-02-01T00:00:00",
      "initialExchangeDate": "2025-02-01T00:00:00",
      "statusDate": "2025-02-14T00:00:00",
      "notionalPrincipal": "1000000",
      "maturityDate": "2026-02-01T00:00:00",
      "nominalInterestRate": "0.0000",
      "currency": "USD",
      "dayCountConvention": "A365"
    }
  ]
}
```

**Expected Result:** ✅ All checks PASS

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "ACTUS returned 0 periods" | Missing required fields | Add cycleOfInterestPayment |
| "Cannot read 'total'" | Wrong reserveType case | Use lowercase: cash, treasury, corporate, other |
| "Backing ratio 0%" | No liabilities | Add RPL contract |
| "Concentration risk 100%" | All one reserve type | Diversify reserve types |
| "Invalid date format" | Wrong date format | Use ISO format: 2025-02-01T00:00:00 |

---

## 🔗 File Examples

- **Single Type Examples:** `contract-type-{PAM|ANN|NAM|LAM|CLM}-examples.json`
- **All Types Mixed:** `contract-type-MIXED-all-types.json`
- **Pre-built Portfolios:** `portfolio-{balanced|conservative|aggressive|diversified}-*.json`
- **Test Scenarios:** `test-scenarios/scenario-*.json`

---

**Pro Tip:** Start with `portfolio-balanced-1M.json` and modify from there!
