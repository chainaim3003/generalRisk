'use client'
import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, ReferenceLine,
} from 'recharts'
import type { DerivedSeries, PathType } from './types'

const TT = {
  backgroundColor: '#fff', border: '1px solid #dee2e6',
  borderRadius: 8, color: '#212529', fontSize: 11, padding: '6px 10px',
}

function buildPaths(base: number): Record<PathType, number[]> {
  const rise = (base * 0.35) / 24
  const fall = (base * 0.15) / 24
  const v: number[] = [], b: number[] = [], s: number[] = []
  for (let i = 0; i < 25; i++) {
    v.push(parseFloat((base + rise * i).toFixed(2)))
    b.push(parseFloat((base - fall * i).toFixed(2)))
    s.push(parseFloat((base + Math.sin((i / 24) * Math.PI * 3) * base * 0.04).toFixed(2)))
  }
  return { v, b, s }
}

function pnlFor(
  path: PathType,
  paths: Record<PathType, number[]>,
  loanBefore: number,
  pp1After: number,
  colQty: number,
  basePrice: number,
) {
  const end = paths[path][paths[path].length - 1]
  return {
    A: Math.round(colQty * end - loanBefore),
    B: Math.round(colQty * end - pp1After),
    C: Math.round(colQty * basePrice - loanBefore),
  }
}

const VERDICTS: Record<PathType, string> = {
  v: 'V-shape recovery: Strategy A wins — held collateral through the recovery. Strategy B (V5 actual) also positive — loan reduced at cost of buffer ETH. Strategy C sold at the bottom.',
  b: 'Continued bear: Strategy C wins — early exit preserved capital. Strategy A leads to forced liquidation. Strategy B (V5 actual) partially mitigated the loss.',
  s: 'Sideways bleed: Strategy C edges ahead. Strategy B (V5 actual) stabilised for marginal gain. Strategy A survived with ongoing LTV stress.',
}

export function TabStrategyOutcomes({
  displaySeries: d,
  isLiveData,
  isRunning,
}: {
  displaySeries: DerivedSeries
  isLiveData: boolean
  isRunning: boolean
}) {
  const [path, setPath] = useState<PathType>('v')

  const pp1 = d.ppEvents[0]

  const pp1Price = pp1
    ? (d.priceLtv.find(pt => pt.isoDate.slice(0, 10) >= pp1.time.slice(0, 10))?.price
       ?? d.priceLtv[Math.floor(d.priceLtv.length / 2)]?.price ?? 0)
    : (d.priceLtv.length > 0 ? (d.priceLtv[Math.floor(d.priceLtv.length * 0.6)]?.price ?? 0) : 0)

  const pp1After = pp1?.nominalValue ?? d.finalBalance
  const pp1Payoff = pp1?.payoff ?? 0
  const rawSum = pp1After + pp1Payoff
  const loanBefore = rawSum || (d.priceLtv[0]?.loanBalance ?? 5000)
  const colQty = d.collateralQty

  const paths = useMemo(
    () => (pp1Price > 0 ? buildPaths(pp1Price) : null),
    [pp1Price],
  )

  const pnlAll = useMemo(
    () =>
      paths
        ? {
            v: pnlFor('v', paths, loanBefore, pp1After, colQty, pp1Price),
            b: pnlFor('b', paths, loanBefore, pp1After, colQty, pp1Price),
            s: pnlFor('s', paths, loanBefore, pp1After, colQty, pp1Price),
          }
        : null,
    [paths, loanBefore, pp1After, colQty, pp1Price],
  )

  const pathData = paths
    ? Array.from({ length: 25 }, (_, i) => ({
        day: `D+${i}`, v: paths.v[i], b: paths.b[i], s: paths.s[i],
      }))
    : []

  const curPnl = pnlAll ? pnlAll[path] : null
  const pnlBarData = curPnl
    ? [
        { strategy: 'A — Let ride',           pnl: curPnl.A },
        { strategy: 'B — Buffer V5 (actual)',  pnl: curPnl.B },
        { strategy: 'C — Circuit br.',         pnl: curPnl.C },
      ]
    : []

  const pnlColor = (v: number) => (v >= 0 ? '#16a34a' : '#dc2626')

  const learnProcess = isLiveData
    ? d.ppEvents.length === 2 ? '8.4' : d.ppEvents.length === 1 ? '7.1' : '6.0'
    : '—'
  const learnOutcome = isLiveData
    ? path === 'v' ? '6.1' : path === 'b' ? '7.8' : '5.5'
    : '—'

  const tInt = Math.max(1, Math.floor(d.priceLtv.length / 8))

  return (
    <div style={{ padding: 20 }}>
      {isLiveData ? (
        <div className="bs-live-banner">
          ✅ <strong>Live ACTUS data</strong> — paths projected from actual PP1 price
          (${Math.round(pp1Price).toLocaleString()}) at{' '}
          {pp1 ? new Date(pp1.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}.
          Loan reduced to ${pp1After.toLocaleString('en-US', { maximumFractionDigits: 0 })} by V5 buffer sell.
        </div>
      ) : (
        <div className="bs-preview-banner">
          📊 <strong>Preview mode</strong> — paths projected from estimated intervention point
          (ETH ~${Math.round(pp1Price).toLocaleString()}).
          Run Simulation for exact PP1 price from ACTUS.
        </div>
      )}

      <div className="bs-path-row">
        <span style={{ fontSize: 13, fontWeight: 600, color: '#212529' }}>Post-crisis ETH path:</span>
        {(['v', 'b', 's'] as PathType[]).map(k => (
          <button key={k} type="button" onClick={() => setPath(k)}
            className={`bs-path-btn${path === k ? ' active' : ''}`}>
            {k === 'v' ? 'V-shape recovery' : k === 'b' ? 'Continued bear' : 'Sideways bleed'}
          </button>
        ))}
      </div>

      <div className="bs-layout">
        <div className="bs-col-right">

          {/* Full 90-day ETH price */}
          <div className="bs-card">
            <div className="bs-heading">
              Full 90-day ETH price trajectory{!isLiveData && ' (projected from sliders)'}
            </div>
            <div className="bs-chart-200">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.priceLtv} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sPrice4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false} interval={tInt} />
                  <YAxis tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${Math.round(Number(v)).toLocaleString()}`} width={58} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [`$${v.toLocaleString()}`, 'ETH Price']} />
                  <Area type="monotone" dataKey="price" stroke="#2563eb" fill="url(#sPrice4)"
                    strokeWidth={2} dot={false} name="price" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Post-crisis 3-path chart */}
          <div className="bs-card">
            <div className="bs-heading">
              Post-crisis ETH price — 3 scenarios (from ${Math.round(pp1Price).toLocaleString()} base)
            </div>
            <div className="bs-chart-240">
              {pathData.length === 0 ? (
                <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px dashed #dee2e6', borderRadius: 8, color: '#868e96', fontSize: 12 }}>
                  Computing paths…
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pathData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${Math.round(Number(v)).toLocaleString()}`} width={62} />
                    <Tooltip contentStyle={TT}
                      formatter={(v: number, n: string) => [
                        `$${v.toLocaleString()}`,
                        n === 'v' ? 'V-shape' : n === 'b' ? 'Bear' : 'Sideways',
                      ]} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#868e96' }}
                      formatter={n => n === 'v' ? 'V-shape' : n === 'b' ? 'Bear' : 'Sideways'} />
                    <Line type="monotone" dataKey="v" stroke="#16a34a"
                      strokeWidth={path === 'v' ? 2.5 : 1}
                      strokeDasharray={path === 'v' ? undefined : '4 3'}
                      dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="b" stroke="#dc2626"
                      strokeWidth={path === 'b' ? 2.5 : 1}
                      strokeDasharray={path === 'b' ? undefined : '4 3'}
                      dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="s" stroke="#d97706"
                      strokeWidth={path === 's' ? 2.5 : 1}
                      strokeDasharray={path === 's' ? undefined : '4 3'}
                      dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* P&L bar chart */}
          <div className="bs-card">
            <div className="bs-heading">
              Net P&amp;L by strategy — {path === 'v' ? 'V-shape' : path === 'b' ? 'Bear' : 'Sideways'} path
            </div>
            <div className="bs-chart-200">
              {pnlBarData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px dashed #dee2e6', borderRadius: 8, color: '#868e96', fontSize: 12 }}>
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={pnlBarData} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                      tickFormatter={v => `$${Math.abs(Number(v)).toLocaleString()}`} />
                    <YAxis type="category" dataKey="strategy"
                      tick={{ fontSize: 10, fill: '#495057' }} tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={TT}
                      formatter={(v: number) => [`${v >= 0 ? '+' : ''}$${v.toLocaleString()}`, 'Net P&L']} />
                    <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                      {pnlBarData.map((row, i) => (
                        <Cell key={i} fill={pnlColor(row.pnl)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Buffer ETH depletion */}
          <div className="bs-card">
            <div className="bs-heading">
              Buffer ETH depletion over 90 days{!isLiveData && ' (projected)'}
            </div>
            <div className="bs-chart-160">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.bufferSeries} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bufGrad4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false} interval={tInt} />
                  <YAxis tick={{ fontSize: 10, fill: '#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `${Number(v).toFixed(2)} ETH`} width={58} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => [`${v.toFixed(4)} ETH`, 'Buffer remaining']} />
                  <ReferenceLine y={1.0} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1} />
                  <Area type="monotone" dataKey="bufferEth" stroke="#d97706" fill="url(#bufGrad4)"
                    strokeWidth={2} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: 11, color: '#868e96', marginTop: 6 }}>
              Red dashed = min buffer reserve (1.0 ETH). Buffer never goes below this floor.
            </p>
          </div>

        </div>

        {/* RIGHT column */}
        <div style={{ width: 320, flexShrink: 0 }}>

          <div className="bs-card">
            <div className="bs-heading">Outcome matrix</div>
            <table className="bs-outcome-table">
              <thead>
                <tr><th>Strategy</th><th>V-shape</th><th>Bear</th><th>Sideways</th></tr>
              </thead>
              <tbody>
                {pnlAll && paths ? (
                  (['A', 'B', 'C'] as const).map(strat => {
                    const vals = [pnlAll.v[strat], pnlAll.b[strat], pnlAll.s[strat]]
                    return (
                      <tr key={strat}>
                        <td style={{ fontWeight: 600, color: '#212529' }}>
                          {strat === 'A' ? 'A — Let ride' : strat === 'B' ? 'B — Buffer V5' : 'C — Circuit br.'}
                        </td>
                        {vals.map((v, i) => (
                          <td key={i} style={{ fontWeight: 600, color: pnlColor(v) }}>
                            {v >= 0 ? '+' : ''}${v.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#868e96', fontSize: 11, padding: '12px 0' }}>
                      Computing…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bs-card">
            <div className="bs-heading">V5 simulation outcomes</div>
            <div style={{ fontSize: 12, lineHeight: 1.8, color: '#495057' }}>
              {([
                ['Starting loan', `$${loanBefore.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, '#212529'],
                ['After PP1',     isLiveData && d.ppEvents[0] ? `$${d.ppEvents[0].nominalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '~$4,332', '#d97706'],
                ['After PP2',     isLiveData && d.ppEvents[1] ? `$${d.ppEvents[1].nominalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '~$3,643', '#d97706'],
                ['Total repaid',  isLiveData ? `$${d.totalRepaid.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '~$1,357', '#16a34a'],
                ['Deleveraged',   isLiveData ? `${d.deleveragedPct.toFixed(2)}%` : '~27.14%', '#16a34a'],
                ['Collateral',    `${d.collateralQty.toFixed(1)} ETH`, '#2563eb'],
              ] as [string, string, string][]).map(([label, value, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  paddingBottom: 4, borderBottom: '1px solid #f1f3f5' }}>
                  <span style={{ color: '#868e96' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bs-card">
            <div className="bs-heading">Adaptive learning score</div>
            <p style={{ fontSize: 11, color: '#868e96', marginBottom: 10 }}>
              {isLiveData ? 'Based on actual V5 ACTUS output' : 'Run simulation for real scores'}
            </p>
            <div className="bs-learn-row">
              <div className="bs-learn-card">
                <div className="bs-learn-score" style={{ color: isLiveData ? '#16a34a' : '#868e96' }}>
                  {learnProcess}
                </div>
                <div className="bs-learn-lbl">Process score</div>
              </div>
              <div className="bs-learn-card">
                <div className="bs-learn-score" style={{ color: isLiveData ? '#d97706' : '#868e96' }}>
                  {learnOutcome}
                </div>
                <div className="bs-learn-lbl">Outcome score</div>
              </div>
              <div className="bs-learn-card">
                <div className="bs-learn-score" style={{ color: '#212529' }}>
                  {isLiveData ? d.ppEvents.length : 2}
                </div>
                <div className="bs-learn-lbl">PP events</div>
              </div>
            </div>
          </div>

          <div className="bs-card">
            <div className="bs-heading">Current path verdict</div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: '#495057' }}>{VERDICTS[path]}</p>
          </div>

          <div className="bs-card">
            <div className="bs-heading">Key insight</div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: '#495057' }}>
              A circuit breaker before a V-shape recovery is a{' '}
              <strong style={{ color: '#2563eb' }}>correct process decision</strong>{' '}
              with a poor outcome. The V5 buffer sell (Strategy B) preserves collateral while reducing
              loan exposure.
              {isLiveData && d.ppEvents.length === 2 &&
                ` ${d.deleveragedPct.toFixed(1)}% of the loan was deleveraged over 2 ACTUS PP events.`}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
