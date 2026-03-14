'use client'
/** chart-eth-ltv.tsx — light theme */
import React from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { PriceLtvPoint } from './types'
const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
export function ChartEthLtv({ data, ltvThreshold=75, liqThreshold=82.5, height=200 }: { data: PriceLtvPoint[]; ltvThreshold?: number; liqThreshold?: number; height?: number }) {
  if (!data.length) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed #dee2e6', borderRadius:8, color:'#868e96', fontSize:12 }}>No data</div>
  const pMin = Math.min(...data.map(d=>d.price)) * .97
  const pMax = Math.max(...data.map(d=>d.price)) * 1.02
  const tInt = Math.max(1, Math.floor(data.length/8))
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top:4, right:10, left:0, bottom:0 }}>
          <defs><linearGradient id="ltvGradCEL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ea580c" stopOpacity={0.15}/><stop offset="95%" stopColor="#ea580c" stopOpacity={0}/></linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5"/>
          <XAxis dataKey="date" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} interval={tInt}/>
          <YAxis yAxisId="p" orientation="left" domain={[pMin,pMax]} tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`$${Math.round(v)}`} width={58}/>
          <YAxis yAxisId="l" orientation="right" domain={[0,100]} tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} width={38}/>
          <Tooltip contentStyle={TT} formatter={(v:number,n:string)=>n==='price'?[`$${v.toLocaleString()}`,'ETH Price']:[`${v.toFixed(1)}%`,'LTV']}/>
          <ReferenceLine yAxisId="l" y={ltvThreshold} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1}/>
          <ReferenceLine yAxisId="l" y={liqThreshold} stroke="#dc2626" strokeDasharray="4 3" strokeWidth={1}/>
          <Line yAxisId="p" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={false} name="price" isAnimationActive={false}/>
          <Area yAxisId="l" type="monotone" dataKey="ltv" stroke="#ea580c" fill="url(#ltvGradCEL)" strokeWidth={2} dot={false} name="ltv" isAnimationActive={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
