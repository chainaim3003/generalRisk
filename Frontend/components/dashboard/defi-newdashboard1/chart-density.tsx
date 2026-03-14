'use client'
/** chart-density.tsx — light theme */
import React from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { EventCounts } from './types'
const TT = { backgroundColor:'#fff', border:'1px solid #dee2e6', borderRadius:8, color:'#212529', fontSize:11, padding:'6px 10px' }
const EC: Record<string,string> = { RR:'#2563eb', AD:'#059669', PP:'#d97706', IP:'#ea580c', IED:'#7c3aed', MD:'#16a34a' }
const EL: Record<string,string> = { RR:'Rate Reset', AD:'Monitoring', PP:'Prepayment', IP:'Interest Pay', IED:'Initial Exchange', MD:'Maturity' }
export function ChartDensity({ counts, height=200 }: { counts: EventCounts; height?: number }) {
  const total = Object.values(counts).reduce((a,b)=>a+b,0)
  const data = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([t,c])=>({ type:t, count:c, label:EL[t]??t, fill:EC[t]??'#6b7280' }))
  if (!data.length) return <div style={{ height, display:'flex', alignItems:'center', justifyContent:'center', border:'1px dashed #dee2e6', borderRadius:8, color:'#868e96', fontSize:12 }}>No data</div>
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={data} margin={{ top:4, right:36, left:36, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" horizontal={false}/>
          <XAxis type="number" tick={{ fontSize:10, fill:'#868e96' }} tickLine={false} axisLine={false}/>
          <YAxis type="category" dataKey="type" tick={{ fontSize:11, fill:'#495057' }} tickLine={false} axisLine={false} width={30}/>
          <Tooltip contentStyle={TT} formatter={(v:number,_n:string,p:{payload?:{label?:string}})=>[`${v} (${total>0?((v/total)*100).toFixed(1):0}%)`,p?.payload?.label??'']}/>
          <Bar dataKey="count" radius={[0,4,4,0]}>
            {data.map((d,i)=><Cell key={i} fill={d.fill}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
