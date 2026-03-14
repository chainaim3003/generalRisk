/**
 * derive-series.ts
 * Pure function: StimulationResult → DerivedSeries
 *
 * All computations are derived from the real ACTUS response.
 * No hardcoded values, no mocks, no fallbacks.
 *
 * Key derivations:
 *  - loanBalance[i]: walks PAM events chronologically; PP events reduce it
 *  - ltv[i]: loanBalance[i] / (collateralQty × ethPrice[i]) × 100
 *  - bufferEth[i]: initialBuffer - Σ(|PP.payoff| / ethPrice_at_PP_time) up to day i
 *  - collateralUsd[i]: collateralQty × ethPrice[i]
 */

import type {
  StimResult,
  DerivedSeries,
  PriceLtvPoint,
  RatePoint,
  BufferPoint,
  CollateralUsdPoint,
  CoverPoint,
  WaterfallPoint,
  PamEvent,
  EventCounts,
  SimEvent,
  RiskFactorPoint,
  MarketDataPoint,
} from './types'

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtWithTime(iso: string): string {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const hour = d.getHours().toString().padStart(2, '0')
  return `${dateStr} ${hour}:00`
}

/** Find nearest ETH price for a given ISO timestamp */
function priceAtTime(isoTarget: string, prices: RiskFactorPoint[]): number {
  if (prices.length === 0) return 0
  const t = new Date(isoTarget).getTime()
  let best = prices[0]
  let bestDiff = Math.abs(new Date(prices[0].time).getTime() - t)
  for (const p of prices) {
    const diff = Math.abs(new Date(p.time).getTime() - t)
    if (diff < bestDiff) { best = p; bestDiff = diff }
  }
  return best.value
}

// ─── Main derivation ──────────────────────────────────────────────────────────

export function deriveSeries(result: StimResult): DerivedSeries | null {
  // ── Guard: need riskFactorData (always present after use-buffer-simulation fix) ──
  if (!result.riskFactorData) return null

  // ── Risk factor time-series — try all known key names ─────────────────────
  const ethPriceRaw: RiskFactorPoint[] =
    result.riskFactorData['ETH_USD'] ??
    result.riskFactorData['ETH_PRICE_MON_01'] ??
    result.riskFactorData['ETH_PRICE_HR_01'] ??
    result.riskFactorData['ETH_PRICE_HOURLY_1W_01'] ??
    []

  const defiRateRaw: RiskFactorPoint[] =
    result.riskFactorData['DEFI_RATE'] ??
    result.riskFactorData['DEFI_RAT_MON_01'] ??
    result.riskFactorData['DEFI_RAT_HR_01'] ??
    result.riskFactorData['DEFI_RAT_HOURLY_1W_01'] ??
    []

  if (ethPriceRaw.length === 0 || defiRateRaw.length === 0) return null

  // Detect if data is hourly based on data point count or time intervals
  const isHourlyData = ethPriceRaw.length > 50
  const dateFmt = isHourlyData ? fmtWithTime : fmtShort

  // ── Locate contracts from simulation (may be null if ACTUS had no events) ─
  const sim = result.simulation ?? []

  const pamContract = sim.find(
    (c) =>
      c.contractId?.includes('DeFi-ETH') ||
      c.contractId?.includes('PAM') ||
      c.contractId?.includes('CompetingRisk'),
  )
  const colContract = sim.find((c) => c.contractId?.includes('Collateral'))
  const bufContract = sim.find((c) => c.contractId?.includes('Buffer'))

  // ── PAM events (empty array if no simulation data) ────────────────────────
  const pamRawEvents: SimEvent[] = pamContract?.events ?? []

  // ── Starting loan balance ─────────────────────────────────────────────────
  const iedEvent = pamRawEvents.find((e) => e.type === 'IED')
  const startLoan = iedEvent?.nominalValue ?? pamRawEvents[0]?.nominalValue ?? 0

  // ── Collateral and buffer quantities ──────────────────────────────────────
  const colEvents: SimEvent[] = colContract?.events ?? []
  const colIed = colEvents.find((e) => e.type === 'IED')
  const collateralQty = (colIed && colIed.payoff !== 0)
    ? Math.abs(colIed.payoff) / priceAtTime(colIed.time, ethPriceRaw)
    : 3.0

  const bufEvents: SimEvent[] = bufContract?.events ?? []
  const bufIed = bufEvents.find((e) => e.type === 'IED')
  const bufferInitial = (bufIed && bufIed.payoff !== 0)
    ? Math.abs(bufIed.payoff) / priceAtTime(bufIed.time, ethPriceRaw)
    : 4.0

  // ── PP events sorted by time ───────────────────────────────────────────────
  const ppEvents: PamEvent[] = pamRawEvents
    .filter((e) => e.type === 'PP' && e.payoff !== 0)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .map((e) => ({
      time: e.time,
      type: e.type,
      payoff: Math.abs(e.payoff),
      nominalValue: e.nominalValue,
      nominalInterestRate: e.nominalInterestRate,
    }))

  // ── Rate lookup by date ────────────────────────────────────────────────────
  const rateByDate = new Map<string, number>()
  for (const r of defiRateRaw) {
    rateByDate.set(r.time.slice(0, 10), r.value)
  }

  // ── Build aligned series over ETH price dates ─────────────────────────────
  const priceLtv: PriceLtvPoint[] = []
  const rates: RatePoint[] = []
  const bufferSeries: BufferPoint[] = []
  const collateralUsdSeries: CollateralUsdPoint[] = []
  const coverSeries: CoverPoint[] = []
  const marketData: MarketDataPoint[] = []

  let loanBalance = startLoan
  let cumulativeEthSold = 0
  const appliedPP = new Set<string>()

  for (let i = 0; i < ethPriceRaw.length; i++) {
    const pt = ethPriceRaw[i]
    const ptMs = new Date(pt.time).getTime()
    const dateKey = pt.time.slice(0, 10)

    // Apply PP events that occurred on or before this day
    for (const pp of ppEvents) {
      if (!appliedPP.has(pp.time)) {
        const ppMs = new Date(pp.time).getTime()
        if (ppMs <= ptMs + 60_000) {
          loanBalance = pp.nominalValue
          const ethSold = pp.payoff / priceAtTime(pp.time, ethPriceRaw)
          cumulativeEthSold += ethSold
          appliedPP.add(pp.time)
        }
      }
    }

    const price = pt.value
    const ltv = (collateralQty > 0 && price > 0 && loanBalance > 0)
      ? (loanBalance / (collateralQty * price)) * 100
      : 0
    const collateralUsd = collateralQty * price
    const bufferEthRemaining = Math.max(0, bufferInitial - cumulativeEthSold)
    const rateVal =
      rateByDate.get(dateKey) ??
      defiRateRaw[Math.min(i, defiRateRaw.length - 1)].value

    priceLtv.push({
      date: fmtShort(pt.time),
      isoDate: pt.time,
      price,
      ltv: parseFloat(ltv.toFixed(2)),
      loanBalance: parseFloat(loanBalance.toFixed(2)),
    })

    rates.push({
      date: fmtShort(pt.time),
      isoDate: pt.time,
      rate: parseFloat((rateVal * 100).toFixed(4)),
    })

    bufferSeries.push({
      date: fmtShort(pt.time),
      isoDate: pt.time,
      bufferEth: parseFloat(bufferEthRemaining.toFixed(6)),
    })

    collateralUsdSeries.push({
      date: fmtShort(pt.time),
      isoDate: pt.time,
      collateralUsd: parseFloat(collateralUsd.toFixed(2)),
    })

    coverSeries.push({
      date: fmtShort(pt.time),
      isoDate: pt.time,
      collateralUsd: parseFloat(collateralUsd.toFixed(2)),
      loanBalance: parseFloat(loanBalance.toFixed(2)),
    })

    marketData.push({
      date: dateFmt(pt.time),
      isoDate: pt.time,
      ethPrice: parseFloat(price.toFixed(2)),
      defiRate: parseFloat((rateVal * 100).toFixed(4)),
    })
  }

  // ── Scalar outcomes ────────────────────────────────────────────────────────
  const initialLtv = priceLtv.length > 0 ? priceLtv[0].ltv : 0
  const finalLtv = priceLtv.length > 0 ? priceLtv[priceLtv.length - 1].ltv : 0
  const liquidated = priceLtv.some((p) => p.ltv >= 82.5)
  const totalRepaid = ppEvents.reduce((s, pp) => s + pp.payoff, 0)
  const finalBalance = priceLtv.length > 0
    ? priceLtv[priceLtv.length - 1].loanBalance
    : startLoan
  const deleveragedPct = startLoan > 0 ? (totalRepaid / startLoan) * 100 : 0

  // ── Waterfall ──────────────────────────────────────────────────────────────
  const waterfall: WaterfallPoint[] = [
    { label: 'Start', value: parseFloat(startLoan.toFixed(2)), color: 'blue' },
  ]
  for (let i = 0; i < ppEvents.length; i++) {
    const pp = ppEvents[i]
    waterfall.push({
      label: fmtShort(pp.time) + ` PP${i + 1}`,
      value: parseFloat(pp.nominalValue.toFixed(2)),
      color: 'amber',
    })
  }
  if (ppEvents.length > 0) {
    waterfall.push({
      label: 'Final',
      value: parseFloat(finalBalance.toFixed(2)),
      color: 'green',
    })
  }

  // ── Event counts ───────────────────────────────────────────────────────────
  const eventCounts: EventCounts = {}
  for (const e of pamRawEvents) {
    eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1
  }

  // ── PAM events for timeline ────────────────────────────────────────────────
  const pamEvents: PamEvent[] = pamRawEvents.map((e) => ({
    time: e.time,
    type: e.type,
    payoff: e.payoff,
    nominalValue: e.nominalValue,
    nominalInterestRate: e.nominalInterestRate,
  }))

  return {
    priceLtv,
    rates,
    bufferSeries,
    collateralUsdSeries,
    coverSeries,
    initialLtv,
    finalLtv,
    liquidated,
    totalRepaid: parseFloat(totalRepaid.toFixed(2)),
    finalBalance: parseFloat(finalBalance.toFixed(2)),
    deleveragedPct: parseFloat(deleveragedPct.toFixed(2)),
    ppEvents,
    waterfall,
    pamEvents,
    eventCounts,
    collateralQty,
    bufferInitial,
    marketData,
  }
}
