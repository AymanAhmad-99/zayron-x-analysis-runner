"use client";
import { useEffect, useState } from "react";

const API = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) || "https://zayron-x-api-preview.aabusabih.workers.dev/api/v1";
type RecordItem = { id:string; title?:string; summary?:string; severity?:string; status?:string; type?:string };

export function LiveLatest(){
  const [items,setItems]=useState<RecordItem[]|null>(null); const [error,setError]=useState(false);
  useEffect(()=>{fetch(`${API}/intelligence?limit=25`,{headers:{accept:"application/json"}}).then(r=>r.ok?r.json():Promise.reject()).then(p=>setItems(Array.isArray(p.reports)?p.reports:[])).catch(()=>setError(true));},[]);
  if(error)return <div className="state-panel error"><strong>INTELLIGENCE UNAVAILABLE</strong><span>Preview API could not be reached from the browser.</span></div>;
  if(!items)return <div className="state-panel"><strong>LOADING INTELLIGENCE</strong><span>Retrieving current records from the ZAYRON-X API.</span></div>;
  if(!items.length)return <div className="state-panel"><strong>NO CURRENT RECORDS</strong><span>The connected intelligence service returned an empty feed.</span></div>;
  return <div className="latest live-latest">{items.map((item,i)=><div className="intel-row" key={item.id||i}><span>{item.type||"INTELLIGENCE"}</span><strong>{item.title||item.id}</strong><b>{item.severity||"UNKNOWN"}</b><i>{item.status||"UNASSESSED"}</i><small>API RECORD</small><time>LIVE</time></div>)}</div>;
}

export function SearchExperience(){
  const [query,setQuery]=useState(""); const [items,setItems]=useState<RecordItem[]>([]); const [loading,setLoading]=useState(false); const [searched,setSearched]=useState(false);
  async function submit(e:React.FormEvent){e.preventDefault();if(!query.trim())return;setLoading(true);setSearched(true);try{const r=await fetch(`${API}/search?q=${encodeURIComponent(query)}`,{headers:{accept:"application/json"}});const p=await r.json();const d=p.data||{};setItems([...(d.vulnerabilities||[]),...(d.malware||[]),...(d.actors||[]),...(d.iocs||[]),...(d.events||[]),...(d.articles||[])]);}catch{setItems([]);}finally{setLoading(false);}}
  return <><form className="search-field search-form" onSubmit={submit}><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search vulnerabilities, malware, exploits, actors, intelligence..." aria-label="Search intelligence"/><button type="submit">↗</button></form>{loading&&<div className="search-result-state">SEARCHING THE INTELLIGENCE INDEX</div>}{searched&&!loading&&!items.length&&<div className="search-result-state">NO MATCHES FROM THE CONNECTED API</div>}{!!items.length&&<div className="search-results">{items.map((item,i)=><a href={item.type?`/intelligence/${item.type}/${item.id}`:`/intelligence/${item.id}`} key={item.id||i}><b>{item.type||"RECORD"}</b><strong>{item.title||item.id}</strong><span>{item.summary||"Source record available"}</span></a>)}</div>}</>;
}

export function LiveHeroStatus(){const [state,setState]=useState<"loading"|"empty"|"ready"|"error">("loading");useEffect(()=>{fetch(`${API}/intelligence?limit=1`).then(r=>r.ok?r.json():Promise.reject()).then(p=>setState(Array.isArray(p.reports)&&p.reports.length?"ready":"empty")).catch(()=>setState("error"));},[]);return <small className={`live-status ${state}`}>{state==="ready"?"CONNECTED INTELLIGENCE":state==="empty"?"CONNECTED · NO CURRENT RECORDS":state==="error"?"API UNAVAILABLE":"CONNECTING TO API"}</small>}
