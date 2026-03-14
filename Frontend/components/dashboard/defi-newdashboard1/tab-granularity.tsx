'use client'
/**
 * tab-granularity.tsx — Tab 2
 * Always has data via displaySeries (preview or live).
 * Shows 4 switchable pill charts + 2×2 mini grid + density + table.
 */
import React, { useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { DerivedSeries, SimParams } from './types'

const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
type GranView = 'ltv' | 'rate' | 'buffer' | 'collateral'
const EC: Record<string,string> = { RR:'#2563eb', AD:'#059669', PP:'#d97706', IP:'#ea580c', IED:'#7c3aed', MD:'#16a34a' }
const EL: Record<string,string> = { RR:'Rate Reset', AD:'Monitoring (AD)', PP:'Prepayment', IP:'Interest Pay', IED:'Initial Exchange', MD:'Maturity' }

export function TabGranularity({ displaySeries: d, params, isLiveData, isRunning }: {
  displaySeries: DerivedSeries; params: SimParams; isLiveData: boolean; isRunning: boolean
}) {
  const [view, setView] = useState<GranView>('ltv')
  const tInt = Math.max(1, Math.floor(d.priceLtv.length / 8))
  const totalEvents = Object.values(d.eventCounts).reduce((a,b)=>a+b, 0)
  const densityData = Object.entries(d.eventCounts).sort((a,b)=>b[1]-a[1]).map(([type,count])=>({ type, count, label:EL[type]??type }))

  const views = [
    { key:'ltv' as GranView, label:'LTV' },
    { key:'rate' as GranView, label:'DeFi Rate' },
    { key:'buffer' as GranView, label:'Buffer ETH' },
    { key:'collateral' as GranView, label:'Collateral USD' },
  ]

  const mainLabels: Record<GranView,string> = {
    ltv:'Daily LTV over 90 days',
    rate:'Daily DeFi borrow rate',
    buffer:'Buffer ETH remaining',
    collateral:'Collateral USD value',
  }

  // Summary stats always shown
  const ethDrawdown = d.priceLtv.length > 0
    ? ((d.priceLtv[d.priceLtv.length-1].price - d.priceLtv[0].price) / d.priceLtv[0].price * 100).toFixed(1)
    : '0.0'
  const rateChange = d.rates.length > 0
    ? (d.rates[d.rates.length-1].rate - d.rates[0].rate).toFixed(2)
    : '0.00'
  const ltvChange = d.priceLtv.length > 0
    ? (d.finalLtv - d.initialLtv).toFixed(1)
    : '0.0'

  return (
    <div style={{ padding:20 }}>
      {isLiveData
        ? <div className="bs-live-banner">✅ <strong>Live ACTUS data</strong> — 90 daily data points from real simulation. {totalEvents} total events across 3 contracts.</div>
        : <div className="bs-preview-banner">📊 <strong>Preview mode</strong> — showing projected 90-day scenario. Run Simulation to see real ACTUS output with PP events and rate resets.</div>
      }

      {/* Summary KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:16 }}>
        {[
          { label:'ETH price change', value:`${ethDrawdown}%`, color: parseFloat(ethDrawdown)<0?'#dc2626':'#16a34a' },
          { label:'Rate increase', value:`+${rateChange}pp`, color:'#7c3aed' },
          { label:'LTV change', value:`+${ltvChange}pp`, color: parseFloat(ltvChange)>0?'#ea580c':'#16a34a' },
          { label:'PP events', value:isLiveData?String(d.ppEvents.length):'Pending', color:'#d97706' },
        ].map(s=>(
          <div key={s.label} className="bs-metric">
            <div className="bs-metric-label">{s.label}</div>
            <div className="bs-metric-value" style={{ fontSize:20, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Pill tabs */}
      <div className="bs-gran-tabs">
        {views.map(v=>(
          <button key={v.key} type="button" className={`bs-gran-tab${view===v.key?' active':''}`} onClick={()=>setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="bs-layout">
        <div className="bs-col-right">
          {/* Main chart */}
          <div className="bs-card">
            <div className="bs-heading">{mainLabels[view]}{!isLiveData&&' (projected)'}</div>
            <div className="bs-chart-240">
              <ResponsiveContainer width="100%" height="100%">
                {view==='ltv' ? (
                  <AreaChart data={d.priceLtv} margin={{ top:4,right:10,left:0,bottom:0 }}>
                    <defs><linearGradient id="mLtv2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.18}/><stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                    <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} width={36}/>
                    <Tooltip contentStyle={TT} formatter={(v:number)=>[`${v.toFixed(2)}%`,'LTV']}/>
                    <ReferenceLine y={params.ltvThreshold*100} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}/>
                    <ReferenceLine y={params.ltvTarget*100} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1}/>
                    <ReferenceLine y={82.5} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
                    <Area type="monotone" dataKey="ltv" stroke="#ea580c" fill="url(#mLtv2)" strokeWidth={2} dot={false} isAnimationActive={false}/>
                  </AreaChart>
                ) : view==='rate' ? (
                  <LineChart data={d.rates} margin={{ top:4,right:10,left:0,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                    <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${Number(v).toFixed(1)}%`} width={42}/>
                    <Tooltip contentStyle={TT} formatter={(v:number)=>[`${v.toFixed(3)}%`,'Rate']}/>
                    <Line type="monotone" dataKey="rate" stroke="#7c3aed" strokeWidth={2} dot={false} isAnimationActive={false}/>
                  </LineChart>
                ) : view==='buffer' ? (
                  <LineChart data={d.bufferSeries} margin={{ top:4,right:10,left:0,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                    <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${Number(v).toFixed(2)} ETH`} width={58}/>
                    <Tooltip contentStyle={TT} formatter={(v:number)=>[`${v.toFixed(4)} ETH`,'Buffer']}/>
                    <Line type="monotone" dataKey="bufferEth" stroke="#d97706" strokeWidth={2} dot={false} isAnimationActive={false}/>
                  </LineChart>
                ) : (
                  <AreaChart data={d.collateralUsdSeries} margin={{ top:4,right:10,left:0,bottom:0 }}>
                    <defs><linearGradient id="mCol2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
                    <YAxis tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(Number(v)).toLocaleString()}`} width={62}/>
                    <Tooltip contentStyle={TT} formatter={(v:number)=>[`$${Number(v).toLocaleString()}`,'Collateral USD']}/>
                    <Area type="monotone" dataKey="collateralUsd" stroke="#2563eb" fill="url(#mCol2)" strokeWidth={2} dot={false} isAnimationActive={false}/>
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2×2 mini grid */}
          <div className="bs-2col">
            {([
              { title:'LTV (actual)', color:'#ea580c', key:'ltv' },
              { title:'DeFi Rate',    color:'#7c3aed', key:'rate' },
              { title:'Buffer ETH',   color:'#d97706', key:'buf' },
              { title:'Collateral USD', color:'#2563eb', key:'col' },
            ] as const).map(mini=>(
              <div key={mini.key} className="bs-mini-card">
                <div className="bs-mini-title">{mini.title}</div>
                <div className="bs-chart-160">
                  <ResponsiveContainer width="100%" height="100%">
                    {mini.key==='ltv' ? (
                      <AreaChart data={d.priceLtv}>
                        <defs><linearGradient id={`mg2${mini.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={mini.color} stopOpacity={0.2}/><stop offset="95%" stopColor={mini.color} stopOpacity={0}/>
                        </linearGradient></defs>
                        <XAxis dataKey="date" hide/><YAxis domain={[0,100]} hide/>
                        <ReferenceLine y={params.ltvThreshold*100} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1}/>
                        <Area type="monotone" dataKey="ltv" stroke={mini.color} fill={`url(#mg2${mini.key})`} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                      </AreaChart>
                    ) : mini.key==='rate' ? (
                      <LineChart data={d.rates}><XAxis hide/><YAxis hide/>
                        <Line type="monotone" dataKey="rate" stroke={mini.color} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                      </LineChart>
                    ) : mini.key==='buf' ? (
                      <LineChart data={d.bufferSeries}><XAxis hide/><YAxis hide/>
                        <Line type="monotone" dataKey="bufferEth" stroke={mini.color} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                      </LineChart>
                    ) : (
                      <AreaChart data={d.collateralUsdSeries}>
                        <defs><linearGradient id={`mg2${mini.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={mini.color} stopOpacity={0.2}/><stop offset="95%" stopColor={mini.color} stopOpacity={0}/>
                        </linearGradient></defs>
                        <XAxis hide/><YAxis hide/>
                        <Area type="monotone" dataKey="collateralUsd" stroke={mini.color} fill={`url(#mg2${mini.key})`} strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: density + table */}
        <div className="bs-col-left">
          <div className="bs-card">
            <div className="bs-heading">Event density{isLiveData?` (${totalEvents} total)`:' (expected)'}</div>
            <div style={{ height:isLiveData&&densityData.length>0?200:120 }}>
              {isLiveData && densityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={densityData} margin={{ top:4, right:36, left:36, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}/>
                    <YAxis type="category" dataKey="type" tick={{ fontSize:11, fill:'#495057' }} tickLine={false} axisLine={false} width={30}/>
                    <Tooltip contentStyle={TT} formatter={(v:number,_n:string,p:{payload?:{label?:string}})=>[`${v} events`,p?.payload?.label??'']}/>
                    <Bar dataKey="count" radius={[0,4,4,0]}>
                      {densityData.map((d,i)=><Cell key={i} fill={EC[d.type]??'#6b7280'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div>
                  {[['RR','89','Rate resets (daily)','#2563eb'],['AD','89','Monitoring events','#059669'],['PP','2','Buffer sell events','#d97706'],['IP','3','Interest payments','#ea580c'],['IED','1','Initial exchange','#7c3aed']].map(([type,count,label,col])=>(
                    <div key={type} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:12 }}>
                      <span style={{ width:24, height:8, background:col, borderRadius:4, flexShrink:0 }}/>
                      <span style={{ fontWeight:700, width:24, color:col }}>{type}</span>
                      <span style={{ flex:1, color:'#868e96' }}>{label}</span>
                      <span style={{ fontWeight:600, color:'#212529' }}>~{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bs-card">
            <div className="bs-heading">Comparison table</div>
            <table className="bs-cmp-table">
              <thead><tr><th>Feature</th><th>Daily</th><th>Block-level</th></tr></thead>
              <tbody>
                {[
                  ['Rate resets/day','1','7,200'],
                  ['LTV checks/day','1','7,200'],
                  ['Flash crash detect','❌','✅'],
                  ['Liq. precision','Day','Second'],
                  ['Events (90 days)',isLiveData?String(totalEvents):'~184','~648,000'],
                ].map(([f,daily,block])=>(
                  <tr key={f as string}><td>{f}</td><td>{daily}</td><td>{block}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bs-card">
            <div className="bs-heading">V5 state sync explained</div>
            <div style={{ fontSize:11, color:'#495057', lineHeight:1.7 }}>
              <div style={{ background:'#eff6ff', borderRadius:6, padding:'8px 10px', marginBottom:8 }}>
                <strong style={{ color:'#1d4ed8' }}>The fix:</strong> Monitoring at <code style={{ fontFamily:'monospace' }}>T00:00:00.001</code> (+1 ms)
              </div>
              <p>Contract events (PP, IP, RR) execute at <code style={{ fontFamily:'monospace' }}>T00:00:00</code>.</p>
              <p style={{ marginTop:4 }}>BufferLTVModel monitoring reads the <em>updated</em> state at <code style={{ fontFamily:'monospace' }}>T00:00:00.001</code>.</p>
              <p style={{ marginTop:4, color:'#dc2626' }}>Without fix: stale state → wrong LTV → unnecessary interventions.</p>
              <p style={{ marginTop:4, color:'#16a34a' }}>With V5 fix: accurate LTV → correct buffer sell amounts.</p>
            </div>
          </div>

          <div className="bs-card">
            <div className="bs-heading">Liquidation timing precision</div>
            <div style={{ fontSize:12, lineHeight:1.7, color:'#495057' }}>
              <div style={{ marginBottom:8 }}>
                <span className="bs-badge bs-badge-PP">Daily</span>
                &nbsp; Recorded: <strong style={{ color:'#212529' }}>
                  {isLiveData && d.ppEvents[0]
                    ? new Date(d.ppEvents[0].time).toLocaleDateString('en-US',{month:'short',day:'numeric'})
                    : 'Apr 15 (expected)'}
                </strong>
              </div>
              <div>
                <span style={{ background:'#d1fae5', color:'#065f46', padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700 }}>Block</span>
                &nbsp; Recorded: <strong style={{ color:'#212529' }}>
                  {isLiveData && d.ppEvents[0]
                    ? new Date(d.ppEvents[0].time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
                    : 'Apr 15 · 00:00:00.001 (expected)'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
