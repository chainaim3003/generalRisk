'use client'
/**
 * tab-actus-standard.tsx — Tab 1
 * Always shows charts from displaySeries (preview or live ACTUS data).
 * Left: sliders + contract mapping
 * Right: 6 metrics + ETH/LTV dual-axis + waterfall + event timeline + rate chart
 */
import React from 'react'
import {
  ComposedChart, Line, Area, BarChart, Bar, Cell, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { DerivedSeries, SimParams, WaterfallPoint } from './types'

const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
const CM: Record<string, string> = { blue:'#2563eb', amber:'#d97706', green:'#16a34a' }

function SRow({ label,value,min,max,step,display,onChange }: {
  label:string; value:number; min:number; max:number; step:number; display:string; onChange:(v:number)=>void
}) {
  return (
    <div className="bs-slider-wrap">
      <span className="bs-slider-label">{label}</span>
      <div className="bs-slider-row">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/>
        <span className="bs-slider-val">{display}</span>
      </div>
    </div>
  )
}

function EvtBadge({ type }: { type:string }) {
  const cls = ['IED','PP','IP','RR','AD','MD'].includes(type) ? type : 'AD'
  return <span className={`bs-badge bs-badge-${cls}`}>{type}</span>
}

export function TabActusStandard({ params, setParam, environment, setEnvironment, displaySeries: d, isLiveData, isRunning }: {
  params: SimParams
  setParam: <K extends keyof SimParams>(k:K, v:SimParams[K])=>void
  environment: string
  setEnvironment: (e:string)=>void
  displaySeries: DerivedSeries
  isLiveData: boolean
  isRunning: boolean
}) {
  const tInt = Math.max(1, Math.floor(d.priceLtv.length / 8))

  const iLtv = `${d.initialLtv.toFixed(1)}%`
  const fLtv = `${d.finalLtv.toFixed(1)}%`
  const fLtvCls = d.finalLtv >= 82.5 ? 'red' : d.finalLtv >= 75 ? 'amber' : 'green'
  const liqCls = d.liquidated ? 'red' : 'green'

  const timeline = (() => {
    const seen = new Set<string>(); const out: typeof d.pamEvents = []
    for (const e of d.pamEvents) {
      if (e.type==='IED' && !seen.has('IED')) { out.push(e); seen.add('IED') }
      if (e.type==='RR'  && !seen.has('RR'))  { out.push(e); seen.add('RR')  }
      if (e.type==='PP')                       { out.push(e) }
      if (e.type==='IP'  && !seen.has('IP'))   { out.push(e); seen.add('IP')  }
      if (e.type==='MD'  && !seen.has('MD'))   { out.push(e); seen.add('MD')  }
    }
    return out.slice(0, 8)
  })()

  return (
    <div style={{ padding:20 }}>
      {/* Banner */}
      {isLiveData
        ? <div className="bs-live-banner">✅ <strong>Live ACTUS data</strong> — showing real simulation results from V5 BufferLTV model (PP1: ${d.ppEvents[0]?.payoff.toFixed(2) ?? '—'} @ Apr 15, PP2: ${d.ppEvents[1]?.payoff.toFixed(2) ?? '—'} @ Apr 16)</div>
        : <div className="bs-preview-banner">📊 <strong>Preview mode</strong> — showing projected scenario from slider values. Click Run Simulation to get real ACTUS output.</div>
      }

      <div className="bs-layout">
        {/* ═══ LEFT ═══════════════════════════════════════════════════ */}
        <div className="bs-col-left">
          <div className="bs-card">
            <div className="bs-heading">Loan parameters</div>
            <SRow label="Loan amount (USDC)" value={params.loanAmount} min={1000} max={20000} step={500} display={`$${params.loanAmount.toLocaleString()}`} onChange={v=>setParam('loanAmount',v)}/>
            <SRow label="Collateral (ETH)" value={params.collateralEth} min={1} max={10} step={0.5} display={params.collateralEth.toFixed(1)} onChange={v=>setParam('collateralEth',v)}/>
            <SRow label="Buffer (ETH)" value={params.bufferEth} min={1} max={10} step={0.5} display={params.bufferEth.toFixed(1)} onChange={v=>setParam('bufferEth',v)}/>
            <SRow label="ETH start price ($)" value={params.ethStartPrice} min={1000} max={5000} step={50} display={`$${params.ethStartPrice.toLocaleString()}`} onChange={v=>setParam('ethStartPrice',v)}/>
            <SRow label="ETH end price ($)" value={params.ethEndPrice} min={500} max={4000} step={50} display={`$${params.ethEndPrice.toLocaleString()}`} onChange={v=>setParam('ethEndPrice',v)}/>
            <SRow label="LTV warning threshold (%)" value={params.ltvThreshold*100} min={50} max={90} step={1} display={`${(params.ltvThreshold*100).toFixed(0)}%`} onChange={v=>setParam('ltvThreshold',v/100)}/>
            <SRow label="Interest rate start (%)" value={params.rateStart*100} min={1} max={20} step={0.5} display={`${(params.rateStart*100).toFixed(1)}%`} onChange={v=>setParam('rateStart',v/100)}/>
            <div className="bs-slider-wrap">
              <label className="bs-slider-label">LTV target (%)</label>
              <input type="number" min={40} max={85} step={1} value={(params.ltvTarget*100).toFixed(0)} onChange={e=>setParam('ltvTarget',Number(e.target.value)/100)} className="bs-num-input"/>
            </div>
            <div className="bs-slider-wrap">
              <label className="bs-slider-label">Max interventions</label>
              <input type="number" min={1} max={5} step={1} value={params.maxInterventions} onChange={e=>setParam('maxInterventions',Number(e.target.value))} className="bs-num-input"/>
            </div>
            <div className="bs-slider-wrap">
              <label className="bs-slider-label">Min buffer reserve (ETH)</label>
              <input type="number" min={0} max={2} step={0.1} value={params.minBufferReserve.toFixed(1)} onChange={e=>setParam('minBufferReserve',Number(e.target.value))} className="bs-num-input"/>
            </div>
            <div className="bs-slider-wrap">
              <label className="bs-slider-label">Environment</label>
              <select value={environment} onChange={e=>setEnvironment(e.target.value)} className="bs-select">
                <option value="localhost">localhost (8082/8083)</option>
                <option value="aws">AWS (34.203.247.32)</option>
              </select>
            </div>
          </div>

          <div className="bs-card">
            <div className="bs-heading">ACTUS contract mapping</div>
            {[['PAM','Loan smart contract'],['COM col','Collateral vault (3.0 ETH)'],['COM buf','Buffer reserve (4.0 ETH)'],['RR event','Oracle rate feed'],['PP event','Forced deleveraging'],['BufferLTV','Liquidation engine V5']].map(([k,v])=>(
              <div key={k} className="bs-map-row">
                <span className="bs-map-key">{k}</span>
                <span className="bs-map-arrow">↔</span>
                <span className="bs-map-val">{v}</span>
              </div>
            ))}
          </div>

          {/* V5 config summary */}
          <div className="bs-card">
            <div className="bs-heading">V5 Configuration</div>
            {[
              ['ltvThreshold', `${(params.ltvThreshold*100).toFixed(0)}%`, 'Intervention trigger'],
              ['ltvTarget',    `${(params.ltvTarget*100).toFixed(0)}%`,    'Recovery target'],
              ['maxInterventions', String(params.maxInterventions), 'Circuit breaker'],
              ['minBufferReserve', `${params.minBufferReserve.toFixed(1)} ETH`, 'Min reserve'],
              ['cooldown', '24h', 'Between interventions'],
              ['fallingKnife', '20% / 48h', 'Price drop detection'],
              ['monitoring', '+1ms offset', 'V5 state sync fix'],
            ].map(([k,v,desc])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #f1f3f5', fontSize:12 }}>
                <span style={{ color:'#868e96' }}>{desc}</span>
                <span style={{ fontWeight:600, color:'#212529', fontFamily:'monospace', fontSize:11 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RIGHT ══════════════════════════════════════════════════ */}
        <div className="bs-col-right">

          {/* 6 metrics */}
          <div className="bs-metric-grid">
            {[
              { label:'Initial LTV',   value:iLtv,  cls:'' },
              { label:'Final LTV',     value:fLtv,  cls:fLtvCls },
              { label:'Liquidated',    value:d.liquidated?'YES ✗':'NO ✓', cls:liqCls },
              { label:'Total repaid',  value:isLiveData?`$${d.totalRepaid.toLocaleString('en-US',{maximumFractionDigits:0})}`:'Pending', cls:isLiveData?'amber':'' },
              { label:'Deleveraged',   value:isLiveData?`${d.deleveragedPct.toFixed(1)}%`:'Pending', cls:isLiveData?'amber':'' },
              { label:'Final balance', value:`$${d.finalBalance.toLocaleString('en-US',{maximumFractionDigits:0})}`, cls:'' },
            ].map(m=>(
              <div key={m.label} className="bs-metric">
                <div className="bs-metric-label">{m.label}</div>
                <div className={`bs-metric-value${m.cls?' '+m.cls:''}`}>
                  {isRunning ? <span style={{ fontSize:14, opacity:.5 }}>…</span> : m.value}
                </div>
              </div>
            ))}
          </div>

          {/* ETH price + LTV dual-axis */}
          <div className="bs-card">
            <div className="bs-heading">ETH price &amp; LTV over 90 days{!isLiveData&&' (projected from sliders)'}</div>
            <div className="bs-chart-200">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.priceLtv} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="ltvGW" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                  <YAxis yAxisId="p" orientation="left"
                    domain={[Math.min(...d.priceLtv.map(x=>x.price))*.97, Math.max(...d.priceLtv.map(x=>x.price))*1.02]}
                    tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v=>`$${Math.round(v)}`} width={58}/>
                  <YAxis yAxisId="l" orientation="right" domain={[0,100]}
                    tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}
                    tickFormatter={v=>`${v}%`} width={38}/>
                  <Tooltip contentStyle={TT} formatter={(v:number,n:string)=>n==='price'?[`$${v.toLocaleString()}`,'ETH Price']:[`${v.toFixed(1)}%`,'LTV']}/>
                  <ReferenceLine yAxisId="l" y={params.ltvThreshold*100} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}/>
                  <ReferenceLine yAxisId="l" y={82.5} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
                  <ReferenceLine yAxisId="l" y={params.ltvTarget*100} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1}/>
                  <Line yAxisId="p" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} name="price" isAnimationActive={false}/>
                  <Area yAxisId="l" type="monotone" dataKey="ltv" stroke="#ea580c" fill="url(#ltvGW)" strokeWidth={2} dot={false} name="ltv" isAnimationActive={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:8, fontSize:11, color:'#868e96' }}>
              {[['#2563eb','ETH price'],['#ea580c','LTV %'],['#16a34a',`${(params.ltvTarget*100).toFixed(0)}% target`],['#f59e0b',`${(params.ltvThreshold*100).toFixed(0)}% warn`],['#dc2626','82.5% liq']].map(([col,lab])=>(
                <span key={lab} style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ display:'inline-block', width:16, height:3, background:col, borderRadius:2 }}/>
                  {lab}
                </span>
              ))}
            </div>
          </div>

          {/* DeFi rate chart */}
          <div className="bs-card">
            <div className="bs-heading">DeFi borrow rate over 90 days{!isLiveData&&' (projected)'}</div>
            <div className="bs-chart-160">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.rates} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                  <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${Number(v).toFixed(1)}%`} width={42}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[`${v.toFixed(3)}%`,'Borrow Rate']}/>
                  <Line type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} dot={false} isAnimationActive={false}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Waterfall */}
          <div className="bs-card">
            <div className="bs-heading">Loan balance waterfall — PP interventions</div>
            <div className="bs-chart-160">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.waterfall} margin={{ top:4, right:10, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Number(v).toLocaleString()}`} width={64}/>
                  <Tooltip contentStyle={TT} formatter={(v:number)=>[`$${Number(v).toLocaleString()}`,'Balance']}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {d.waterfall.map((pt:WaterfallPoint,i:number)=>(
                      <Cell key={i} fill={CM[pt.color]??'#2563eb'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {!isLiveData && (
              <p style={{ fontSize:11, color:'#868e96', marginTop:6 }}>
                ℹ️ Waterfall shows starting balance only until ACTUS simulation runs and PP events are generated.
              </p>
            )}
          </div>

          {/* Event timeline */}
          <div className="bs-card">
            <div className="bs-heading">Cash flow events (PAM contract)</div>
            <div className="bs-timeline">
              {!isLiveData ? (
                <div style={{ padding:'16px 0' }}>
                  <p style={{ fontSize:12, color:'#495057', marginBottom:8 }}>
                    <strong>Expected events after simulation:</strong>
                  </p>
                  {[
                    ['IED','Feb 18','Loan disbursed',`-$${params.loanAmount.toLocaleString()}`,'#dc2626'],
                    ['RR','Feb 19',`Rate reset to ${(params.rateStart*100).toFixed(1)}%`,`${(params.rateStart*100).toFixed(2)}%`,'#7c3aed'],
                    ['IP','Mar 20','Interest payment (monthly)','~$21','#16a34a'],
                    ['PP','Apr 15','LTV breach → buffer sell (PP1)','~$668','#d97706'],
                    ['PP','Apr 16','LTV breach → buffer sell (PP2)','~$689','#d97706'],
                    ['IP','Apr 20','Interest payment (monthly)','~$17','#16a34a'],
                  ].map(([type,date,desc,val,col],i)=>(
                    <div key={i} className="bs-evt" style={{ opacity:.7 }}>
                      <EvtBadge type={type}/>
                      <span style={{ color:'#868e96', minWidth:52, fontSize:12 }}>{date}</span>
                      <span style={{ color:'#495057', flex:1, fontSize:12 }}>{desc}</span>
                      <span style={{ marginLeft:'auto', fontWeight:600, fontSize:12, color:col }}>{val}</span>
                    </div>
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <p style={{ fontSize:12, color:'#868e96', padding:'16px 0' }}>No events returned from ACTUS.</p>
              ) : (
                timeline.map((e,i)=>{
                  const date = new Date(e.time).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                  const desc = e.type==='IED'?'Loan disbursed':e.type==='PP'?'LTV breach → buffer sell':e.type==='IP'?'Interest payment':e.type==='RR'?'Rate reset':e.type==='MD'?'Maturity':e.type
                  const payStr = e.payoff!==0
                    ? `${e.payoff>0?'+':''}$${Math.abs(e.payoff).toLocaleString('en-US',{maximumFractionDigits:2})}`
                    : e.nominalInterestRate?`${(e.nominalInterestRate*100).toFixed(2)}%`:'—'
                  return (
                    <div key={i} className="bs-evt">
                      <EvtBadge type={e.type}/>
                      <span style={{ color:'#868e96', minWidth:52, fontSize:12 }}>{date}</span>
                      <span style={{ color:'#495057', flex:1, fontSize:12 }}>{desc}</span>
                      <span style={{ marginLeft:'auto', fontWeight:600, fontSize:12, color:e.payoff<0?'#dc2626':e.payoff>0?'#16a34a':'#212529' }}>{payStr}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
