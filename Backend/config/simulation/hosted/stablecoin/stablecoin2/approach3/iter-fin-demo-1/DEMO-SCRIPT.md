# Converge.fi — 2-Minute Demo Script
## MINT → HALT → RESTORE with Real ACTUS Contracts + On-Chain Mint Gate

---

## COMPELLING NARRATIVE (voiceover)

> "Today, stablecoin issuers check one number: total reserves versus total supply.
> If reserves are $515K and supply is $500K — green light, mint more tokens.
>
> But here's what that check misses: $385K of those reserves could be locked in
> Treasury Bills that don't mature for months. Only $130K is actual cash. If 30%
> of holders redeem tomorrow, the issuer can't pay. The coin is 103% BACKED but
> the maturity mismatch makes it fragile. That's how stablecoins break.
>
> Converge.fi brings deep TradFi reserve management into stablecoin infrastructure.
> We model every reserve contract — cash positions, T-bills at different maturities —
> as ACTUS financial contracts. An ISO-grade standard used by central banks.
> We run a FORWARD-LOOKING simulation that shows WHEN each dollar becomes available.
>
> Three concurrent health checks run on every CRE cron cycle:
>   1. Backing Ratio — are total reserves ≥ 100% of supply? (GENIUS Act / MiCA)
>   2. Liquidity Ratio — is immediate cash ≥ 10% of reserves? (MiCA Art.45)
>   3. Risk Score — composite of concentration, maturity, quality.
>
> All three must pass. Any failure → minting blocked on-chain via ACE policies.
>
> Now watch it work."

---

## PREREQUISITES

```
1. ACTUS Simulation Engine running on 34.203.247.32:8083
2. Node.js 18+ (for native fetch)
3. converge.fi-1 Hardhat project compiled
4. .env configured with SEPOLIA_RPC_URL, PRIVATE_KEY, contract addresses
5. Sepolia ETH in wallet (~0.02 ETH for gas across 3 phases)
```

---

## EXACT STEPS

### Phase A: HEALTHY → Mint $100,000 cvUSD ✅

```powershell
# Terminal: Navigate to demo directory
cd C:\SATHYA\CHAINAIM3003\mcp-servers\ACTUS-LOCAL-EXT\actus-risk-service-extension1\actus-riskservice\simulations\local\stablecoin\stablecoin2\approach3\iter-fin-demo-1

# Ensure override is inactive
type reserve_overrides.json
# Should show: "overrideActive": false

# Run the health check — shows MATURITY LADDER + ACTUS EVENTS + HEALTH
node demo-runner.js

# Push healthy report on-chain
cd C:\SATHYA\CHAINAIM3003\mcp-servers\CRE\CRE1\converge.fi-1
$env:REPORT_MODE="demo-healthy"; npx hardhat run scripts/push-report.ts --network sepolia

# Mint $100,000 cvUSD
npx hardhat console --network sepolia
> const s = await ethers.getContractAt("ConvergeStablecoin", "0x8D8131547Ec5Cb2fF1bB941a28fA20e347A928F3")
> const [w] = await ethers.getSigners()
> await s.mint(w.address, ethers.parseEther("100000"))
> // ✅ SUCCESS — tx hash printed
> (await s.balanceOf(w.address)).toString()
> // "100000000000000000000000" = 100,000 cvUSD
```

**Presenter says:** "Five real ACTUS contracts processed through a forward-looking simulation.
The maturity ladder shows exactly which T-bills are locked and for how long.
103% backing, 25.2% liquidity. All metrics pass. 100,000 cvUSD minted on Sepolia."

---

### Phase B: STRESS → Mint $100,000 cvUSD 🔴 BLOCKED

```powershell
# Apply stress override: $100K cash withdrawal
cd C:\SATHYA\CHAINAIM3003\mcp-servers\ACTUS-LOCAL-EXT\actus-risk-service-extension1\actus-riskservice\simulations\local\stablecoin\stablecoin2\approach3\iter-fin-demo-1
copy override_phaseB_stress.json reserve_overrides.json

# Run the health check — same collection, reads updated override
node demo-runner.js

# Push stressed report on-chain
cd C:\SATHYA\CHAINAIM3003\mcp-servers\CRE\CRE1\converge.fi-1
$env:REPORT_MODE="demo-stressed"; npx hardhat run scripts/push-report.ts --network sepolia

# Attempt mint — will FAIL
npx hardhat console --network sepolia
> const s = await ethers.getContractAt("ConvergeStablecoin", "0x8D8131547Ec5Cb2fF1bB941a28fA20e347A928F3")
> const [w] = await ethers.getSigners()
> await s.mint(w.address, ethers.parseEther("100000"))
> // 🔴 REVERTS: MintBlockedBacking(8300, 10000)
```

**Presenter says:** "A $100K regulatory payment drained our cash. The SAME cron runs the SAME
collection — but the override file changed. Backing drops to 83%. Liquidity collapses to 7.2%.
A simple check catches the backing drop. But ONLY Converge.fi catches that $385K of reserves
are locked in T-bills. The on-chain ACE gate closed automatically. Mint BLOCKED."

---

### Phase C: RESTORE → Mint $100,000 cvUSD ✅

```powershell
# Apply restore override: early T-bill liquidation + capital injection
cd C:\SATHYA\CHAINAIM3003\mcp-servers\ACTUS-LOCAL-EXT\actus-risk-service-extension1\actus-riskservice\simulations\local\stablecoin\stablecoin2\approach3\iter-fin-demo-1
copy override_phaseC_restore.json reserve_overrides.json

# Run the health check — shows the TradFi restoration
node demo-runner.js

# Push restored report on-chain
cd C:\SATHYA\CHAINAIM3003\mcp-servers\CRE\CRE1\converge.fi-1
$env:REPORT_MODE="demo-restored"; npx hardhat run scripts/push-report.ts --network sepolia

# Mint $100,000 cvUSD — succeeds again
npx hardhat console --network sepolia
> const s = await ethers.getContractAt("ConvergeStablecoin", "0x8D8131547Ec5Cb2fF1bB941a28fA20e347A928F3")
> const [w] = await ethers.getSigners()
> await s.mint(w.address, ethers.parseEther("100000"))
> // ✅ SUCCESS — tx hash printed
> (await s.balanceOf(w.address)).toString()
> // "200000000000000000000000" = 200,000 cvUSD total
```

**Presenter says:** "Two TradFi mechanisms restored health. First, we sold the 26-week T-bill
on the secondary market BEFORE maturity. That costs a 3% penalty — $3,750 — but converts
$121,250 of locked value to immediate cash. Second, $90K capital injection.
Backing restored to 100.3%. Liquidity jumps to 48.1%. All metrics pass.
Another 100,000 cvUSD minted. Wallet now holds 200,000 cvUSD total.
The $3,750 penalty is the real cost. In TradFi, it's a mark-to-market haircut.
Converge.fi models it, enforces it, records it."

---

### Closing (0:10)

> "This is convergence. ACTUS financial standards — the same used by the ECB.
> Chainlink CRE running periodic health checks like a bank's risk system.
> ACE policies automatically blocking minting when reserves are insufficient.
> Not just 'are reserves greater than supply.'
> But 'can you pay your holders back tomorrow.'"

---

## SINGLE-COMMAND ALTERNATIVE

```powershell
cd C:\SATHYA\CHAINAIM3003\mcp-servers\CRE\CRE1\converge.fi-1
npx hardhat run scripts/demo-full-lifecycle.ts --network sepolia
```

---

## NUMBERS CROSS-CHECK

| Metric | Phase A | Phase B | Phase C |
|--------|---------|---------|---------|
| Cash | $130,000 | $30,000 | $241,250 |
| T-bills | $385,000 | $385,000 | $260,000 |
| Total reserves | $515,000 | $415,000 | $501,250 |
| Token supply | $500,000 | $500,000 | $500,000 |
| Backing % | 103.0% ✅ | 83.0% ❌ | 100.3% ✅ |
| Liquidity % | 25.2% ✅ | 7.2% ❌ | 48.1% ✅ |
| Risk score | 10 ✅ | 81 ❌ | 15 ✅ |
| On-chain backing bps | 10300 | 8300 | 10030 |
| On-chain liquidity bps | 2520 | 720 | 4810 |
| On-chain risk score | 10 | 81 | 15 |
| Mint gate | OPEN | CLOSED | OPEN |
| cvUSD minted | +100,000 | BLOCKED | +100,000 |
| cvUSD balance | 100,000 | 100,000 | 200,000 |
| Penalty cost | $0 | $0 | $3,750 |

---

## REFERENCES

- ACTUS Taxonomy: https://www.actusfrf.org/taxonomy
- ACTUS PAM: https://documentation.actusfrf.org/docs/examples/basic-contract-types/example_PAM
- Chainlink CRE: https://docs.chain.link/cre
- CRE Forwarder Directory: https://docs.chain.link/cre/guides/workflow/using-evm-client/forwarder-directory-ts
- OpenZeppelin ERC20: https://docs.openzeppelin.com/contracts/5.x/erc20
