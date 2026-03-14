'use client'
/**
 * use-buffer-simulation.ts
 *
 * Always exposes `preview` — a DerivedSeries computed from current params
 * using the same math as build-collection.ts. This means charts are never
 * empty: before a simulation they show the configured scenario projection;
 * after a simulation they show the real ACTUS output via `derived`.
 *
 * `displaySeries` is the one tabs should use:
 *   - `derived` (real ACTUS) if simulation succeeded
 *   - `preview` (param-computed projection) otherwise
 */

import { useState, useCallback, useMemo } from 'react'
import type { SimParams, SimStatus, StimResult, DerivedSeries, RiskFactorPoint } from './types'
import { DEFAULT_PARAMS } from './types'
import { buildCollection } from './build-collection'
import { deriveSeries } from './derive-series'

const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE) ||
  'http://localhost:4000/api'

// ─── Build riskFactorData from params ────────────────────────────────────────

export function buildRiskFactorData(params: SimParams): Record<string, RiskFactorPoint[]> {
  const DAYS = 90
  const base = new Date('2026-02-18T00:00:00')
  const times = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000)
    return d.toISOString().slice(0, 19)
  })
  const ethSeries: RiskFactorPoint[] = times.map((time, i) => ({
    time,
    value: parseFloat(
      (params.ethStartPrice + (params.ethEndPrice - params.ethStartPrice) * (i / (DAYS - 1))).toFixed(2)
    ),
  }))
  const rateEnd = params.rateStart * 2.2924
  const rateSeries: RiskFactorPoint[] = times.map((time, i) => ({
    time,
    value: parseFloat(
      (params.rateStart * Math.pow(rateEnd / params.rateStart, i / (DAYS - 1))).toFixed(6)
    ),
  }))
  return { ETH_USD: ethSeries, DEFI_RATE: rateSeries }
}

// ─── Build a preview DerivedSeries from params alone ─────────────────────────
// This is pure math — no ACTUS call. It uses the same formulas as derive-series.ts
// but with no real PP events (since ACTUS hasn't run yet).

function buildPreviewSeries(params: SimParams): DerivedSeries {
  const rfData = buildRiskFactorData(params)
  const ethPriceRaw = rfData['ETH_USD']
  const defiRateRaw = rfData['DEFI_RATE']

  const fmtShort = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  let loanBalance = params.loanAmount

  const priceLtv = ethPriceRaw.map((pt, i) => {
    const price = pt.value
    const ltv = (params.collateralEth > 0 && price > 0 && loanBalance > 0)
      ? (loanBalance / (params.collateralEth * price)) * 100 : 0
    return {
      date: fmtShort(pt.time),
      isoDate: pt.time,
      price,
      ltv: parseFloat(ltv.toFixed(2)),
      loanBalance: parseFloat(loanBalance.toFixed(2)),
    }
  })

  const rates = defiRateRaw.map(pt => ({
    date: fmtShort(pt.time),
    isoDate: pt.time,
    rate: parseFloat((pt.value * 100).toFixed(4)),
  }))

  const bufferSeries = ethPriceRaw.map(pt => ({
    date: fmtShort(pt.time),
    isoDate: pt.time,
    bufferEth: params.bufferEth,
  }))

  const collateralUsdSeries = ethPriceRaw.map(pt => ({
    date: fmtShort(pt.time),
    isoDate: pt.time,
    collateralUsd: parseFloat((params.collateralEth * pt.value).toFixed(2)),
  }))

  const coverSeries = ethPriceRaw.map(pt => ({
    date: fmtShort(pt.time),
    isoDate: pt.time,
    collateralUsd: parseFloat((params.collateralEth * pt.value).toFixed(2)),
    loanBalance: parseFloat(params.loanAmount.toFixed(2)),
  }))

  const marketData = ethPriceRaw.map((pt, i) => ({
    date: fmtShort(pt.time),
    isoDate: pt.time,
    ethPrice: parseFloat(pt.value.toFixed(2)),
    defiRate: parseFloat((defiRateRaw[i].value * 100).toFixed(4)),
  }))

  const initialLtv = priceLtv.length > 0 ? priceLtv[0].ltv : 0
  const finalLtv = priceLtv.length > 0 ? priceLtv[priceLtv.length - 1].ltv : 0

  return {
    priceLtv,
    rates,
    bufferSeries,
    collateralUsdSeries,
    coverSeries,
    initialLtv,
    finalLtv,
    liquidated: false,
    totalRepaid: 0,
    finalBalance: params.loanAmount,
    deleveragedPct: 0,
    ppEvents: [],
    waterfall: [
      { label: 'Start', value: params.loanAmount, color: 'blue' },
    ],
    pamEvents: [],
    eventCounts: {},
    collateralQty: params.collateralEth,
    bufferInitial: params.bufferEth,
    marketData,
  }
}

export interface BufferSimState {
  params: SimParams
  status: SimStatus
  result: StimResult | null
  derived: DerivedSeries | null
  preview: DerivedSeries
  displaySeries: DerivedSeries
  isLiveData: boolean
  error: string | null
  environment: string
  setParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void
  setEnvironment: (env: string) => void
  runSimulation: () => Promise<void>
  resetSimulation: () => void
}

export function useBufferSimulation(): BufferSimState {
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS)
  const [status, setStatus] = useState<SimStatus>('idle')
  const [result, setResult] = useState<StimResult | null>(null)
  const [derived, setDerived] = useState<DerivedSeries | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [environment, setEnvironmentState] = useState<string>('localhost')

  const preview = useMemo(() => buildPreviewSeries(params), [params])

  const displaySeries = derived ?? preview
  const isLiveData = derived !== null

  const setParam = useCallback(
    <K extends keyof SimParams>(key: K, value: SimParams[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const setEnvironment = useCallback((env: string) => {
    setEnvironmentState(env)
  }, [])

  const runSimulation = useCallback(async () => {
    setStatus('running')
    setError(null)
    setResult(null)
    setDerived(null)

    try {
      const collectionJson = buildCollection(params)

      const res = await fetch(`${API_BASE}/stimulation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionJson, environment }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'Unknown error')
        throw new Error(`API ${res.status}: ${text}`)
      }

      const data: StimResult = await res.json()

      if (!data.success) {
        throw new Error(
          'Simulation returned success=false. Ensure ACTUS risk service (8082) and server (8083) are running.',
        )
      }

      // Use only backend riskFactorData - no fallback
      if (!data.riskFactorData || Object.keys(data.riskFactorData).length === 0) {
        throw new Error(
          'Backend returned no riskFactorData. Check ACTUS response.',
        )
      }

      const series = deriveSeries(data)
      if (!series) {
        throw new Error(
          'Could not derive chart series from backend data. Check riskFactorData keys in backend response.',
        )
      }

      setResult(data)
      setDerived(series)
      setStatus('success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setStatus('error')
    }
  }, [params, environment])

  const resetSimulation = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setDerived(null)
    setError(null)
  }, [])

  return {
    params,
    status,
    result,
    derived,
    preview,
    displaySeries,
    isLiveData,
    error,
    environment,
    setParam,
    setEnvironment,
    runSimulation,
    resetSimulation,
  }
}
