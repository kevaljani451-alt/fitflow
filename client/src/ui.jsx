import {useState,useEffect} from 'react';import {api} from './api';
export const TC={green:'#22C55E',yellow:'#F59E0B',red:'#EF4444'},TL={green:'Quiet',yellow:'Moderate',red:'Busy'};
export const fmtH=h=>`${h%12||12}${h<12?' am':' pm'}`;
export const fmtDT=s=>new Date(s).toLocaleString([],{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
export const stat=p=>p<40?'green':p<75?'yellow':'red';
export function useData(path,every){const [d,setD]=useState(null),[err,setErr]=useState(''),[tick,setTick]=useState(0);
 useEffect(()=>{if(!path){setD(null);return}let on=true;const go=()=>api(path).then(x=>on&&(setD(x),setErr(''))).catch(e=>on&&setErr(e.message));go();const t=every&&setInterval(go,every);return()=>{on=false;clearInterval(t)}},[path,tick]);
 return {d,err,loading:!!path&&!d&&!err,reload:()=>setTick(x=>x+1)}}
export const Spin=()=><div className="p-8 text-center text-slate-400" role="status">Loading…</div>;
export const Empty=({t})=><div className="p-8 text-center text-slate-500">{t}</div>;
export const Msg=({m})=>m?<p role="alert" className={`rounded-xl px-3 py-2 text-sm ${m.ok?'bg-green-100 text-green-800':'bg-red-100 text-red-700'}`}>{m.t}</p>:null;
export const Badge=({s})=><span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{background:TC[s]}}><i className="h-2 w-2 rounded-full bg-white"/>{TL[s]}</span>;
export function Gauge({pct,status}){const c=2*Math.PI*70;return <svg viewBox="0 0 180 180" className="w-44 h-44"><circle cx="90" cy="90" r="70" fill="none" stroke="#E5E7EB" strokeWidth="14"/><circle cx="90" cy="90" r="70" fill="none" stroke={TC[status]} strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-Math.min(pct,100)/100)} transform="rotate(-90 90 90)" style={{transition:'stroke-dashoffset .8s'}}/><text x="90" y="98" textAnchor="middle" fill="#0B1530" style={{fontSize:36,fontWeight:700}}>{pct}%</text><text x="90" y="120" textAnchor="middle" fill="#6B7280" fontSize="12">full</text></svg>}
export function DemoTag({demo}){return demo?<span className="text-xs rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">Demo data – simulated, not live sensors</span>:null}
export function AddForm({fields,onAdd}){const init=Object.fromEntries(fields.map(f=>[f.k,f.d??'']));const [v,setV]=useState(init);const set=k=>e=>setV({...v,[k]:e.target.value});
 return <form className="grid sm:grid-cols-3 gap-2 mt-4" onSubmit={e=>{e.preventDefault();onAdd(v);setV(init)}}>{fields.map(f=>f.o?<select key={f.k} className="inp" value={v[f.k]} onChange={set(f.k)}>{f.o.map(o=><option key={o}>{o}</option>)}</select>:<input key={f.k} required className="inp" aria-label={f.l} placeholder={f.l} type={f.t||'text'} min={f.t==='number'?0:undefined} value={v[f.k]} onChange={set(f.k)}/>)}<button className="btn-g">Add</button></form>}
