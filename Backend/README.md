# RiskStableCoin Verifier

## Overview
A simplified stablecoin risk verification system that validates liquidity, backing ratio, and other compliance metrics by interfacing with an ACTUS server.

## Features
- **Backing Ratio Verification**: Validates that reserve assets meet or exceed outstanding token obligations
- **Liquidity Ratio Verification**: Ensures sufficient liquid assets for operational requirements
- **Concentration Risk Assessment**: Checks diversification across asset categories
- **Quality Metrics Validation**: Evaluates asset quality based on liquidity scores, credit ratings, and maturity profiles
- **ACTUS Server Integration**: Fetches real-time contract cash flow data

## Architecture
- **No ZK Programs**: Direct verification without zero-knowledge cryptography
- **No Network Implementation**: Standalone verification without blockchain integration
- **CLI-Based**: Command-line interface for easy threshold configuration

## Directory Structure
```
RiskStableCoin/
├── README.md                 # This file
├── todo.md                   # Project requirements
├── src/
│   ├── index.ts             # Main entry point (CLI)
│   ├── verifier/
│   │   └── StableCoinVerifier.ts    # Core verification logic
│   ├── api/
│   │   └── ACTUSClient.ts           # ACTUS server client
│   ├── types/
│   │   └── index.ts                 # TypeScript interfaces
│   └── utils/
│       ├── metrics.ts               # Metric calculation utilities
│       └── validation.ts            # Data validation utilities
├── config/
│   └── portfolio.example.json       # Example portfolio configuration
├── package.json
└── tsconfig.json
```

## Requirements
- Node.js >= 18.x
- TypeScript >= 5.x
- ACTUS server running (default: http://localhost:8083/eventsBatch)

## Installation
```bash
npm install
```

## Usage

### Command Line Interface
```bash
npm run verify -- \
  --backingRatio 100 \
  --liquidityRatio 20 \
  --concentrationLimit 25 \
  --qualityThreshold 80 \
  --actusUrl http://localhost:8083/eventsBatch \
  --portfolio ./config/portfolio.json
```

### Parameters
- `--backingRatio`: Minimum backing ratio threshold (default: 100%)
- `--liquidityRatio`: Minimum liquidity ratio threshold (default: 20%)
- `--concentrationLimit`: Maximum concentration risk limit (default: 25%)
- `--qualityThreshold`: Minimum asset quality threshold (default: 80)
- `--actusUrl`: ACTUS server endpoint URL
- `--portfolio`: Path to portfolio configuration JSON file

## Example Output
```
🎯 StableCoin Risk Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Configuration:
   Backing Ratio Threshold: 100%
   Liquidity Ratio Threshold: 20%
   Concentration Limit: 25%
   Quality Threshold: 80

🌐 Fetching ACTUS data...
✅ Retrieved data for 12 periods

📈 Calculating Metrics:
   Average Backing Ratio: 105.2%   ✅ PASS
   Average Liquidity Ratio: 28.5%  ✅ PASS
   Max Concentration Risk: 18.3%   ✅ PASS
   Asset Quality Score: 85.7       ✅ PASS

🎉 StableCoin Verification: COMPLIANT
```

## Portfolio Configuration Format
```json
{
  "portfolioMetadata": {
    "portfolioId": "STABLE_001",
    "totalNotional": 1000000,
    "currency": "USD"
  },
  "contracts": [
    {
      "contractType": "PAM",
      "contractID": "ASSET_001",
      "contractRole": "RPA",
      "statusDate": "2025-01-01T00:00:00",
      "notionalPrincipal": "500000",
      "currency": "USD",
      "reserveType": "cash",
      "liquidityScore": 100
    }
  ]
}
```

## Contract Attributes
- `reserveType`: Asset category (cash, treasury, corporate, other)
- `liquidityScore`: Liquidity rating (0-100)
- `creditRating`: Credit quality rating (0-100)
- `maturityDays`: Days to maturity

## Verification Logic

### 1. Backing Ratio
```
Backing Ratio = (Total Reserve Assets / Outstanding Tokens) × 100
Compliant if: Backing Ratio >= Backing Ratio Threshold
```

### 2. Liquidity Ratio
```
Liquidity Ratio = (Highly Liquid Assets / Outstanding Tokens) × 100
Compliant if: Liquidity Ratio >= Liquidity Ratio Threshold
```

### 3. Concentration Risk
```
Concentration Risk = max(Asset Category %) across all categories
Compliant if: Concentration Risk <= Concentration Limit
```

### 4. Asset Quality
```
Quality Score = Weighted average of (Liquidity, Credit, Maturity)
Compliant if: Quality Score >= Quality Threshold
```

## Development

### Build
```bash
npm run build
```

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run type-check
```

## References
Based on implementation patterns from:
- `zk-pret-test-v3.7/src/impl/local/handler/RiskBasel3LocalHandler.ts`
- `zk-pret-test-v3.7/src/impl/local/verifier/RiskBasel3LocalMultiVerifier.ts`

## License
MIT
