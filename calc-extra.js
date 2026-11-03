/* ============================================================
   BioVermi — অতিরিক্ত ক্যালকুলেটর (calculators.html)
   লোড হবে script.js-এর আগে, যাতে ট্যাব/প্যানেল তৈরি থাকে।
   ============================================================ */
(function(){
'use strict';
const F=(n,d=1)=>Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
const taka=n=>'৳ '+F(n,0);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V=id=>parseFloat(document.getElementById(id).value);

const CALCS=[
{ key:'breakeven', tab:'⚖️ Break-even', title:'⚖️ Break-even (লাভ-ক্ষতির সমান বিন্দু)',
  desc:'মাসে কত kg বিক্রি করলে খরচ উঠবে এবং আপনার বর্তমান বিক্রি সেই সীমার কত উপরে।',
  fields:[['be-fixed','মাসিক স্থির খরচ (৳) — শ্রম, ভাড়া, সুদ',15000,{min:0}],['be-var','প্রতি kg পরিবর্তনশীল খরচ (৳) — প্যাকেজিং, পরিবহন',8,{min:0,step:'any'}],['be-price','প্রতি kg বিক্রয়মূল্য (৳)',25,{min:0.01,step:'any'}],['be-sales','মাসে প্রকৃত/প্রত্যাশিত বিক্রি (kg)',1200,{min:0}]],
  run(v){
    const [fixed,vr,price,sales]=v; const cm=price-vr;
    if(!(cm>0)) return {err:'দাম প্রতি kg পরিবর্তনশীল খরচের চেয়ে বেশি হতে হবে, নইলে কখনোই Break-even হবে না।'};
    const be=fixed/cm, profit=sales*cm-fixed;
    return {rows:[['প্রতি kg Contribution (দাম − পরিবর্তনশীল খরচ)',taka(cm)],['Break-even পরিমাণ',F(be,0)+' kg/মাস'],['Break-even আয়',taka(be*price)],['বর্তমান বিক্রিতে মাসিক মুনাফা/(ক্ষতি)',taka(profit)],['Margin of safety',sales>0?F((sales-be)/sales*100,1)+' %':'—']],
      steps:['Contribution = দাম − পরিবর্তনশীল খরচ = '+taka(cm),'Break-even = স্থির খরচ ÷ Contribution = '+F(be,0)+' kg'],
      warn:sales<be?'বর্তমান বিক্রি Break-even-এর নিচে — আরও '+F(be-sales,0)+' kg বিক্রি বা খরচ কমানো দরকার।':''}; } },

{ key:'pricing', tab:'🏷️ মূল্য নির্ধারণ', title:'🏷️ প্রতি kg খরচ ও বিক্রয়মূল্য',
  desc:'মাসের মোট খরচ ও উৎপাদন থেকে প্রতি kg খরচ এবং লক্ষ্য মার্জিনে বিক্রয়মূল্য বের করুন।',
  fields:[['pr-feed','মাসিক ফিড/Bedding/গোবর খরচ (৳)',3000,{min:0}],['pr-labour','মাসিক শ্রম (৳)',6000,{min:0}],['pr-util','মাসিক বিদ্যুৎ/পানি/অন্যান্য (৳)',1500,{min:0}],['pr-dep','মাসিক অবচয় (বিনিয়োগ ÷ আয়ুষ্কাল মাস) (৳)',2000,{min:0}],['pr-pack','প্রতি kg প্যাকেজিং+পরিবহন (৳)',6,{min:0,step:'any'}],['pr-out','মাসিক বিক্রয়যোগ্য উৎপাদন (kg)',1500,{min:1}],['pr-margin','লক্ষ্য মার্জিন (%) — বিক্রয়মূল্যের উপর',25,{min:0,max:90}]],
  run(v){
    const [feed,lab,util,dep,pack,out,mg]=v; const fixed=feed+lab+util+dep, cost=fixed/out+pack;
    const price=cost/(1-mg/100);
    return {rows:[['মোট মাসিক খরচ (প্যাকেজিং বাদে)',taka(fixed)],['প্রতি kg মোট খরচ',taka(cost)],['প্রস্তাবিত বিক্রয়মূল্য (৳/kg)',F(price,1)],['প্রতি kg মুনাফা',taka(price-cost)],['মাসিক সম্ভাব্য মুনাফা',taka((price-cost)*out)]],
      steps:['প্রতি kg খরচ = (ফিড+শ্রম+ইউটিলিটি+অবচয়) ÷ উৎপাদন + প্যাকেজিং','দাম = খরচ ÷ (১ − মার্জিন%)'],
      warn:'বাজারে প্রতিযোগীর দাম আলাদা করে যাচাই করুন (মডিউল ৪৬); হিসাব করা দাম বাজারের চেয়ে বেশি হলে খরচ কমানোর পথ খুঁজুন।'}; } },

{ key:'cashflow', tab:'📆 ১২ মাসের ক্যাশফ্লো', title:'📆 ১২ মাসের ক্যাশফ্লো ও Payback',
  desc:'শুরুতে আয় কম থাকে — মাসভিত্তিক বৃদ্ধি ধরে কোন মাসে বিনিয়োগ উঠবে তা দেখুন।',
  fields:[['cf-capex','মোট প্রাথমিক বিনিয়োগ (৳)',100000,{min:0}],['cf-cost','মাসিক পরিচালনা খরচ (৳)',9000,{min:0}],['cf-rev1','প্রথম মাসের আয় (৳)',8000,{min:0}],['cf-growth','মাসিক আয় বৃদ্ধি (%)',10,{min:0,max:100}],['cf-cap','মাসিক সর্বোচ্চ আয় (৳) — ক্ষমতার সীমা',30000,{min:0}]],
  run(v){
    const [capex,cost,r1,g,cap]=v; let rev=r1,cum=-capex,pay=null,tbl='',lastNet=0;
    for(let m=1;m<=12;m++){ const net=rev-cost; lastNet=net; cum+=net; if(pay===null&&cum>=0) pay=m;
      tbl+=`<tr><td>${F(m,0)}</td><td>${F(rev,0)}</td><td>${F(net,0)}</td><td style="color:${cum<0?'var(--danger)':'var(--ok)'}">${F(cum,0)}</td></tr>`;
      rev=Math.min(cap,rev*(1+g/100)); }
    return {rows:[['১২ মাস শেষে ক্রমযোজিত নগদ',taka(cum)],['Payback মাস',pay?F(pay,0)+'-তম মাস':(lastNet>0?'১২ মাসে ওঠেনি; শেষ মাসের নিট ধরলে প্রায় '+F(12+Math.ceil(-cum/lastNet),0)+' মাস':'বর্তমান ধারায় ওঠার সম্ভাবনা নেই')]],
      html:`<div class="table-wrap"><table><thead><tr><th>মাস</th><th>আয় (৳)</th><th>নিট (৳)</th><th>ক্রমযোজিত (৳)</th></tr></thead><tbody>${tbl}</tbody></table></div>`,
      warn:'আয় বৃদ্ধির হার একটি অনুমান — আপনার প্রকৃত বিক্রয় লগ (ফার্ম ডেটা) দেখে হালনাগাদ করুন।'}; } },

{ key:'emi', tab:'🏦 ঋণ ও EMI', title:'🏦 ঋণের কিস্তি (EMI)',
  desc:'ঋণের পরিমাণ, বার্ষিক সুদের হার ও মেয়াদ থেকে মাসিক কিস্তি ও মোট সুদ।',
  fields:[['em-amt','ঋণের পরিমাণ (৳)',100000,{min:1}],['em-rate','বার্ষিক সুদের হার (%)',12,{min:0,step:'any'}],['em-years','মেয়াদ (বছর)',3,{min:0.25,step:'any'}]],
  run(v){
    const [P,rate,y]=v; const n=Math.round(y*12), r=rate/1200;
    const emi=r===0?P/n:P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    return {rows:[['মাসিক কিস্তি (EMI)',taka(emi)],['মোট কিস্তি সংখ্যা',F(n,0)],['মোট পরিশোধ',taka(emi*n)],['মোট সুদ',taka(emi*n-P)]],
      steps:['EMI = P·r·(1+r)ⁿ ÷ ((1+r)ⁿ − 1), r = বার্ষিক হার ÷ ১২'],
      warn:'এটি সমহার (reducing-balance) পদ্ধতির হিসাব। ব্যাংকের প্রকৃত শর্ত (ফি, গ্রেস পিরিয়ড, সুদ গণনা) সরাসরি যাচাই করুন।'}; } },

{ key:'beds', tab:'🪱 Digestate → বেড', title:'🪱 Digestate থেকে বেড সংখ্যা ও উৎপাদন',
  desc:'দৈনিক Digestate কঠিন অংশ থেকে কত কেঁচো, কত জায়গা ও কয়টি বেড লাগবে (মডিউল ২৬-এর সাথে মিলিয়ে)।',
  fields:[['db-dig','দৈনিক Digestate (kg, ভেজা)',95,{min:0}],['db-solid','পৃথকীকরণের পর কঠিন অংশ (% ভেজা ভরের)',25,{min:1,max:100}],['db-rate','Feed rate (kg Feed / kg কেঁচো / দিন)',0.5,{min:0.05,step:'any'}],['db-dens','কেঁচোর ঘনত্ব (kg / m² বেড)',1.5,{min:0.1,step:'any'}],['db-area','প্রতি বেডের ক্ষেত্রফল (m²)',4.5,{min:0.5,step:'any'}],['db-yield','Feed → কম্পোস্ট রূপান্তর (%)',40,{min:5,max:90}]],
  run(v){
    const [dig,solid,rate,dens,area,y]=v; const feed=dig*solid/100, worms=feed/rate, m2=worms/dens, beds=Math.ceil(m2/area);
    return {rows:[['দৈনিক ব্যবহারযোগ্য Feed (কঠিন Digestate)',F(feed)+' kg'],['প্রয়োজনীয় কেঁচো',F(worms)+' kg'],['প্রয়োজনীয় বেড-জায়গা',F(m2)+' m²'],['বেড সংখ্যা',F(beds,0)+'টি'],['আনুমানিক কম্পোস্ট উৎপাদন',F(feed*y/100*30,0)+' kg/মাস']],
      steps:['Feed = Digestate × কঠিন%','কেঁচো = Feed ÷ Feed rate','জায়গা = কেঁচো ÷ ঘনত্ব'],
      warn:'সব ডিফল্ট মান অনুমান। তাজা Digestate সরাসরি বেডে দেবেন না — প্রথমে পরীক্ষামূলক ছোট বেডে যাচাই করুন (মডিউল ২৬)। আপনার নিজের বেডের ফলাফল দিয়ে এই মানগুলো বদলান।'}; } },

{ key:'cn', tab:'🧪 C:N অনুপাত', title:'🧪 কাঁচামাল মিশ্রণের C:N অনুপাত',
  desc:'তিনটি উপকরণ মিশিয়ে মিশ্রণের C:N ও শুকনো ভর বের করুন। বায়োগ্যাসের জন্য সাধারণত ২০–৩০ লক্ষ্য ধরা হয়।',
  fields:[['cn1-kg','উপকরণ ১: গোবর — ভেজা kg',100,{min:0}],['cn1-ts','TS %',18,{min:1,max:100,step:'any'}],['cn1-n','নাইট্রোজেন % (শুকনো ভরে)',1.8,{min:0.01,step:'any'}],['cn1-cn','C:N',20,{min:1,step:'any'}],
          ['cn2-kg','উপকরণ ২: যেমন খড় — ভেজা kg',10,{min:0}],['cn2-ts','TS %',88,{min:1,max:100,step:'any'}],['cn2-n','নাইট্রোজেন %',0.6,{min:0.01,step:'any'}],['cn2-cn','C:N',70,{min:1,step:'any'}],
          ['cn3-kg','উপকরণ ৩: যেমন রান্নাঘরের বর্জ্য — ভেজা kg',0,{min:0}],['cn3-ts','TS %',25,{min:1,max:100,step:'any'}],['cn3-n','নাইট্রোজেন %',2.5,{min:0.01,step:'any'}],['cn3-cn','C:N',17,{min:1,step:'any'}]],
  run(v){
    let N=0,C=0,dry=0,wet=0;
    for(let i=0;i<3;i++){ const [kg,ts,n,cn]=v.slice(i*4,i*4+4); const d=kg*ts/100; const nn=d*n/100; dry+=d; wet+=kg; N+=nn; C+=nn*cn; }
    if(!(N>0)) return {err:'কমপক্ষে একটি উপকরণের পরিমাণ দিন।'};
    const cn=C/N, tsm=dry/wet*100;
    return {rows:[['মোট ভেজা ভর',F(wet)+' kg'],['মোট শুকনো ভর',F(dry)+' kg'],['মিশ্রণের TS',F(tsm)+' %'],['মিশ্রণের C:N',F(cn)+' : ১']],
      warn:(cn<20?'C:N ২০-এর নিচে — অ্যামোনিয়া জমার ঝুঁকি; কার্বন-সমৃদ্ধ উপকরণ (খড় ইত্যাদি) বাড়ান।':cn>30?'C:N ৩০-এর উপরে — গ্যাস কম হতে পারে; নাইট্রোজেন-সমৃদ্ধ উপকরণ (গোবর/বিষ্ঠা) বাড়ান।':'C:N প্রচলিত লক্ষ্য সীমার (২০–৩০) মধ্যে।')+' ডিফল্ট TS, N ও C:N শুধু সাধারণ আনুমানিক মান — আপনার নমুনা পরীক্ষা করে বসান।'}; } },

{ key:'npk', tab:'🌾 Digestate সার', title:'🌾 Digestate-এর পুষ্টি ও প্রয়োগ এলাকা',
  desc:'বছরে Digestate থেকে কত N-P-K পাওয়া যায় এবং কত বিঘা জমির নাইট্রোজেন চাহিদা মেটে।',
  fields:[['np-kg','দৈনিক Digestate (kg, ভেজা)',95,{min:0}],['np-ts','TS %',6,{min:0.1,max:100,step:'any'}],['np-n','N % (শুকনো ভরে)',3,{min:0,step:'any'}],['np-p','P₂O₅ %',1.5,{min:0,step:'any'}],['np-k','K₂O %',2,{min:0,step:'any'}],['np-av','প্রথম বছরে উদ্ভিদের পাওয়া N (%)',40,{min:1,max:100}],['np-need','ফসলের N চাহিদা (kg/হেক্টর)',120,{min:1}]],
  run(v){
    const [kg,ts,n,p,k,av,need]=v; const dry=kg*365*ts/100, N=dry*n/100, P=dry*p/100, K=dry*k/100, ha=N*av/100/need, bigha=ha/0.1336;
    return {rows:[['বছরে শুকনো ভর',F(dry,0)+' kg'],['মোট N',F(N,0)+' kg/বছর'],['মোট P₂O₅',F(P,0)+' kg/বছর'],['মোট K₂O',F(K,0)+' kg/বছর'],['N চাহিদা মেটে এমন জমি',F(ha,2)+' হেক্টর ≈ '+F(bigha,1)+' বিঘা']],
      warn:'N-P-K মান ডিফল্ট অনুমান — আপনার Digestate ল্যাবে পরীক্ষা করে বসান (মডিউল ১২)। প্রতি বিঘা = ৩৩ শতক ≈ ০.১৩৩৬ হেক্টর ধরা হয়েছে। মাত্রাতিরিক্ত প্রয়োগে ফসল/পানি ক্ষতিগ্রস্ত হতে পারে।'}; } },

{ key:'winter', tab:'❄️ শীতে গ্যাস', title:'❄️ শীতে গ্যাস উৎপাদনের আনুমানিক হ্রাস',
  desc:'তাপমাত্রা কমলে গ্যাস কত কমতে পারে তার মোটামুটি হিসাব (Q10 পদ্ধতি)।',
  fields:[['wt-gas','স্বাভাবিক তাপমাত্রায় দৈনিক গ্যাস (m³)',5,{min:0.1,step:'any'}],['wt-ref','স্বাভাবিক ডাইজেস্টার তাপমাত্রা (°C)',30,{min:10,max:45}],['wt-low','শীতে ডাইজেস্টার তাপমাত্রা (°C)',20,{min:5,max:45}],['wt-q10','Q10 (প্রতি ১০°C-এ গুণক)',2,{min:1,max:4,step:'any'}],['wt-use','দৈনিক প্রয়োজনীয় গ্যাস (m³)',4,{min:0,step:'any'}]],
  run(v){
    const [g,ref,low,q,use]=v; const f=Math.pow(q,(low-ref)/10), w=g*f;
    return {rows:[['তাপমাত্রা-ভিত্তিক গুণক',F(f,2)],['আনুমানিক শীতকালীন গ্যাস',F(w,2)+' m³/দিন'],['হ্রাস',F((1-f)*100,0)+' %'],['চাহিদার সাথে ঘাটতি/(উদ্বৃত্ত)',F(use-w,2)+' m³/দিন']],
      warn:'এটি মোটা অনুমান — প্রকৃত হ্রাস ডিজাইন, নিরোধক ও Feed-এর উপর নির্ভর করে। নিজের গ্যাস লগ দিয়ে যাচাই করুন; ঘাটতি থাকলে নিরোধক/গরম পানি মেশানো/সাময়িক চাহিদা কমানো বিবেচনা করুন।'}; } },

{ key:'lpg', tab:'🔥 LPG সাশ্রয়', title:'🔥 LPG/জ্বালানি সাশ্রয়ের হিসাব',
  desc:'বায়োগ্যাস ব্যবহারে মাসে কত LPG ও টাকা বাঁচে।',
  fields:[['lp-gas','দৈনিক ব্যবহৃত বায়োগ্যাস (m³)',3,{min:0,step:'any'}],['lp-eq','১ m³ বায়োগ্যাস ≈ LPG (kg)',0.4,{min:0.05,step:'any'}],['lp-price','১২ কেজি সিলিন্ডারের দাম (৳) — বর্তমান বাজারদর বসান',1500,{min:1}]],
  run(v){
    const [g,eq,pr]=v; const kg=g*eq*30, perKg=pr/12;
    return {rows:[['মাসে LPG সাশ্রয়',F(kg)+' kg'],['সমতুল্য সিলিন্ডার',F(kg/12,2)+'টি'],['মাসিক সাশ্রয়',taka(kg*perKg)],['বার্ষিক সাশ্রয়',taka(kg*perKg*12)]],
      warn:'LPG-র দাম নিয়মিত বদলায় — নিজের এলাকার চলতি দাম বসান। সমতুল্যতার মান (০.৪) আনুমানিক।'}; } }
];

/* ---------- UI তৈরি ---------- */
function build(){
  const tabs=document.querySelector('.tabs'), main=document.querySelector('main.content');
  if(!tabs||!main) return;
  CALCS.forEach(c=>{
    const b=document.createElement('button'); b.className='tab'; b.setAttribute('data-calc',c.key); b.textContent=c.tab; tabs.appendChild(b);
    const p=document.createElement('div'); p.className='calc-panel'; p.setAttribute('data-panel',c.key); p.style.display='none';
    p.innerHTML=`<div class="card card-pad"><h3>${c.title}</h3><p style="font-size:13.5px;color:var(--text-2);margin:6px 0 16px">${c.desc}</p>
      <div class="calc-grid">${c.fields.map(f=>`<div class="field"><label>${esc(f[1])}</label><input type="number" class="input" id="${f[0]}" value="${f[2]}"${f[3].min!=null?` min="${f[3].min}"`:''}${f[3].max!=null?` max="${f[3].max}"`:''} step="${f[3].step||'any'}"><small class="field-err" id="${f[0]}Err"></small></div>`).join('')}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-primary" data-run="${c.key}">হিসাব করুন</button><button class="btn btn-ghost" data-reset="${c.key}">রিসেট</button></div>
      <div id="x-${c.key}-result" class="calc-result"></div></div>`;
    main.appendChild(p);
  });
  main.addEventListener('click',e=>{
    const r=e.target.closest('[data-run]'), z=e.target.closest('[data-reset]'), s=e.target.closest('[data-save-calc]');
    if(r) run(r.dataset.run);
    if(z){ const c=CALCS.find(x=>x.key===z.dataset.reset); c.fields.forEach(f=>{ document.getElementById(f[0]).value=f[2]; document.getElementById(f[0]+'Err').classList.remove('show'); }); document.getElementById('x-'+c.key+'-result').style.display='none'; }
    if(s){ saveCalc(s.dataset.saveCalc); }
    if(e.target.closest('[data-print]')) window.print();
  });
}
const last={};
function run(key){
  const c=CALCS.find(x=>x.key===key); let ok=true; const vals=[];
  c.fields.forEach(f=>{
    const el=document.getElementById(f[0]), err=document.getElementById(f[0]+'Err'), n=parseFloat(el.value), o=f[3];
    let m='';
    if(!Number.isFinite(n)) m='সংখ্যা দিন'; else if(o.min!=null&&n<o.min) m='কমপক্ষে '+o.min; else if(o.max!=null&&n>o.max) m='সর্বোচ্চ '+o.max;
    el.classList.toggle('invalid',!!m); err.textContent=m; err.classList.toggle('show',!!m); if(m) ok=false; vals.push(n);
  });
  const box=document.getElementById('x-'+key+'-result');
  if(!ok){ box.style.display='none'; return; }
  const r=c.run(vals);
  if(r.err){ box.innerHTML=`<div class="callout warn" style="margin:0">${esc(r.err)}</div>`; box.style.display='block'; return; }
  last[key]=r.rows.map(x=>x[0]+': '+x[1]).join(' | ');
  box.innerHTML=`<h4>ফলাফল <span class="res-badge">আনুমানিক</span></h4>`+
    r.rows.map(x=>`<div class="res-row"><span>${x[0]}</span><span>${x[1]}</span></div>`).join('')+
    (r.html||'')+
    (r.steps?`<div class="steps">${r.steps.map((s,i)=>`<div>${F(i+1,0)}. ${esc(s)}</div>`).join('')}</div>`:'')+
    (r.warn?`<div class="callout" style="margin-top:12px;font-size:12.5px">${esc(r.warn)}</div>`:'')+
    `<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-ghost" data-save-calc="${key}">💾 হিসাব সংরক্ষণ</button><button class="btn btn-ghost" data-print="1">🖨️ প্রিন্ট</button></div>`;
  box.style.display='block';
}
function saveCalc(key){
  const c=CALCS.find(x=>x.key===key); if(!last[key]) return;
  const inputs=c.fields.map(f=>f[1].split(' —')[0]+'='+document.getElementById(f[0]).value).join('; ');
  const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset());
  const row={date:d.toISOString().slice(0,10),calc:c.tab,inputs:inputs,result:last[key]};
  if(window.FarmAPI){ window.FarmAPI.add('calc_history',row); if(typeof window.toast==='function') window.toast('হিসাব সংরক্ষিত ✅'+(window.FarmAPI.cfg().url?'':' (শুধু ব্রাউজারে)')); }
}
build();
})();
