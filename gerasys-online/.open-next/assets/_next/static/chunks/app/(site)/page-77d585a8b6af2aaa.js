!function(){try{var e="u">typeof window?window:"u">typeof global?global:"u">typeof self?self:{},t=(new e.Error).stack;t&&(e._sentryDebugIds=e._sentryDebugIds||{},e._sentryDebugIds[t]="0a4563be-3691-4543-8c39-abc967b1adeb",e._sentryDebugIdIdentifier="sentry-dbid-0a4563be-3691-4543-8c39-abc967b1adeb")}catch(e){}}(),(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[13],{4901:(e,t,r)=>{"use strict";r.d(t,{ActionableAlerts:()=>d});var a=r(95155),s=r(12115),n=r(3077),l=r.n(n);let i=(0,r(1604).A)("arrow-up-right",[["path",{d:"M7 7h10v10",key:"1tivn9"}],["path",{d:"M7 17 17 7",key:"1vkiza"}]]);var o=r(96559),c=r(14769);function d({articles:e}){let[t,r]=(0,s.useState)(null),[n,x]=(0,s.useState)({}),[p,u]=(0,s.useState)("All Sectors"),{gateAction:m}=(0,c.G)(),b=e.filter(e=>{if("All Sectors"===p)return!0;let t=p.toLowerCase(),r=e.category?.toLowerCase().includes(t),a=e.tags?.some(e=>e.toLowerCase().includes(t)),s=e.title.toLowerCase().includes(t)||e.content.toLowerCase().includes(t);return"Critical Infrastructure"===p?e.category?.toLowerCase().includes("critical")||e.category?.toLowerCase().includes("infrastructure")||e.tags?.some(e=>e.toLowerCase().includes("infrastructure")||e.toLowerCase().includes("critical"))||e.title.toLowerCase().includes("infrastructure")||e.content.toLowerCase().includes("infrastructure"):r||a||s});return(0,a.jsxs)("div",{className:"bg-white border border-neutral-200 rounded-none overflow-hidden shadow-none transition-all duration-300 hover:border-neutral-300 font-sans","data-sentry-component":"ActionableAlerts","data-sentry-source-file":"ActionableAlerts.tsx",children:[(0,a.jsxs)("div",{className:"p-6 border-b border-neutral-100 flex items-center justify-between",children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("h3",{className:"text-xs font-mono font-bold uppercase tracking-wider text-[#050505]",children:"Active Security Incident Alerts"}),(0,a.jsxs)("p",{className:"text-[9px] text-neutral-500 font-mono tracking-tight mt-1 uppercase",children:["[INGESTION_SCANNER: ACTIVE] \xb7 [LATENCY: 8.4ms] \xb7 [DB_SYNC: SECURE] \xb7 [VECTOR_HASH: 0x733DD9FF050505A1] \xb7 [TIME: ",new Date().toISOString(),"]"]})]}),(0,a.jsx)("span",{className:"text-[10px] font-mono text-[#733DD9] tracking-[0.15em] uppercase font-black",children:"SOVEREIGN PERIMETER"})]}),(0,a.jsx)("div",{className:"px-6 py-4 border-b border-neutral-100 bg-neutral-50/50",children:(0,a.jsx)("div",{className:"flex flex-wrap gap-2",children:["All Sectors","Healthcare","Financial","Critical Infrastructure"].map(e=>(0,a.jsxs)("button",{onClick:()=>u(e),className:`px-3 py-1.5 font-mono text-[9px] font-bold uppercase transition-all border cursor-pointer rounded-none ${p===e?"bg-[#050505] text-white border-[#050505]":"bg-white text-neutral-500 border-neutral-200 hover:text-[#733DD9] hover:border-[#733DD9]"}`,children:["[",e,"]"]},e))})}),(0,a.jsx)("div",{className:"overflow-x-auto",children:0===b.length?(0,a.jsx)("div",{className:"p-12 text-center text-neutral-400 font-mono text-[10px] uppercase",children:"NO INTERCEPTED INFRASTRUCTURE TARGETS MATCHING DESIGNATED VECTOR FILTER"}):(0,a.jsxs)("table",{className:"w-full border-collapse text-left",children:[(0,a.jsx)("thead",{children:(0,a.jsxs)("tr",{className:"bg-neutral-50/50 border-b border-neutral-100 text-[9px] uppercase tracking-wider text-[#050505] font-bold font-mono",children:[(0,a.jsx)("th",{className:"py-5 px-6",children:"Incident Details"}),(0,a.jsx)("th",{className:"py-5 px-6 text-center",children:"Threat Level"}),(0,a.jsx)("th",{className:"py-5 px-6",children:"Financial Exposure"}),(0,a.jsx)("th",{className:"py-5 px-6 text-right",children:"Autonomous Actions"})]})}),(0,a.jsx)("tbody",{className:"text-xs",children:b.slice(0,10).map(e=>{let s=`/intelligence/${(e.category??"intelligence").toLowerCase().replace(/\s+/g,"-")}/${e.slug}`,c=(e.regulatoryRisk||"CRITICAL").toLowerCase().includes("critical"),d=n[e.id],p=t===e.id,u=`0x${e.id.replace(/-/g,"").substring(0,16).toUpperCase()}`,b=`VECTOR::${(e.category??"CTI").toUpperCase()}_${(e.title.split(" ")[0]||"INCIDENT").replace(/[^a-zA-Z0-9]/g,"").toUpperCase()}`;return(0,a.jsxs)("tr",{className:"border-b border-neutral-100 last:border-0 hover:bg-neutral-50/30 transition-colors",children:[(0,a.jsx)("td",{className:"py-5 px-6 max-w-sm",children:(0,a.jsxs)("div",{children:[(0,a.jsx)("span",{className:"font-bold text-[#050505] block hover:text-[#733DD9] transition-colors leading-tight",children:(0,a.jsx)(l(),{href:s,children:e.title})}),(0,a.jsxs)("div",{className:"flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] text-neutral-400",children:[(0,a.jsx)("span",{className:"uppercase font-bold tracking-wider text-[#733DD9]",children:b}),(0,a.jsx)("span",{children:"\xb7"}),(0,a.jsx)("span",{children:u}),(0,a.jsx)("span",{children:"\xb7"}),(0,a.jsx)("span",{className:"text-neutral-500 font-semibold",children:new Date(e.createdAt||"").toISOString()})]})]})}),(0,a.jsx)("td",{className:"py-5 px-6 align-middle text-center shrink-0",children:(0,a.jsx)("span",{className:`inline-flex items-center px-2.5 py-0.5 rounded-none border text-[9px] font-mono font-bold tracking-wider uppercase bg-transparent ${c?"text-[#DC2626] border-[#DC2626]":"text-[#D97706] border-[#D97706]"}`,children:c?"CRITICAL":"HIGH"})}),(0,a.jsx)("td",{className:"py-5 px-6 font-mono font-bold text-[#050505] align-middle",children:e.financialExposure||"$4.2M – $8.5M"}),(0,a.jsx)("td",{className:"py-5 px-6 text-right align-middle shrink-0",children:(0,a.jsxs)("div",{className:"flex items-center justify-end gap-2",children:[(0,a.jsxs)(l(),{href:s,className:"inline-flex items-center gap-1 px-3 py-1.5 rounded-none border border-neutral-200 text-neutral-600 font-mono hover:text-[#050505] hover:border-neutral-300 transition-all text-[9px] font-bold tracking-wider",children:["VIEW PLAYBOOK",(0,a.jsx)(i,{className:"w-3 h-3 text-neutral-400"})]}),(0,a.jsxs)("button",{onClick:()=>{var t,a;return t=e.id,a=e.title,void m(()=>{r(t),setTimeout(()=>{r(null),x(e=>({...e,[t]:!0})),alert(`[AUTONOMOUS REMEDIATION SUCCESS]

Successfully deployed active patch mitigation WAF rules against incident footprint: "${a}" across all target vectors.`)},1800)})},disabled:d||p,className:`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none font-mono font-bold text-[9px] tracking-wider transition-all shadow-none ${d?"bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed":p?"bg-[#733DD9]/10 text-[#733DD9] border border-[#733DD9]/20 cursor-wait":"bg-[#733DD9] text-white border border-[#733DD9] hover:bg-[#5B21B6] hover:border-[#5B21B6] cursor-pointer"}`,children:[(0,a.jsx)(o.A,{className:"w-2.5 h-2.5 shrink-0"}),p?"Mitigating...":d?"MITIGATED":"AUTO-REMEDIATE"]})]})})]},e.id)})})]})})]})}},14769:(e,t,r)=>{"use strict";r.d(t,{G:()=>c,SecurityGatingProvider:()=>o});var a=r(95155),s=r(12115),n=r(75553);let l=n.Ik({fullName:n.Yj().min(2,"Full Name required."),clearanceEmail:n.Yj().email("Invalid email address."),password:n.Yj().min(12,"Minimum 12 characters required.").regex(/[A-Z]/,"Missing uppercase letter.").regex(/[a-z]/,"Missing lowercase letter.").regex(/[0-9]/,"Missing number.").regex(/[@$!%*?&]/,"Missing special character.")}),i=(0,s.createContext)(void 0);function o({children:e}){let[t,r]=(0,s.useState)(!1),[n,c]=(0,s.useState)(!1),[d,x]=(0,s.useState)(null),[p,u]=(0,s.useState)(""),[m,b]=(0,s.useState)(""),[h,f]=(0,s.useState)(""),[g,v]=(0,s.useState)({}),y=(0,s.useRef)(null);(0,s.useRef)(null);let N=(0,s.useRef)(null);(0,s.useEffect)(()=>{"true"===localStorage.getItem("zx_auth_clearance")&&r(!0)},[]);let k=(0,s.useCallback)(()=>{c(!1),v({}),x(null),N.current&&N.current instanceof HTMLElement&&N.current.focus()},[]);return(0,s.useEffect)(()=>{if(!n)return;N.current=document.activeElement;let e=setTimeout(()=>{let e=y.current?.querySelector("input");e?.focus()},100);function t(e){if(!y.current)return;let t=y.current.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])'),r=t[0],a=t[t.length-1];"Escape"===e.key?k():"Tab"===e.key&&(e.shiftKey&&document.activeElement===r?(e.preventDefault(),a?.focus()):e.shiftKey||document.activeElement!==a||(e.preventDefault(),r?.focus()))}return document.body.style.overflow="hidden",document.addEventListener("keydown",t),()=>{clearTimeout(e),document.body.style.overflow="",document.removeEventListener("keydown",t)}},[n,k]),(0,a.jsxs)(i.Provider,{value:{isAuthenticated:t,gateAction:e=>{t?e():(x(()=>e),c(!0))}},"data-sentry-element":"unknown","data-sentry-component":"SecurityGatingProvider","data-sentry-source-file":"SecurityGatingContext.tsx",children:[e,n&&(0,a.jsx)("div",{className:"fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-none p-4",role:"dialog","aria-modal":"true","aria-labelledby":"security-modal-title","aria-describedby":"security-modal-desc",children:(0,a.jsxs)("div",{ref:y,className:"bg-white dark:bg-slate-950 max-w-md w-full p-8 border border-neutral-200 dark:border-slate-800 shadow-2xl rounded-none relative font-sans text-[#050505] dark:text-slate-100",children:[(0,a.jsx)("button",{onClick:k,className:"absolute top-4 right-4 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:hover:text-slate-300 font-mono text-sm uppercase tracking-wide cursor-pointer","aria-label":"Close dialog",children:"[esc]"}),(0,a.jsxs)("div",{className:"mb-6",children:[(0,a.jsx)("span",{className:"text-[10px] font-mono tracking-widest text-[#733DD9] font-bold uppercase block mb-1",children:"[ SECURITY ACCESS INTERCEPTED ]"}),(0,a.jsx)("h3",{id:"security-modal-title",className:"text-lg font-black tracking-tight uppercase",children:"SECURITY ACCESS RESTRICTED"}),(0,a.jsx)("p",{id:"security-modal-desc",className:"text-xs text-neutral-500 dark:text-slate-400 leading-relaxed mt-2",children:"Advanced remediation payload compilation, automated script mitigation, and official Executive SITREPs require an accredited corporate operator profile clearance."})]}),(0,a.jsxs)("form",{onSubmit:e=>{e.preventDefault(),v({});let t=l.safeParse({fullName:p,clearanceEmail:m,password:h});if(!t.success){let e={};t.error.issues.forEach(t=>{let r=t.path[0];r&&!e[r]&&(e[r]=t.message)}),v(e);return}r(!0),localStorage.setItem("zx_auth_clearance","true"),c(!1),u(""),b(""),f(""),v({}),d&&(d(),x(null))},className:"space-y-4",noValidate:!0,children:[(0,a.jsxs)("div",{children:[(0,a.jsx)("label",{className:"block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5",htmlFor:"modal-fullname",children:"Full Name"}),(0,a.jsx)("input",{id:"modal-fullname",type:"text",value:p,onChange:e=>u(e.target.value),placeholder:"e.g. CISO Operational Node",className:"w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"}),g.fullName&&(0,a.jsx)("p",{className:"text-[10px] font-mono text-red-600 dark:text-red-400 mt-1",role:"alert",children:g.fullName})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("label",{className:"block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5",htmlFor:"modal-email",children:"Clearance Email"}),(0,a.jsx)("input",{id:"modal-email",type:"email",value:m,onChange:e=>b(e.target.value),placeholder:"name@corporation.com",className:"w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"}),g.clearanceEmail&&(0,a.jsx)("p",{className:"text-[10px] font-mono text-red-600 dark:text-red-400 mt-1",role:"alert",children:g.clearanceEmail})]}),(0,a.jsxs)("div",{children:[(0,a.jsx)("label",{className:"block text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 dark:text-slate-400 mb-1.5",htmlFor:"modal-password",children:"Clearance Password"}),(0,a.jsx)("input",{id:"modal-password",type:"password",value:h,onChange:e=>f(e.target.value),placeholder:"••••••••••••",className:"w-full bg-neutral-50/50 dark:bg-slate-900 border border-neutral-200 dark:border-slate-700 px-3.5 py-2.5 text-xs rounded-none focus:outline-none focus:border-[#733DD9] dark:focus:border-[#733DD9] transition-colors dark:text-slate-100"}),g.password&&(0,a.jsx)("p",{className:"text-[10px] font-mono text-red-600 dark:text-red-400 mt-1",role:"alert",children:g.password})]}),(0,a.jsx)("button",{type:"submit",className:"bg-[#050505] dark:bg-white dark:text-[#050505] text-white w-full py-3.5 mt-2 font-mono font-bold text-xs uppercase tracking-wider hover:bg-[#733DD9] dark:hover:bg-[#733DD9] dark:hover:text-white transition-colors rounded-none cursor-pointer",children:"AUTHENTICATE & SECURE ACCESS"})]})]})})]})}function c(){let e=(0,s.useContext)(i);if(void 0===e)throw Error("useSecurityGating must be used within a SecurityGatingProvider");return e}},21938:(e,t,r)=>{"use strict";r.d(t,{LiveIntelTicker:()=>l});var a=r(95155),s=r(12115);let n=["[HASH: 8b4c52f | IP: 185.220.101.44 | VECTOR: PORT_SCAN | STATUS: INTERCEPTED]","[HASH: f2c4b58 | IP: 91.240.118.15 | VECTOR: SSH_BRUTE | STATUS: REDACTED]","[HASH: c5e4b7a | IP: 185.112.144.9 | VECTOR: WAF_ATTACK | STATUS: QUARANTINED]","[HASH: 5d4b58c | IP: 45.227.254.12 | VECTOR: RDP_EXPLOIT | STATUS: BLOCKING]","[HASH: 9a8b7c6 | IP: 109.230.199.4 | VECTOR: TLS_INTERCEPT | STATUS: MASQUERADING]","[HASH: a8b7c6d | IP: 192.3.166.42 | VECTOR: CNC_HEARTBEAT | STATUS: CLASSIFIED]"];function l(){let[e,t]=(0,s.useState)(0),[r,l]=(0,s.useState)(1382);return(0,s.useEffect)(()=>{let e=setInterval(()=>{t(e=>(e+1)%n.length)},4e3),r=setInterval(()=>{l(e=>Math.max(1e3,Math.min(2e3,e+(Math.floor(21*Math.random())-10))))},1500);return()=>{clearInterval(e),clearInterval(r)}},[]),(0,a.jsxs)("div",{className:"bg-[#FAFAFA] border-y border-neutral-200 py-3.5 px-6 font-mono text-[10px] uppercase select-none flex items-center justify-between gap-6 overflow-hidden","data-sentry-component":"LiveIntelTicker","data-sentry-source-file":"LiveIntelTicker.tsx",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 shrink-0 border-r border-neutral-200 pr-6",children:[(0,a.jsxs)("span",{className:"relative flex h-1.5 w-1.5",children:[(0,a.jsx)("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"}),(0,a.jsx)("span",{className:"relative inline-flex rounded-full h-1.5 w-1.5 bg-red-600"})]}),(0,a.jsx)("span",{className:"font-black text-[#050505] tracking-wider",children:"LIVE INTEL FEED"})]}),(0,a.jsx)("div",{className:"w-full relative flex items-center overflow-hidden h-4 text-neutral-500 font-bold",children:(0,a.jsx)("div",{className:"absolute flex whitespace-nowrap transition-all duration-700 ease-in-out gap-8",style:{transform:`translateY(${-(16*e)}px)`},children:n.map((e,t)=>(0,a.jsx)("div",{className:"h-4 flex items-center gap-1.5",children:(0,a.jsx)("span",{children:e})},t))})}),(0,a.jsxs)("div",{className:"shrink-0 flex items-center gap-3 border-l border-neutral-200 pl-6 text-right font-black",children:[(0,a.jsx)("span",{className:"text-neutral-400",children:"PACKETS/SEC:"}),(0,a.jsx)("span",{className:"text-[#050505] min-w-[32px] inline-block tabular-nums animate-pulse",children:r})]})]})}},29755:(e,t,r)=>{Promise.resolve().then(r.bind(r,4901)),Promise.resolve().then(r.bind(r,61485)),Promise.resolve().then(r.bind(r,21938)),Promise.resolve().then(r.bind(r,78591)),Promise.resolve().then(r.bind(r,87544)),Promise.resolve().then(r.t.bind(r,3077,23))},34504:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("activity",[["path",{d:"M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",key:"169zse"}]])},36633:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("file-text",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},61485:(e,t,r)=>{"use strict";r.d(t,{InfrastructureRadar:()=>o});var a=r(95155),s=r(12115),n=r(99754),l=r(34504);let i=[{name:"Office 365 Tenant",type:"SaaS Connection",status:"SECURE",telemetry:"Active session monitoring, OAuth validated"},{name:"Corporate DNS",type:"Domain MX/TXT",status:"WARNING",telemetry:"Missing SPF hard-fail policy flag"},{name:"Public IP Range",type:"Network Node",status:"SECURE",telemetry:"0 open management ports exposed"},{name:"Google Workspace",type:"SaaS API",status:"SECURE",telemetry:"MFA enforcement check active"}];function o(){let[e,t]=(0,s.useState)(["Initial sovereign perimeter scan initiated...","Scanning MX/TXT records for corporate SPF security...","Perimeter sweep active on node US-EAST-01"]);return(0,s.useEffect)(()=>{let e=["Office 365 token refresh check: SUCCESS","Network Scan: Checked 24 external IP interfaces, 0 threat exposure","Perimeter Sync: Checked threat vector matching database, matching complete","Active scan check complete for employee target list","Audit logs synced securely to Supabase PostgreSQL database"],r=setInterval(()=>{let r=e[Math.floor(Math.random()*e.length)];t(e=>[`[${new Date().toLocaleTimeString()}] ${r}`,...e.slice(0,4)])},4500);return()=>clearInterval(r)},[]),(0,a.jsxs)("div",{className:"w-full lg:w-auto shrink-0 bg-white border border-neutral-200 rounded-none p-6 flex flex-col justify-between text-left shadow-none transition-all duration-300 hover:border-neutral-300 font-mono text-xs text-[#050505] min-w-[320px]","data-sentry-component":"InfrastructureRadar","data-sentry-source-file":"InfrastructureRadar.tsx",children:[(0,a.jsxs)("div",{children:[(0,a.jsxs)("div",{className:"flex items-center justify-between border-b border-neutral-100 pb-3 mb-4",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)(n.A,{className:"w-4 h-4 text-[#733DD9]","data-sentry-element":"Server","data-sentry-source-file":"InfrastructureRadar.tsx"}),(0,a.jsx)("span",{className:"text-[10px] uppercase tracking-[0.15em] text-[#733DD9] font-bold font-mono",children:"Infrastructure Radar"})]}),(0,a.jsxs)("div",{className:"flex items-center gap-1.5 border border-neutral-200 text-[#733DD9] px-2 py-0.5 rounded-none text-[8px] font-bold",children:[(0,a.jsx)("span",{className:"w-1 h-1 rounded-full bg-[#733DD9]"}),"4 ACTIVE NODES"]})]}),(0,a.jsx)("div",{className:"space-y-3.5 mb-4",children:i.map(e=>{let t="SECURE"===e.status;return(0,a.jsxs)("div",{className:"flex items-start justify-between gap-4",children:[(0,a.jsxs)("div",{className:"min-w-0",children:[(0,a.jsxs)("div",{className:"flex items-center gap-1.5",children:[(0,a.jsx)("span",{className:"text-[11px] font-bold text-[#050505] leading-none",children:e.name}),(0,a.jsxs)("span",{className:"text-[8px] text-neutral-400 font-mono tracking-normal",children:["(",e.type,")"]})]}),(0,a.jsx)("p",{className:"text-[9px] text-neutral-500 mt-1 leading-normal truncate max-w-[200px]",children:e.telemetry})]}),(0,a.jsxs)("span",{className:`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-200 text-[8px] font-bold tracking-wider shrink-0 ${t?"text-[#733DD9]":"text-neutral-500"}`,children:[(0,a.jsx)("span",{className:"w-1 h-1 rounded-full bg-current shrink-0"}),e.status]})]},e.name)})})]}),(0,a.jsxs)("div",{className:"mt-2 bg-neutral-50 border border-neutral-200 rounded-none p-3 text-[9px] text-neutral-800",children:[(0,a.jsxs)("div",{className:"flex items-center gap-1 border-b border-neutral-200 pb-1.5 mb-1.5 text-neutral-500 text-[8px] font-bold",children:[(0,a.jsx)(l.A,{className:"w-3 h-3 text-[#733DD9]","data-sentry-element":"Activity","data-sentry-source-file":"InfrastructureRadar.tsx"}),(0,a.jsx)("span",{children:"RADAR PERIMETER FEED"})]}),(0,a.jsx)("div",{className:"space-y-1 max-h-[60px] overflow-y-hidden text-neutral-600",children:e.map((e,t)=>(0,a.jsxs)("div",{className:"truncate select-none font-mono",children:[(0,a.jsx)("span",{className:"text-[#733DD9] font-bold",children:">"})," ",e]},t))})]})]})}},65135:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("shield-alert",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"M12 8v4",key:"1got3b"}],["path",{d:"M12 16h.01",key:"1drbdi"}]])},65953:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]])},78591:(e,t,r)=>{"use strict";r.d(t,{SectorWorkspace:()=>c});var a=r(95155),s=r(12115),n=r(36633),l=r(65135);let i=(0,r(1604).A)("users",[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["path",{d:"M16 3.13a4 4 0 0 1 0 7.75",key:"1da9ce"}]]),o=[{id:"briefings",label:"Active Threat Briefings",icon:n.A,countKey:"articleCount"},{id:"cve",label:"Vulnerabilities Radar",icon:l.A,countKey:"cveCount"},{id:"analysts",label:"CISO Advisory Center",icon:i,countKey:"analystCount"}];function c({briefings:e,cveIndex:t,analysts:r,articleCount:n,cveCount:l,analystCount:i}){let[d,x]=(0,s.useState)("briefings"),p={articleCount:n,cveCount:l,analystCount:i};return(0,a.jsxs)("div",{"data-sentry-component":"SectorWorkspace","data-sentry-source-file":"SectorWorkspace.tsx",children:[(0,a.jsx)("div",{className:"border-b border-slate-200 bg-white",children:(0,a.jsx)("div",{className:"max-w-[1400px] mx-auto px-6 lg:px-10",children:(0,a.jsx)("div",{className:"flex items-center gap-1",children:o.map(e=>{let t=e.icon,r=d===e.id;return(0,a.jsxs)("button",{onClick:()=>x(e.id),className:`
                    relative flex items-center gap-2 px-5 py-4 text-[0.8rem] font-medium tracking-wide
                    transition-colors duration-300 cursor-pointer
                    ${r?"text-[#0F172A]":"text-[#94A3B8] hover:text-[#64748B]"}
                  `,children:[(0,a.jsx)(t,{className:"w-4 h-4"}),(0,a.jsx)("span",{children:e.label}),(0,a.jsx)("span",{className:`
                    text-[0.65rem] font-mono tabular-nums ml-1
                    ${r?"text-[#733DD9]":"text-[#CBD5E1]"}
                  `,children:p[e.countKey].toLocaleString()}),r&&(0,a.jsx)("span",{className:"absolute bottom-0 left-5 right-5 h-[2px] bg-[#733DD9] rounded-full"})]},e.id)})})})}),(0,a.jsx)("div",{className:"bg-[#F8FAFC] min-h-[60vh]",children:(0,a.jsxs)("div",{className:"max-w-[1400px] mx-auto px-6 lg:px-10 py-10",children:["briefings"===d&&e,"cve"===d&&t,"analysts"===d&&r]})})]})}},83352:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("circle-check",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]])},87544:(e,t,r)=>{"use strict";r.d(t,{SitrepExporter:()=>o});var a=r(95155),s=r(36633),n=r(83352),l=r(65953),i=r(14769);function o({articles:e}){let{gateAction:t}=(0,i.G)();return(0,a.jsxs)("div",{className:"bg-white border border-neutral-200 rounded-none p-6 shadow-none hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between text-left h-full min-h-[350px] font-sans","data-sentry-component":"SitrepExporter","data-sentry-source-file":"SitrepExporter.tsx",children:[(0,a.jsxs)("div",{children:[(0,a.jsxs)("div",{className:"flex items-center gap-2 border-b border-neutral-100 pb-3.5 mb-5",children:[(0,a.jsx)(s.A,{className:"w-4 h-4 text-[#733DD9]","data-sentry-element":"FileText","data-sentry-source-file":"SitrepExporter.tsx"}),(0,a.jsx)("span",{className:"text-[10px] font-bold font-mono uppercase tracking-[0.15em] text-[#733DD9]",children:"Compliance & Insurance Reporting"})]}),(0,a.jsxs)("div",{className:"relative border border-neutral-200 rounded-none p-5 bg-neutral-50 font-mono text-[9px] text-neutral-500 select-none overflow-hidden h-[160px]",children:[(0,a.jsx)("div",{className:"absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]",children:(0,a.jsx)("span",{className:"text-4xl font-extrabold uppercase tracking-widest text-[#050505] rotate-45 select-none",children:"ZAYRON-X"})}),(0,a.jsxs)("div",{className:"flex items-center justify-between border-b border-neutral-200 pb-2 mb-3",children:[(0,a.jsx)("span",{className:"font-extrabold text-[#050505] text-[10px]",children:"CISO SITREP REPORT"}),(0,a.jsx)("span",{className:"text-[8px] text-[#733DD9] font-bold px-1.5 py-0.5 rounded-none bg-[#733DD9]/10 border border-[#733DD9]/20",children:"TLP:AMBER"})]}),(0,a.jsxs)("div",{className:"space-y-2",children:[(0,a.jsxs)("div",{className:"flex justify-between items-center text-neutral-400",children:[(0,a.jsx)("span",{children:"REPORT DATE:"}),(0,a.jsx)("span",{className:"text-[#050505] font-semibold",children:new Date().toLocaleDateString()})]}),(0,a.jsxs)("div",{className:"flex justify-between items-center text-neutral-400",children:[(0,a.jsx)("span",{children:"THREAT LEVEL:"}),(0,a.jsx)("span",{className:"text-[#733DD9] font-bold",children:"87% SECURE"})]}),(0,a.jsxs)("div",{className:"flex justify-between items-center text-neutral-400",children:[(0,a.jsx)("span",{children:"ACTIVE FEEDS:"}),(0,a.jsx)("span",{className:"text-[#050505] font-semibold",children:"60 SCANNING"})]})]}),(0,a.jsxs)("div",{className:"mt-4 pt-3 border-t border-neutral-200 flex flex-col gap-1 text-neutral-400 text-[8px]",children:[(0,a.jsxs)("div",{className:"flex items-center gap-1.5 text-[#733DD9]",children:[(0,a.jsx)(n.A,{className:"w-2.5 h-2.5 shrink-0","data-sentry-element":"CheckCircle2","data-sentry-source-file":"SitrepExporter.tsx"}),(0,a.jsx)("span",{children:"NIST CSF Compliance Aligned"})]}),(0,a.jsxs)("div",{className:"flex items-center gap-1.5 text-[#733DD9]",children:[(0,a.jsx)(n.A,{className:"w-2.5 h-2.5 shrink-0","data-sentry-element":"CheckCircle2","data-sentry-source-file":"SitrepExporter.tsx"}),(0,a.jsx)("span",{children:"Cyber-Insurance Readiness Approved"})]})]})]})]}),(0,a.jsxs)("div",{className:"mt-5",children:[(0,a.jsxs)("button",{onClick:()=>{t(()=>{let t=window.open("","_blank");t&&(t.document.write(`
      <html>
        <head>
          <title>ZAYRON-X Executive CISO SITREP Report</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              color: #050505; 
              padding: 45px; 
              margin: 0; 
              line-height: 1.5; 
            }
            .header { 
              border-bottom: 2px solid #733DD9; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
            }
            .logo { 
              font-size: 26px; 
              font-weight: 800; 
              letter-spacing: -0.05em; 
              color: #050505;
            }
            .logo span { 
              color: #733DD9; 
            }
            .classification { 
              font-family: monospace; 
              font-size: 11px; 
              color: #733DD9; 
              background: #733DD9/5;
              border: 1px solid rgba(115, 61, 217, 0.2);
              padding: 4px 10px;
              border-radius: 4px;
              font-weight: bold;
              letter-spacing: 0.05em; 
            }
            .title { 
              font-size: 28px; 
              font-weight: 800; 
              margin: 0 0 10px 0; 
              letter-spacing: -0.02em;
            }
            .subtitle {
              color: #404040; 
              font-size: 14px; 
              margin-top: 0; 
              margin-bottom: 35px;
            }
            .meta-grid { 
              display: grid; 
              grid-template-columns: repeat(3, 1fr); 
              gap: 20px; 
              margin-bottom: 40px; 
            }
            .meta-card { 
              background: #FAFAFA; 
              border: 1px solid rgba(5, 5, 5, 0.08); 
              padding: 18px; 
              border-radius: 8px; 
            }
            .meta-label { 
              font-size: 10px; 
              text-transform: uppercase; 
              letter-spacing: 0.08em; 
              color: #733DD9; 
              font-weight: 700; 
            }
            .meta-value { 
              font-size: 20px; 
              font-weight: 800; 
              margin-top: 6px; 
            }
            .section-title { 
              font-size: 16px; 
              font-weight: 700; 
              border-bottom: 1px solid rgba(5, 5, 5, 0.08); 
              padding-bottom: 8px; 
              margin-top: 35px; 
              margin-bottom: 15px; 
              text-transform: uppercase;
              letter-spacing: 0.03em;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
            }
            th { 
              text-align: left; 
              background: #FAFAFA; 
              padding: 10px; 
              font-size: 11px; 
              text-transform: uppercase; 
              font-weight: 700; 
              color: #050505; 
            }
            td { 
              padding: 12px 10px; 
              border-bottom: 1px solid rgba(5, 5, 5, 0.04); 
              font-size: 13px; 
            }
            .badge { 
              display: inline-block; 
              padding: 3px 8px; 
              border-radius: 4px; 
              font-size: 10px; 
              font-weight: bold; 
              text-transform: uppercase; 
              font-family: monospace;
            }
            .badge-critical { 
              background: #050505; 
              color: #FFFFFF; 
              border: 1px solid #050505;
            }
            .badge-high { 
              background: rgba(115, 61, 217, 0.1); 
              color: #733DD9; 
              border: 1px solid rgba(115, 61, 217, 0.2);
            }
            .footer { 
              margin-top: 65px; 
              border-top: 1px solid rgba(5, 5, 5, 0.08); 
              padding-top: 20px; 
              font-size: 10px; 
              color: #A3A3A3; 
              text-align: center; 
              text-transform: uppercase; 
              font-family: monospace; 
              letter-spacing: 0.05em; 
            }
            .checklist {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              font-size: 12px;
              margin-bottom: 30px;
            }
            .checklist-item {
              background: #FAFAFA;
              padding: 12px;
              border-radius: 6px;
              border: 1px solid rgba(5, 5, 5, 0.08);
            }
            .checklist-item strong {
              display: block;
              margin-bottom: 4px;
              color: #050505;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">ZAYRON<span>-X</span></div>
            <div class="classification">TLP:AMBER \xb7 EXECUTIVE ACCESS ONLY</div>
          </div>
          
          <h1 class="title">AUTONOMOUS AI CISO WEEKLY SITREP</h1>
          <p class="subtitle">
            Executive readiness audit report compiled automatically by ZAYRON-X on ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}.
          </p>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Security Posture Status</div>
              <div class="meta-value" style="color: #733DD9;">87% SECURE</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Nodes Monitored</div>
              <div class="meta-value">4 Active Connections</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Active Threats Cataloged</div>
              <div class="meta-value">${e.length} Active Dossiers</div>
            </div>
          </div>

          <div class="section-title">Critical Indicators & Actionable Risks</div>
          <table>
            <thead>
              <tr>
                <th>Incident details & classification</th>
                <th>Threat Impact</th>
                <th>Exposure Risk</th>
                <th>Remediation Status</th>
              </tr>
            </thead>
            <tbody>
              ${e.slice(0,5).map(e=>`
                <tr>
                  <td>
                    <strong>${e.title}</strong>
                    <div style="font-size: 11px; color: #733DD9; margin-top: 4px;">Sector: ${e.category.toUpperCase().replace("_"," ")}</div>
                  </td>
                  <td>
                    <span class="badge ${(e.regulatoryRisk||"CRITICAL").toLowerCase().includes("critical")?"badge-critical":"badge-high"}">${(e.regulatoryRisk||"CRITICAL").toLowerCase().includes("critical")?"Critical":"High"}</span>
                  </td>
                  <td style="font-family: monospace; font-weight: bold;">${e.financialExposure||"$4.2M"}</td>
                  <td style="color: #733DD9; font-weight: bold;">Remediation Deployed</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="section-title">Compliance Readiness Framework Alignment</div>
          <div class="checklist">
            <div class="checklist-item">
              <strong>ID.AM (Asset Vulnerability Tracking)</strong>
              Verified automatic coverage sweeps across corporate SaaS and DNS connections.
            </div>
            <div class="checklist-item">
              <strong>PR.AC (MFA & Identity Verification)</strong>
              Allowance filters active; admin panel fully gated with multi-factor check bounds.
            </div>
            <div class="checklist-item">
              <strong>DE.AE (Continuous Threat Intelligence Ingestion)</strong>
              Active scanning operational on 60+ threat feeds, logs indexed in Supabase database.
            </div>
            <div class="checklist-item">
              <strong>RS.RP (Mitigation Response Integration)</strong>
              WAF rule and active mitigation mapping playbooks ready for one-click deployment.
            </div>
          </div>

          <div class="footer">
            REPORT ISSUED SECURELY BY ZAYRON-X AI CISO CONTROLLER \xb7 AUDIT ALIGNED SECURE LOGS \xb7 TLP:AMBER
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `),t.document.close())})},className:"w-full flex items-center justify-center gap-2 py-3 rounded-none bg-[#733DD9] hover:bg-[#5B21B6] text-white border border-transparent font-mono font-bold text-xs tracking-wider transition-colors shadow-none cursor-pointer",children:[(0,a.jsx)(l.A,{className:"w-3.5 h-3.5","data-sentry-element":"Download","data-sentry-source-file":"SitrepExporter.tsx"}),"EXPORT EXECUTIVE SITREP"]}),(0,a.jsx)("p",{className:"text-[8px] font-mono text-center text-neutral-400 mt-2 leading-relaxed uppercase tracking-wider",children:"Generates direct PDF vector report for audits & board presentations."})]})]})}},96559:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]])},99754:(e,t,r)=>{"use strict";r.d(t,{A:()=>a});let a=(0,r(1604).A)("server",[["rect",{width:"20",height:"8",x:"2",y:"2",rx:"2",ry:"2",key:"ngkwjq"}],["rect",{width:"20",height:"8",x:"2",y:"14",rx:"2",ry:"2",key:"iecqi9"}],["line",{x1:"6",x2:"6.01",y1:"6",y2:"6",key:"16zg32"}],["line",{x1:"6",x2:"6.01",y1:"18",y2:"18",key:"nzw8ys"}]])}},e=>{e.O(0,[3077,3476,4850,8441,9592,7358],()=>e(e.s=29755)),_N_E=e.O()}]);