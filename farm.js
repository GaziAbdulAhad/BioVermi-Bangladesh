/* ============================================================
   BioVermi — Farm Data layer (Google Sheet + offline cache)
   লোড হবে script.js-এর পরে।
   ============================================================ */
(function(){
'use strict';

/* ---------- helpers ---------- */
const LSget=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
const LSset=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(n,d=1)=>Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
const num=v=>{ const n=parseFloat(v); return Number.isFinite(n)?n:0; };
const today=()=>{ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
const T=(m,t)=>{ if(typeof window.toast==='function') window.toast(m,t); else alert(m); };
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const $q=(s,r)=> (r||document).querySelector(s);

/* ---------- schema (ফর্মের কাঠামো) ---------- */
const PRODUCTS=['ভার্মিকম্পোস্ট','কেঁচো','তরল সার'];
const SHEETS={
  gas_log:{ title:'🔥 দৈনিক গ্যাস ও গোবর', fields:[
    {k:'date',l:'তারিখ',t:'date',req:1},
    {k:'gas_m3',l:'গ্যাস উৎপাদন (m³)',t:'number',min:0},
    {k:'dung_kg',l:'গোবর ইনপুট (kg)',t:'number',min:0},
    {k:'digestate_kg',l:'Digestate আউটপুট (kg)',t:'number',min:0},
    {k:'temp_c',l:'ডাইজেস্টার তাপমাত্রা (°C)',t:'number'},
    {k:'note',l:'নোট',t:'text'} ]},
  bed_log:{ title:'🛏️ বেড লগ', fields:[
    {k:'date',l:'তারিখ',t:'date',req:1},
    {k:'bed',l:'বেডের নাম/নম্বর',t:'text',req:1},
    {k:'worms_kg',l:'কেঁচোর ওজন (kg)',t:'number',min:0},
    {k:'feed_kg',l:'আজকের Feed (kg)',t:'number',min:0},
    {k:'moisture_pct',l:'আর্দ্রতা (%)',t:'number',min:0,max:100},
    {k:'temp_c',l:'বেডের তাপমাত্রা (°C)',t:'number'},
    {k:'note',l:'নোট',t:'text'} ]},
  harvest:{ title:'🌱 উৎপাদন (Harvest)', fields:[
    {k:'date',l:'তারিখ',t:'date',req:1},
    {k:'bed',l:'বেড',t:'text'},
    {k:'product',l:'পণ্য',t:'select',opts:PRODUCTS,req:1},
    {k:'kg',l:'পরিমাণ (kg)',t:'number',min:0,req:1},
    {k:'note',l:'নোট',t:'text'} ]},
  sales:{ title:'🧾 বিক্রি', fields:[
    {k:'date',l:'তারিখ',t:'date',req:1},
    {k:'product',l:'পণ্য',t:'select',opts:PRODUCTS,req:1},
    {k:'qty_kg',l:'পরিমাণ (kg)',t:'number',min:0,req:1},
    {k:'price_per_kg',l:'দাম (৳/kg)',t:'number',min:0,req:1},
    {k:'customer',l:'ক্রেতা',t:'text'},
    {k:'note',l:'নোট',t:'text'} ]},
  expenses:{ title:'💸 খরচ', fields:[
    {k:'date',l:'তারিখ',t:'date',req:1},
    {k:'category',l:'খাত',t:'select',opts:['গোবর/ফিড','শ্রম','বিদ্যুৎ/জ্বালানি','প্যাকেজিং','পরিবহন','মেরামত','বিপণন','অন্যান্য'],req:1},
    {k:'amount',l:'টাকা (৳)',t:'number',min:0,req:1},
    {k:'note',l:'নোট',t:'text'} ]}
};
const PROFILE_FIELDS=[
  {k:'farm_name',l:'খামারের নাম',t:'text'},
  {k:'location',l:'এলাকা',t:'text'},
  {k:'cows',l:'গরুর সংখ্যা',t:'number',min:0},
  {k:'digester_m3',l:'ডাইজেস্টার আয়তন (m³)',t:'number',min:0},
  {k:'beds',l:'বেডের সংখ্যা',t:'number',min:0},
  {k:'start_date',l:'শুরুর তারিখ',t:'date'}
];
// ডেটা-ধরন যেগুলো শুধু সেভ হয় (পেজ থেকে অন্য ফাইলও ব্যবহার করে)
const ALL_SHEETS=Object.keys(SHEETS).concat(['profile','quiz','calc_history']);

/* ---------- storage + queue ---------- */
const cfg=()=>({url:(LSget('farm_api_url','')||'').trim(), key:LSget('farm_api_key','')||''});
const cache=s=>LSget('farm_cache_'+s,[]);
const setCache=(s,r)=>LSset('farm_cache_'+s,r);
const queue=()=>LSget('farm_queue',[]);
let lastError='';

async function call(method,payload){
  const {url,key}=cfg();
  if(!url) throw new Error('NO_URL');
  let res;
  if(method==='GET'){
    const q=new URLSearchParams(Object.assign({},payload,{key}));
    res=await fetch(url+(url.indexOf('?')>-1?'&':'?')+q.toString());
  }else{
    res=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({},payload,{key}))});
  }
  let j; try{ j=await res.json(); }catch(e){ throw new Error('উত্তর পড়া যায়নি (URL ঠিক আছে? "Anyone" অ্যাক্সেস দেওয়া আছে?)'); }
  if(!j.ok) throw new Error(j.error==='BAD_KEY'?'গোপন কী মেলেনি':(j.error||'ERROR'));
  return j;
}

let flushing=false;
async function flush(){
  if(flushing) return;
  if(!cfg().url){ renderPill(); return; }
  flushing=true;
  try{
    let q;
    while((q=queue()).length){
      const op=q[0];
      await call('POST',op);
      const cur=queue(); cur.shift(); LSset('farm_queue',cur);
    }
    lastError='';
  }catch(e){ lastError=e.message||'ERROR'; }
  finally{ flushing=false; renderPill(); }
}
function enqueue(op){ const q=queue(); q.push(op); LSset('farm_queue',q); }

async function add(sheet,row){
  row=Object.assign({id:uid()},row);
  setCache(sheet,cache(sheet).concat([row]));
  enqueue({action:'add',sheet,row});
  renderPill(); flush();
  return row;
}
async function remove(sheet,id){
  setCache(sheet,cache(sheet).filter(r=>r.id!==id));
  enqueue({action:'delete',sheet,id});
  renderPill(); flush();
}
async function upsert(sheet,matchField,row){
  const rows=cache(sheet).slice();
  const i=rows.findIndex(r=>String(r[matchField])===String(row[matchField]));
  if(i>=0) rows[i]=Object.assign({},rows[i],row); else rows.push(Object.assign({id:uid()},row));
  setCache(sheet,rows);
  enqueue({action:'upsert',sheet,matchField,row});
  renderPill(); flush();
}

async function pull(sheet){
  const j=await call('GET',{action:'list',sheet});
  let merged=(j.rows||[]).slice();
  const pend=queue().filter(o=>o.sheet===sheet);
  const del=new Set(pend.filter(o=>o.action==='delete').map(o=>o.id));
  merged=merged.filter(r=>!del.has(r.id));
  pend.forEach(o=>{
    if(o.action==='add' && !merged.some(r=>r.id===o.row.id)) merged.push(o.row);
    if(o.action==='upsert'){
      const i=merged.findIndex(r=>String(r[o.matchField])===String(o.row[o.matchField]));
      if(i>=0) merged[i]=Object.assign({},merged[i],o.row); else merged.push(o.row);
    }
  });
  setCache(sheet,merged);
}
async function pullAll(){
  if(!cfg().url){ renderPill(); return false; }
  try{
    await flush();
    await Promise.all(['gas_log','bed_log','harvest','sales','expenses','profile'].map(pull));
    lastError=''; renderPill(); return true;
  }catch(e){ lastError=e.message||'ERROR'; renderPill(); return false; }
}

/* ---------- sync pill (টপবারে) ---------- */
function renderPill(){
  const el=document.getElementById('farm-sync'); if(!el) return;
  const n=queue().length, hasUrl=!!cfg().url;
  let txt,cls='';
  if(!hasUrl){ txt='💾 শুধু এই ব্রাউজারে'; cls='warn'; }
  else if(lastError){ txt='⚠️ সিঙ্ক ব্যর্থ'; cls='err'; }
  else if(n){ txt='⏳ '+F(n,0)+'টি সিঙ্ক বাকি'; cls='warn'; }
  else { txt='☁️ Sheet সংযুক্ত'; cls='ok'; }
  el.textContent=txt; el.className='sync-pill '+cls;
  el.title=lastError||'ক্লিক করে সেটিংস খুলুন';
}
function injectPill(){
  const right=$q('.topbar-right'); if(!right||document.getElementById('farm-sync')) return;
  const a=document.createElement('a'); a.id='farm-sync'; a.href='farm-data.html#settings';
  right.insertBefore(a,right.firstChild); renderPill();
}

/* ---------- sidebar-এ নতুন লিংক ---------- */
if(typeof window.buildSidebar==='function'){
  const _b=window.buildSidebar;
  window.buildSidebar=function(){
    _b.apply(this,arguments);
    const sc=$q('#sidebar .sidebar-scroll'); if(!sc) return;
    const groups=sc.querySelectorAll('.nav-group'); const g=groups[groups.length-1]; if(!g) return;
    const here=location.pathname.split('/').pop()||'index.html';
    [['farm-data.html','🗂️','ফার্ম ডেটা'],['training.html','🎓','প্রশিক্ষণ ও কুইজ']].forEach(x=>{
      const a=document.createElement('a'); a.className='nav-item'+(here===x[0]?' active':''); a.href=x[0];
      a.innerHTML='<span class="ico">'+x[1]+'</span> '+x[2];
      g.insertBefore(a, g.children[3]||null);
    });
  };
}

/* ============================================================
   Dashboard (আসল ডেটা থেকে)
   ============================================================ */
const sum=(rows,f)=>rows.reduce((a,r)=>a+num(r[f]),0);
const ymOf=d=>String(d||'').slice(0,7);
let charts=[];

function compute(){
  const gas=cache('gas_log'), beds=cache('bed_log'), hv=cache('harvest'), sl=cache('sales'), ex=cache('expenses');
  const td=today(), ym=td.slice(0,7);
  const gToday=gas.filter(r=>r.date===td);
  const latestGasDate=gas.map(r=>r.date).sort().pop()||'';
  const gLatest=gas.filter(r=>r.date===latestGasDate);
  // বেড: গত ১৪ দিনের সক্রিয় বেড, প্রতি বেডের সর্বশেষ কেঁচোর ওজন
  const cut=new Date(); cut.setDate(cut.getDate()-14); const cutS=cut.toISOString().slice(0,10);
  const recent=beds.filter(r=>String(r.date)>=cutS);
  const lastByBed={}; recent.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))).forEach(r=>{ lastByBed[r.bed]=r; });
  const monthSales=sl.filter(r=>ymOf(r.date)===ym);
  const revenue=monthSales.reduce((a,r)=>a+num(r.qty_kg)*num(r.price_per_kg),0);
  const expense=sum(ex.filter(r=>ymOf(r.date)===ym),'amount');
  const vermiIn=sum(hv.filter(r=>r.product==='ভার্মিকম্পোস্ট'),'kg');
  const vermiOut=sum(sl.filter(r=>r.product==='ভার্মিকম্পোস্ট'),'qty_kg');
  // গত ৭ দিন (আজ বাদে) গড় গ্যাস
  const byDay={}; gas.forEach(r=>{ byDay[r.date]=(byDay[r.date]||0)+num(r.gas_m3); });
  const prev=[]; for(let i=1;i<=7;i++){ const d=new Date(); d.setDate(d.getDate()-i); const s=d.toISOString().slice(0,10); if(byDay[s]!==undefined) prev.push(byDay[s]); }
  const prevAvg=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:null;
  return {gas,beds,hv,sl,ex,td,ym,byDay,prevAvg,
    totalGas:sum(gas,'gas_m3'), gasToday:sum(gToday,'gas_m3'), hasGasToday:gToday.length>0,
    gasLatest:sum(gLatest,'gas_m3'), latestGasDate,
    dungToday:sum(gToday,'dung_kg'), digToday:sum(gToday,'digestate_kg'),
    activeBeds:Object.keys(lastByBed).length,
    wormKg:Object.values(lastByBed).reduce((a,r)=>a+num(r.worms_kg),0),
    feedToday:sum(beds.filter(r=>r.date===td),'feed_kg'),
    monthHarvest:sum(hv.filter(r=>ymOf(r.date)===ym && r.product==='ভার্মিকম্পোস্ট'),'kg'),
    stock:vermiIn-vermiOut, revenue, expense, profit:revenue-expense,
    lastByBed, any:(gas.length+beds.length+hv.length+sl.length+ex.length)>0 };
}

function renderDashboard(){
  const root=document.getElementById('dash'); if(!root) return;
  const d=compute();
  const prof=cache('profile')[0];
  const h1=$q('.page-head h1',root);
  if(h1 && prof && prof.farm_name) h1.textContent='📊 '+prof.farm_name+' — ড্যাশবোর্ড';
  // পুরনো "Demo Data" ব্যাজ সরানো
  root.querySelectorAll('.page-head span').forEach(s=>{ if(/Demo/i.test(s.textContent)) s.remove(); });

  const taka=n=>'৳ '+F(n,0);
  const cards=[
    ['🔥','মোট বায়োগ্যাস',F(d.totalGas)+' m³','লগ করা সর্বমোট',''],
    ['⚡', d.hasGasToday?'আজকের গ্যাস':'সর্বশেষ গ্যাস', F(d.hasGasToday?d.gasToday:d.gasLatest)+' m³', d.hasGasToday?'আজ':(d.latestGasDate||'এখনো লগ নেই'),'info'],
    ['🐄','আজকের গোবর',F(d.dungToday)+' kg','আজ','earth'],
    ['💧','Digestate (আজ)',F(d.digToday)+' kg','আজ','info'],
    ['🛏️','সক্রিয় বেড',F(d.activeBeds,0),'গত ১৪ দিনে লগ আছে',''],
    ['🪱','কেঁচোর মোট ওজন',F(d.wormKg)+' kg','বেডের সর্বশেষ লগ','earth'],
    ['🍽️','আজকের Feed',F(d.feedToday)+' kg','আজ',''],
    ['🌱','এ মাসের কম্পোস্ট',F(d.monthHarvest)+' kg','Harvest লগ থেকে','info'],
    ['📦','কম্পোস্ট Stock',F(d.stock)+' kg','মোট উৎপাদন − বিক্রি',d.stock<0?'warn':''],
    ['💰','এ মাসের আয়',taka(d.revenue),'বিক্রি লগ থেকে',''],
    ['📉','এ মাসের খরচ',taka(d.expense),'খরচ লগ থেকে','warn'],
    ['📈','এ মাসের মুনাফা',taka(d.profit),'আয় − খরচ',d.profit<0?'warn':'']
  ];
  document.getElementById('dash-cards').innerHTML=cards.map(c=>`
    <div class="stat ${c[4]}"><div class="s-top"><div class="s-ico">${c[0]}</div></div>
    <div class="s-label">${c[1]}</div><div class="s-value">${c[2]}</div><div class="s-sub">${c[3]}</div></div>`).join('');

  // ---- charts ----
  charts.forEach(c=>{ try{c.destroy();}catch(e){} }); charts=[];
  if(typeof Chart!=='undefined'){
    const col=getComputedStyle(document.documentElement).getPropertyValue('--text-2').trim()||'#4d5a52';
    const grid='rgba(120,120,120,.18)';
    const opts={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{color:col},grid:{color:grid}},y:{beginAtZero:true,ticks:{color:col},grid:{color:grid}}}};
    const days=[]; for(let i=13;i>=0;i--){ const x=new Date(); x.setDate(x.getDate()-i); days.push(x.toISOString().slice(0,10)); }
    const g=$q('#chartGas'); if(g) charts.push(new Chart(g,{type:'line',
      data:{labels:days.map(s=>s.slice(8,10)+'/'+s.slice(5,7)),datasets:[{data:days.map(s=>d.byDay[s]||0),borderColor:'#2d6a4f',backgroundColor:'rgba(82,183,136,.2)',fill:true,tension:.3}]},options:opts}));
    const byBed={}; d.hv.filter(r=>r.product==='ভার্মিকম্পোস্ট').forEach(r=>{ const b=r.bed||'অনির্দিষ্ট'; byBed[b]=(byBed[b]||0)+num(r.kg); });
    const names=Object.keys(byBed);
    const v=$q('#chartVermi'); if(v) charts.push(new Chart(v,{type:'bar',
      data:{labels:names.length?names:['ডেটা নেই'],datasets:[{data:names.length?names.map(n=>byBed[n]):[0],backgroundColor:'#b08968',borderRadius:6}]},options:opts}));
  }

  // ---- tasks ----
  const tkey='farm_tasks_'+d.td, done=LSget(tkey,{});
  const tasks=['গোবর সংগ্রহ ও স্লারি তৈরি','ডাইজেস্টারে স্লারি দেওয়া','গ্যাস লাইন/প্রেশার লিক পরীক্ষা','বেডের আর্দ্রতা ও তাপমাত্রা দেখা','কেঁচোকে Feed দেওয়া','আজকের গ্যাস ও বেড লগ লেখা'];
  const tl=document.getElementById('dash-tasks');
  tl.innerHTML=tasks.map((t,i)=>`<label class="farm-task ${done[i]?'done':''}"><input type="checkbox" data-i="${i}" ${done[i]?'checked':''}><span>${esc(t)}</span></label>`).join('')+
    `<div class="farm-task-sum">${F(Object.values(done).filter(Boolean).length,0)} / ${F(tasks.length,0)} সম্পন্ন · <a href="farm-data.html">ডেটা যোগ করুন →</a></div>`;
  tl.querySelectorAll('input').forEach(cb=>cb.addEventListener('change',()=>{ const x=LSget(tkey,{}); x[cb.dataset.i]=cb.checked; LSset(tkey,x); renderDashboard(); }));

  // ---- alerts ----
  const A=[];
  if(!cfg().url) A.push(['warn','Google Sheet সংযুক্ত নেই — ডেটা শুধু এই ব্রাউজারে আছে। <a href="farm-data.html#settings">সংযোগ দিন</a>']);
  else if(lastError) A.push(['danger','Sheet সিঙ্ক হচ্ছে না: '+esc(lastError)]);
  else if(queue().length) A.push(['warn',F(queue().length,0)+'টি এন্ট্রি Sheet-এ পাঠানো বাকি']);
  if(!d.any) A.push(['info','এখনো কোনো ডেটা নেই। <a href="farm-data.html">ফার্ম ডেটা</a> পেজে আজকের লগ দিয়ে শুরু করুন।']);
  else if(!d.hasGasToday) A.push(['warn','আজকের গ্যাস লগ এখনো দেওয়া হয়নি']);
  if(d.hasGasToday && d.prevAvg>0 && d.gasToday<d.prevAvg*0.7) A.push(['danger','আজকের গ্যাস গত ৭ দিনের গড়ের চেয়ে ৩০%+ কম — Feed, তাপমাত্রা ও লিক পরীক্ষা করুন (মডিউল ১৩)']);
  Object.keys(d.lastByBed).forEach(b=>{
    const r=d.lastByBed[b], m=parseFloat(r.moisture_pct), t=parseFloat(r.temp_c);
    if(Number.isFinite(m)&&(m<60||m>80)) A.push(['warn','বেড '+esc(b)+': আর্দ্রতা '+F(m,0)+'% (সাধারণ সীমা ৬০–৮০%)']);
    if(Number.isFinite(t)&&t>35) A.push(['warn','বেড '+esc(b)+': তাপমাত্রা '+F(t,0)+'°C — ছায়া/পানি দিন']);
  });
  if(d.stock<0) A.push(['warn','বিক্রি > উৎপাদন (Stock ঋণাত্মক) — Harvest লগ মিলিয়ে দেখুন']);
  A.push(['danger','⚠️ ডাইজেস্টার ও গ্যাস লাইনের কাছে আগুন/ধূমপান নিষেধ']);
  document.getElementById('dash-alerts').innerHTML=A.map(a=>`<div class="callout ${a[0]==='info'?'':a[0]}" style="margin:0 0 10px">${a[1]}</div>`).join('');
}

window.initDashboard=function(){
  if(!document.getElementById('dash')) return;
  renderDashboard();
  pullAll().then(ok=>{ if(ok) renderDashboard(); });
};

/* ============================================================
   ফার্ম ডেটা পেজ
   ============================================================ */
function fieldHTML(f,val,pre){
  const id=pre+f.k, v=val==null?'':val;
  if(f.t==='select') return `<div class="field"><label>${f.l}</label><select class="input" id="${id}">${f.opts.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;
  const extra=f.t==='number'?` step="any"${f.min!=null?` min="${f.min}"`:''}${f.max!=null?` max="${f.max}"`:''}`:'';
  return `<div class="field"><label>${f.l}${f.req?' *':''}</label><input class="input" id="${id}" type="${f.t}"${extra} value="${esc(v)}"></div>`;
}
function readForm(fields,pre){
  const row={};
  for(const f of fields){
    const el=document.getElementById(pre+f.k); let v=el.value.trim();
    if(f.req && !v){ T(f.l+' দিতে হবে','error'); el.focus(); return null; }
    if(f.t==='number' && v!==''){
      const n=parseFloat(v);
      if(!Number.isFinite(n)||(f.min!=null&&n<f.min)||(f.max!=null&&n>f.max)){ T(f.l+' সঠিক নয়','error'); el.focus(); return null; }
      v=n;
    }
    row[f.k]=v;
  }
  return row;
}
function fmtCell(f,v){
  if(v===''||v==null) return '—';
  if(f.t==='number') return F(v,2);
  const s=String(v); return esc(s.length>60?s.slice(0,57)+'…':s);
}
function csvDownload(name,fields,rows){
  const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const csv='\ufeff'+[fields.map(f=>q(f.l)).join(',')].concat(rows.map(r=>fields.map(f=>q(r[f.k])).join(','))).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download=name+'-'+today()+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

function sheetPanel(key){
  const S=SHEETS[key], rows=cache(key).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,40);
  return `<div class="card card-pad">
    <h3>${S.title}</h3>
    <div class="calc-grid" style="margin-top:12px">${S.fields.map(f=>fieldHTML(f,f.k==='date'?today():'', 'f-'+key+'-')).join('')}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
      <button class="btn btn-primary" data-save="${key}">💾 সংরক্ষণ</button>
      <button class="btn btn-ghost" data-csv="${key}">⬇️ CSV</button>
    </div>
    <h4 style="margin:22px 0 8px">সাম্প্রতিক এন্ট্রি (সর্বশেষ ৪০টি)</h4>
    <div class="table-wrap"><table><thead><tr>${S.fields.map(f=>`<th>${f.l}</th>`).join('')}<th></th></tr></thead><tbody>
    ${rows.length?rows.map(r=>`<tr>${S.fields.map(f=>`<td>${fmtCell(f,r[f.k])}</td>`).join('')}<td><button class="btn btn-ghost" style="height:30px;padding:0 10px" data-del="${key}|${esc(r.id)}">🗑️</button></td></tr>`).join(''):`<tr><td colspan="${S.fields.length+1}" style="text-align:center;color:var(--muted)">এখনো কোনো এন্ট্রি নেই</td></tr>`}
    </tbody></table></div></div>`;
}
function profilePanel(){
  const p=cache('profile').find(r=>r.key==='main')||{};
  return `<div class="card card-pad"><h3>🏡 খামারের প্রোফাইল</h3>
    <div class="calc-grid" style="margin-top:12px">${PROFILE_FIELDS.map(f=>fieldHTML(f,p[f.k],'f-profile-')).join('')}</div>
    <button class="btn btn-primary" style="margin-top:12px" data-save="profile">💾 সংরক্ষণ</button></div>`;
}
function settingsPanel(){
  const c=cfg();
  return `<div class="card card-pad"><h3>☁️ Google Sheet সংযোগ</h3>
    <p style="font-size:13.5px;color:var(--text-2);margin:8px 0 14px">Apps Script ওয়েব অ্যাপের URL এখানে বসান (ধাপগুলো <b>SETUP.md</b>-তে আছে)। URL না দিলে ডেটা শুধু এই ব্রাউজারে থাকবে।</p>
    <div class="field"><label>Web App URL (…/exec)</label><input class="input" id="set-url" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url)}"></div>
    <div class="field" style="margin-top:12px"><label>গোপন কী (Code.gs-এর SECRET দিলে)</label><input class="input" id="set-key" type="text" value="${esc(c.key)}" autocomplete="off"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">
      <button class="btn btn-primary" id="set-save">💾 সংরক্ষণ ও পরীক্ষা</button>
      <button class="btn btn-ghost" id="set-sync">🔄 Sheet থেকে ডেটা আনুন</button>
      <button class="btn btn-ghost" id="set-clear">⛔ সংযোগ বিচ্ছিন্ন</button>
    </div>
    <div id="set-msg" class="callout" style="margin-top:14px;display:none"></div>
    <div class="callout warn" style="margin-top:14px;font-size:13px"><b>গোপনীয়তা:</b> ওয়েব অ্যাপ "Anyone" দিয়ে চালু করলে URL যার কাছে আছে সে ডেটা পড়তে/লিখতে পারে। URL কাউকে দেবেন না, আর সম্ভব হলে গোপন কী ব্যবহার করুন।</div></div>`;
}

function initFarmData(){
  const root=document.getElementById('farm-root'); if(!root) return;
  const tabs=Object.keys(SHEETS).map(k=>({k,l:SHEETS[k].title})).concat([{k:'profile',l:'🏡 প্রোফাইল'},{k:'settings',l:'☁️ সেটিংস'}]);
  let cur=(location.hash||'').slice(1); if(!tabs.some(t=>t.k===cur)) cur='gas_log';
  const msg=(t,type)=>{ const m=document.getElementById('set-msg'); if(!m) return; m.style.display='block'; m.className='callout '+(type||''); m.innerHTML=t; };

  function draw(){
    root.innerHTML=`<div class="tabs" style="margin-bottom:20px;flex-wrap:wrap">${tabs.map(t=>`<button class="tab ${t.k===cur?'active':''}" data-tab="${t.k}">${t.l}</button>`).join('')}</div>
      <div id="farm-panel">${cur==='settings'?settingsPanel():cur==='profile'?profilePanel():sheetPanel(cur)}</div>`;
    bind();
  }
  function bind(){
    root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ cur=b.dataset.tab; history.replaceState(null,'','#'+cur); draw(); });
    root.querySelectorAll('[data-save]').forEach(b=>b.onclick=async()=>{
      const k=b.dataset.save;
      if(k==='profile'){ const row=readForm(PROFILE_FIELDS,'f-profile-'); if(!row) return; row.key='main'; await upsert('profile','key',row); T('প্রোফাইল সংরক্ষিত'); draw(); return; }
      const row=readForm(SHEETS[k].fields,'f-'+k+'-'); if(!row) return;
      await add(k,row); T('সংরক্ষিত ✅'); draw();
    });
    root.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
      if(!confirm('এই এন্ট্রি মুছে ফেলবেন?')) return;
      const [k,id]=b.dataset.del.split('|'); await remove(k,id); draw();
    });
    root.querySelectorAll('[data-csv]').forEach(b=>b.onclick=()=>{ const k=b.dataset.csv; csvDownload(k,SHEETS[k].fields,cache(k)); });
    const s=document.getElementById('set-save');
    if(s){
      s.onclick=async()=>{
        const url=document.getElementById('set-url').value.trim(), key=document.getElementById('set-key').value.trim();
        if(url && !/^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec$/.test(url)){ msg('URL-টি <code>https://script.google.com/macros/s/…/exec</code> ধরনের হতে হবে।','danger'); return; }
        LSset('farm_api_url',url); LSset('farm_api_key',key);
        if(!url){ msg('URL মুছে ফেলা হয়েছে — ডেটা শুধু ব্রাউজারে থাকবে।','warn'); renderPill(); return; }
        msg('পরীক্ষা চলছে…');
        try{ await call('GET',{action:'ping'}); lastError=''; msg('✅ সংযোগ সফল। এখন থেকে ডেটা Sheet-এ যাবে।'); flush(); }
        catch(e){ lastError=e.message; msg('❌ সংযোগ হয়নি: '+esc(e.message),'danger'); }
        renderPill();
      };
      document.getElementById('set-sync').onclick=async()=>{ msg('ডেটা আনা হচ্ছে…'); const ok=await pullAll(); msg(ok?'✅ Sheet থেকে ডেটা আনা হয়েছে':'❌ ব্যর্থ: '+esc(lastError||'URL দেওয়া নেই'),ok?'':'danger'); };
      document.getElementById('set-clear').onclick=()=>{ if(!confirm('সংযোগ বিচ্ছিন্ন করবেন? (ব্রাউজারের ডেটা থাকবে)')) return; LSset('farm_api_url',''); LSset('farm_api_key',''); lastError=''; draw(); renderPill(); };
    }
  }
  draw();
  pullAll().then(ok=>{ if(ok && cur!=='settings') draw(); });
}

/* ---------- expose ---------- */
window.FarmAPI={add,remove,upsert,pullAll,flush,cache,cfg,SHEETS};

document.addEventListener('DOMContentLoaded',()=>{
  injectPill();
  flush();
  if(document.body.getAttribute('data-page')==='farmdata') initFarmData();
});
})();
