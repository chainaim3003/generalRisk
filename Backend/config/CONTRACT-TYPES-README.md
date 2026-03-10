# ACTUS Contract Type Examples - StableRisk

This folder contains comprehensive examples of all 5 ACTUS contract types used in stablecoin reserve verification.

## 📁 Files Overview

### Contract Type Examples (Individual)
- `contract-type-PAM-examples.json` - Principal at Maturity contracts
- `contract-type-ANN-examples.json` - Annuity contracts
- `contract-type-NAM-examples.json` - Negative Amortizer contracts
- `contract-type-LAM-examples.json` - Linear Amortizer contracts
- `contract-type-CLM-examples.json` - Call Money contracts

### Comprehensive Examples
- `contract-type-MIXED-all-types.json` - Real-world portfolio combining all 5 types

### Pre-configured Portfolios
- `portfolio-balanced-1M.json` - Balanced $1M reserve
- `portfolio-conservative-10M.json` - Conservative $10M reserve
- `portfolio-aggressive-8M.json` - Aggressive $8M reserve
- `portfolio-diversified-5M.json` - Diversified $5M reserve

---

## 🎯 Contract Type Guide

### 1. **PAM (Principal at Maturity)**
**File:** `contract-type-PAM-examples.json`

**How it works:**
- Interest paid periodically
- Principal returned at maturity
- No principal payments during life of contract

**Best for:**
- Treasury Bills
- Zero-Coupon Bonds
- Time Deposits
- Commercial Paper
- Certificate of Deposits (CDs)

**Cash Flow Pattern:**
```
Period 1: Interest only
Period 2: Interest only
Period 3: Interest only
Maturity: Interest + Full Principal
```

**Key Fields:**
- `cycleOfInterestPayment`: How often interest is paid (P1M = monthly, P3M = quarterly, P6M = semi-annual)
- `nominalInterestRate`: Annual interest rate (0.0425 = 4.25%)
- `maturityDate`: When principal is returned

---

### 2. **ANN (Annuity)**
**File:** `contract-type-ANN-examples.json`

**How it works:**
- Regular payments include BOTH principal and interest
- Total payment stays the same
- Interest portion decreases, principal portion increases over time

**Best for:**
- Mortgages
- Auto Loans
- Personal Loans
- Amortizing Bonds
- Equipment Financing

**Cash Flow Pattern:**
```
Period 1: $1000 (Interest $50 + Principal $950)
Period 2: $1000 (Interest $45 + Principal $955)
Period 3: $1000 (Interest $40 + Principal $960)
Maturity: $1000 (Interest $5 + Principal $995)
```

**Key Fields:**
- `cycleOfPrincipalRedemption`: How often principal is paid
- `cycleOfInterestPayment`: How often interest is paid (usually same as principal)
- `nextPrincipalRedemptionPayment`: Amount of principal in each payment

---

### 3. **NAM (Negative Amortizer)**
**File:** `contract-type-NAM-examples.json`

**How it works:**
- Payments are LESS than interest due
- Unpaid interest is added to principal
- Principal GROWS over time
- Higher risk, higher potential return

**Best for:**
- Deferred Interest Loans
- Payment Option ARMs
- Growing Equity Mortgages
- Subordinated Debt with capitalization

**Cash Flow Pattern:**
```
Start: Principal $100,000
Period 1: Pay $300, Owe $500 interest → Principal becomes $100,200
Period 2: Pay $300, Owe $501 interest → Principal becomes $100,401
Period 3: Pay $300, Owe $502 interest → Principal becomes $100,603
Maturity: Pay full grown principal
```

**Key Fields:**
- `cycleOfInterestCapitalization`: How often unpaid interest is added to principal
- `capitalizationEndDate`: When capitalization stops
- `interestCalculationBase`: "NT" = Notional (growing principal)

**⚠️ Warning:** Higher liquidity risk, lower credit quality. Use sparingly in stablecoin reserves.

---

### 4. **LAM (Linear Amortizer)**
**File:** `contract-type-LAM-examples.json`

**How it works:**
- FIXED principal payment each period
- Interest calculated on remaining balance (decreases over time)
- Total payment decreases over time

**Best for:**
- Commercial Real Estate Loans
- Construction Loans
- Asset-Backed Securities
- Equipment Financing with scheduled principal

**Cash Flow Pattern:**
```
Period 1: $1050 (Principal $1000 + Interest $50)
Period 2: $1045 (Principal $1000 + Interest $45)
Period 3: $1040 (Principal $1000 + Interest $40)
Maturity: $1005 (Principal $1000 + Interest $5)
```

**Key Fields:**
- `nextPrincipalRedemptionPayment`: Fixed principal amount per period
- `cycleOfPrincipalRedemption`: How often principal is paid
- `cycleOfInterestPayment`: How often interest is paid

---

### 5. **CLM (Call Money)**
**File:** `contract-type-CLM-examples.json`

**How it works:**
- NO fixed maturity date
- Can be called/withdrawn anytime
- Highest liquidity
- Usually lowest interest rate

**Best for:**
- Overnight Deposits
- Money Market Funds
- Demand Deposits
- Repo Agreements
- Revolving Credit Facilities

**Cash Flow Pattern:**
```
Daily: Interest accrues
Anytime: Can withdraw full principal + accrued interest
No fixed schedule: Maximum flexibility
```

**Key Fields:**
- `cycleOfInterestPayment`: Usually "P1D" (daily) or "P1M" (monthly)
- `maturityDate`: Often set far in future as placeholder
- Interest compounds based on daily balance

**✅ Ideal for:** Emergency liquidity buffer in stablecoin reserves

---

## 🏦 Reserve Type Classification

Each asset contract has a `reserveType` field:

| Reserve Type | Typical Liquidity | Typical Credit | Examples |
|--------------|-------------------|----------------|----------|
| **cash** | 95-100 | 90-100 | Overnight deposits, Money market funds, T-Bills (< 30 days) |
| **treasury** | 85-98 | 95-100 | US Treasury securities, Government bonds, T-Bills (> 30 days) |
| **corporate** | 60-85 | 70-95 | Corporate bonds, Commercial paper, Asset-backed securities |
| **other** | 40-75 | 60-85 | Municipal bonds, Foreign bonds, Alternative assets |

---

## 📊 Quality Metrics Explained

### Liquidity Score (0-100)
**What it measures:** How quickly the asset can be converted to cash without loss

- **90-100:** Can sell today at market price (cash, overnight deposits)
- **80-89:** Can sell within 1 week with minimal discount (T-Bills, AAA bonds)
- **70-79:** Can sell within 1 month with small discount (Investment grade corporates)
- **60-69:** May take 1-3 months to sell (Lower grade bonds)
- **< 60:** Illiquid, may take months or require significant discount

### Credit Rating (0-100)
**What it measures:** Risk of default or loss of principal

- **95-100:** AAA/Aaa - Virtually no default risk (US Treasuries)
- **90-94:** AA/Aa - Very low default risk (Top corporates)
- **85-89:** A/A - Low default risk (Investment grade)
- **80-84:** BBB/Baa - Moderate risk (Lower investment grade)
- **70-79:** BB/Ba - Higher risk (Junk bonds)
- **< 70:** High default risk

### Maturity Days
**What it measures:** Time until principal is due back

- **0:** Available immediately (demand deposits, call money)
- **1-30:** Ultra short-term (overnight to 1 month)
- **31-90:** Short-term (1-3 months)
- **91-180:** Medium-short (3-6 months)
- **181-365:** Medium-term (6 months to 1 year)
- **365+:** Long-term (over 1 year)

---

## 🎯 How to Use These Examples

### Option 1: File Upload in Frontend
1. Copy any example JSON file
2. Go to StableRisk frontend → **File Upload** mode
3. Upload the JSON file
4. Select regulatory framework (EU MiCA / US GENIUS)
5. Adjust thresholds if using Custom
6. Click **"Run Verification"**

### Option 2: Manual Input Reference
1. Open any example file
2. Use it as a template for manual input
3. Copy field values into the manual input form
4. Create contracts one by one
5. Run verification

### Option 3: API Testing
```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d @contract-type-PAM-examples.json
```

---

## 🔬 Test Scenarios

The `test-scenarios/` folder contains 16 pre-built scenarios testing different compliance outcomes:

| Scenario | Backing | Liquidity | Concentration | Quality | Result |
|----------|---------|-----------|---------------|---------|--------|
| 01 | ✅ | ✅ | ✅ | ✅ | All Pass |
| 02 | ✅ | ✅ | ✅ | ❌ | Quality Fail |
| 03 | ✅ | ✅ | ❌ | ✅ | Concentration Fail |
| 16 | ❌ | ❌ | ❌ | ❌ | All Fail |

---

## 💡 Real-World Portfolio Construction Tips

### 1. **Liquidity Ladder Strategy**
```
40% CLM (Call Money) - Immediate liquidity
30% PAM (T-Bills, < 3 months) - Short-term buffer
20% ANN/LAM (Amortizing) - Predictable cash flows
10% PAM (Corporates, > 6 months) - Yield enhancement
```

### 2. **Credit Quality Mix**
```
50% Treasury/Cash (credit rating 95+)
35% Investment Grade Corporate (credit rating 85-94)
15% Lower Grade / Other (credit rating 70-84)
```

### 3. **Contract Type Diversification**
```
CLM: 25% - Emergency liquidity
PAM: 40% - Core holdings
ANN: 20% - Steady cash flows
LAM: 10% - Scheduled returns
NAM: 5% - Growth/yield (if appropriate)
```

### 4. **Maturity Distribution**
```
0-30 days: 30% (immediate redemptions)
31-90 days: 25% (short-term stability)
91-180 days: 20% (medium-term)
181-365 days: 15% (yield optimization)
1+ years: 10% (strategic positioning)
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't:
1. Use all PAM contracts (no liquidity diversity)
2. Put 100% in one reserve type (concentration risk)
3. Set all maturities on same date (rollover risk)
4. Use NAM heavily in stablecoin reserves (growing principal = growing risk)
5. Forget to add liability contracts (tokens issued)
6. Set liquidityScore and creditRating to unrealistic values
7. Use future dates for statusDate

### ✅ Do:
1. Mix contract types for diverse cash flows
2. Maintain 30%+ in cash/treasury for liquidity
3. Stagger maturity dates across time periods
4. Match assets >= liabilities for backing ratio
5. Keep concentration under 40% in any single reserve type
6. Set realistic scores based on actual asset quality
7. Use current or past dates for statusDate

---

## 📚 Additional Resources

- **ACTUS Standard:** https://www.actusfrf.org/
- **Contract Type Specifications:** See ACTUS documentation
- **StableRisk Documentation:** See `/docs` folder
- **Regulatory Frameworks:**
  - EU MiCA: https://eur-lex.europa.eu/
  - US GENIUS Act: (Hypothetical example)

---

## 🤝 Support

For questions or issues:
1. Check existing examples in this folder
2. Review test scenarios for edge cases
3. Consult ACTUS documentation for field specifications
4. Refer to StableRisk API documentation

---

**Last Updated:** February 2025  
**Version:** 1.0.0  
**Maintained by:** StableRisk Team
