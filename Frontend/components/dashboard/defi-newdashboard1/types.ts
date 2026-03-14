/**
 * types.ts
 * Local types for defi-newdashboard1.
 * Does NOT modify lib/types.ts.
 */

// ─── Slider / input parameters that the user controls ─────────────────────────

export interface SimParams {
  loanAmount: number         // USDC notional, default 5000
  collateralEth: number      // constant collateral qty, default 3.0
  bufferEth: number          // initial buffer qty, default 4.0
  ethStartPrice: number      // ETH price on day 0, default 2800
  ethEndPrice: number        // ETH price on day 89, default 1870
  rateStart: number          // DeFi rate on day 0 (fraction), default 0.05
  ltvThreshold: number       // intervention trigger (fraction), default 0.75
  ltvTarget: number          // recovery target (fraction), default 0.65
  maxInterventions: number   // circuit breaker, default 2
  minBufferReserve: number   // ETH floor never used, default 1.0
}

export const DEFAULT_PARAMS: SimParams = {
  loanAmount: 5000,
  collateralEth: 3.0,
  bufferEth: 4.0,
  ethStartPrice: 2800,
  ethEndPrice: 1870,
  rateStart: 0.05,
  ltvThreshold: 0.75,
  ltvTarget: 0.65,
  maxInterventions: 2,
  minBufferReserve: 1.0,
}

// ─── Chart-ready data series derived from StimulationResult ───────────────────

export interface PriceLtvPoint {
  date: string       // "Feb 18"
  isoDate: string    // full ISO string from riskFactorData
  price: number      // ETH/USD
  ltv: number        // LTV% computed from loan balance / (collateralEth * price)
  loanBalance: number
}

export interface RatePoint {
  date: string
  isoDate: string
  rate: number       // percentage, e.g. 5.00
}

export interface BufferPoint {
  date: string
  isoDate: string
  bufferEth: number
}

export interface CollateralUsdPoint {
  date: string
  isoDate: string
  collateralUsd: number
}

export interface CoverPoint {
  date: string
  isoDate: string
  collateralUsd: number
  loanBalance: number
}

export interface WaterfallPoint {
  label: string
  value: number
  color: 'blue' | 'amber' | 'green'
}

export interface PamEvent {
  time: string
  type: string
  payoff: number
  nominalValue: number
  nominalInterestRate?: number
}

export interface EventCounts {
  [type: string]: number
}

export interface DerivedSeries {
  // 90-point aligned arrays
  priceLtv: PriceLtvPoint[]
  rates: RatePoint[]
  bufferSeries: BufferPoint[]
  collateralUsdSeries: CollateralUsdPoint[]
  coverSeries: CoverPoint[]

  // scalar outcomes
  initialLtv: number          // %
  finalLtv: number            // %
  liquidated: boolean
  totalRepaid: number         // USDC
  finalBalance: number        // USDC
  deleveragedPct: number      // %

  // PP event details
  ppEvents: PamEvent[]

  // waterfall for Tab 1
  waterfall: WaterfallPoint[]

  // full PAM event list for timeline
  pamEvents: PamEvent[]

  // event counts for density chart
  eventCounts: EventCounts

  // simulation params recovered from the result (for display only)
  collateralQty: number
  bufferInitial: number
}

// ─── Simulation lifecycle ──────────────────────────────────────────────────────

export type SimStatus = 'idle' | 'running' | 'success' | 'error'

// ─── Strategy labels ───────────────────────────────────────────────────────────

export type Strategy = 'A' | 'B' | 'C'
export type PathType = 'v' | 'b' | 's'

// ─── Re-export StimulationResult shape (mirrors lib/types.ts, local copy) ─────

export interface RiskFactorPoint {
  time: string
  value: number
}

export interface SimEvent {
  time: string
  type: string
  payoff: number
  nominalValue: number
  currency?: string
  nominalInterestRate?: number
}

export interface SimContract {
  contractId: string
  events: SimEvent[]
}

export interface StimResult {
  success: boolean
  scenarioName: string
  description: string
  environment: string
  riskServiceUrl: string
  actusServerUrl: string
  steps: Array<{
    step: number
    name: string
    method: string
    url: string
    status: 'success' | 'failed'
    httpStatus?: number
    durationMs: number
    error?: string
  }>
  simulation: SimContract[] | null
  riskFactorData: Record<string, RiskFactorPoint[]> | null
  totalDurationMs: number
  timestamp: string
}
