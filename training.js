/* ============================================================
   BioVermi — প্রশিক্ষণ: চেকলিস্ট, কুইজ, সনদ
   ============================================================ */
(function(){
'use strict';
const LSget=(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } };
const LSset=(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(n,d=0)=>Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d});
const T=(m,t)=>{ if(typeof window.toast==='function') window.toast(m,t); };
const todayS=()=>{ const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
function weekKey(){ const d=new Date(); const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const day=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-day); const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1)); return t.getUTCFullYear()+'-W'+Math.ceil(((t-y0)/864e5+1)/7); }

const CHECK={
 daily:{title:'📅 দৈনিক চেকলিস্ট',key:()=>todayS(),items:['গ্যাস লাইন ও সংযোগে লিক নেই (দৃশ্যমান/গন্ধ)','গ্যাস প্রেশার/গ্যাস হোল্ডারের অবস্থা দেখা','গোবর ও স্লারি ইনপুট নেওয়া এবং লগে লেখা','ইনলেট/আউটলেট পরিষ্কার ও আটকে নেই','বেডের আর্দ্রতা ও তাপমাত্রা দেখা','কেঁচোকে Feed দেওয়া ও পরিমাণ লেখা','পিঁপড়া, ইঁদুর, পাখি বা অন্য উপদ্রব পরীক্ষা','ছায়া ও পানির ব্যবস্থা ঠিক আছে','আজকের গ্যাস ও বেড লগ ফার্ম ডেটায় সম্পন্ন']},
 weekly:{title:'🗓️ সাপ্তাহিক চেকলিস্ট',key:weekKey,items:['Condensate trap/পানি জমা খালি করা','Digestate সংরক্ষণ ও পৃথকীকরণের অবস্থা দেখা','বেডের ঘনত্ব ও বেড ওলট-পালট পর্যবেক্ষণ','যন্ত্রপাতি ও কাজের জায়গা পরিষ্কার','কম্পোস্ট ও কেঁচোর Stock গণনা','নিরাপত্তা সরঞ্জাম (গ্লাভস, মাস্ক, বুট) ঠিক আছে','ডেটার CSV ব্যাকআপ বা Sheet সিঙ্ক যাচাই']},
 monthly:{title:'🗂️ মাসিক চেকলিস্ট',key:()=>todayS().slice(0,7),items:['গ্যাস হোল্ডার, পাইপ ও ভাল্ভ পরিদর্শন','কম্পোস্ট নমুনার মান পরীক্ষা (মডিউল ৩৩)','আয়-খরচ ও Stock হিসাব মেলানো','কেঁচোর ওজন/সংখ্যার নমুনা গণনা','Spare parts ও সরঞ্জামের তালিকা হালনাগাদ','SOP ও ঝুঁকির তালিকা (Risk Register) পর্যালোচনা','Break-even ও ক্যাশফ্লো হালনাগাদ']}
};

const QUIZ={
 safety:{title:'🦺 নিরাপত্তা',q:[
  ['ডাইজেস্টার বা গ্যাস লাইনের কাছে সবচেয়ে বিপজ্জনক কোনটি?',['আগুন, স্ফুলিঙ্গ বা ধূমপান','গাছের ছায়া','পরিষ্কার পানি','খোলা বাতাস'],0,'মিথেন বাতাসের সাথে নির্দিষ্ট অনুপাতে মিশলে আগুন বা স্ফুলিঙ্গে বিস্ফোরণের ঝুঁকি থাকে (মডিউল ১৪)।'],
  ['ডাইজেস্টার বা বদ্ধ জায়গায় ঢোকার আগে সবচেয়ে জরুরি কী?',['দ্রুত একা ঢুকে বেরিয়ে আসা','ঢোকা এড়ানো; বাধ্য হলে পূর্ণ বায়ুচলাচল, গ্যাস পরীক্ষা ও বাইরে উদ্ধারকারী রাখা','শুধু টর্চ নেওয়া','ভেতরে ধূমপান করে পরীক্ষা'],1,'বদ্ধ জায়গায় বিষাক্ত গ্যাস ও অক্সিজেনের অভাব প্রাণঘাতী — কখনো একা ঢুকবেন না।'],
  ['গ্যাস লিক খুঁজতে কী ব্যবহার করবেন?',['জ্বলন্ত দেশলাই','লাইটার','সাবান-পানির দ্রবণ','কাছে গিয়ে বারবার শোঁকা'],2,'সংযোগে সাবান-পানি লাগালে লিক থাকলে বুদবুদ হয়। আগুন দিয়ে কখনো পরীক্ষা নয়।'],
  ['বায়োগ্যাসে থাকা H₂S সম্পর্কে কোনটি সঠিক?',['ক্ষতিকর নয়','উচ্চ ঘনত্বে ঘ্রাণশক্তি অসাড় করতে পারে, তাই গন্ধ না পাওয়া মানে নিরাপদ নয়','বাতাসের চেয়ে অনেক হালকা, তাই কখনো জমে না','শুধু পাইপ ক্ষয় করে, মানুষের ক্ষতি করে না'],1,'H₂S বিষাক্ত এবং বাতাসের চেয়ে ভারী, নিচু জায়গায় জমতে পারে।']]},
 biogas:{title:'🔥 বায়োগ্যাস',q:[
  ['HRT (Hydraulic Retention Time) কী?',['গ্যাসের চাপ','স্লারি গড়ে ডাইজেস্টারে কত দিন থাকে','দৈনিক গোবরের পরিমাণ','গ্যাসের তাপমান'],1,'HRT = ডাইজেস্টারের কার্যকর আয়তন ÷ দৈনিক স্লারি।'],
  ['বায়োগ্যাসের প্রধান জ্বলনযোগ্য উপাদান কোনটি?',['মিথেন (CH₄)','নাইট্রোজেন','কার্বন ডাই-অক্সাইড','অক্সিজেন'],0,'বায়োগ্যাসে সাধারণত মিথেন ও CO₂ প্রধান।'],
  ['গোবর থেকে স্লারি বানাতে সাধারণত কী করা হয়?',['পানি মিশিয়ে লক্ষ্য TS-এ আনা','শুকিয়ে গুঁড়া করা','চুন মিশিয়ে রাখা','কিছুই মেশানো হয় না'],0,'লক্ষ্য Total Solids অনুযায়ী পানি মেশানো হয় (স্লারি ক্যালকুলেটর)।'],
  ['শীতে গ্যাস কমার প্রধান কারণ কী?',['তাপমাত্রা কমলে অণুজীবের কার্যকলাপ কমে যায়','গোবরের রং বদলায়','পাইপ ছোট হয়ে যায়','বাতাসে মিথেন বেশি থাকে'],0,'ডাইজেস্টারের তাপমাত্রা কমলে গ্যাস উৎপাদন কমে (শীতের ক্যালকুলেটর)।'],
  ['বায়োগ্যাসের কাঁচামালে C:N অনুপাত সাধারণত কত লক্ষ্য ধরা হয়?',['২–৫','২০–৩০','৮০–১০০','১৫০+'],1,'অনেক নিয়ামক গ্রন্থে ২০–৩০ কে উপযোগী ধরা হয়; নিজের কাঁচামালে পরীক্ষা করুন।'],
  ['হঠাৎ দৈনিক গ্যাস অনেক কমে গেলে প্রথম করণীয় কী?',['Feed দ্বিগুণ করা','লিক, Feed, তাপমাত্রা ও লগ পরীক্ষা করে কারণ খোঁজা','ডাইজেস্টার খালি করে নতুন করে শুরু করা','আগুন জ্বেলে পরীক্ষা করা'],1,'আগে কারণ চিহ্নিত করুন (মডিউল ১৩)।']]},
 vermi:{title:'🪱 ভার্মিকম্পোস্ট',q:[
  ['ভার্মিবেডে আর্দ্রতা সাধারণত কত রাখা হয়?',['১০–২০%','৩০–৪০%','৬০–৮০%','৯০%+'],2,'খুব শুকনো বা অতিরিক্ত ভেজা — দুটোই কেঁচোর জন্য ক্ষতিকর।'],
  ['তাজা Digestate বা কাঁচা গোবর সরাসরি বেডে দিলে প্রধান ঝুঁকি কী?',['কিছুই হয় না','তাপ ও অ্যামোনিয়ায় কেঁচো মরে বা পালাতে পারে','কেঁচো দ্রুত বাড়ে','বেড ঠান্ডা হয়ে যায়'],1,'আগে পরীক্ষা ও প্রস্তুতি (Pre-composting) দরকার (মডিউল ২৫, ২৬)।'],
  ['নতুন কেঁচো কেনার পর প্রথমে কী করবেন?',['সরাসরি মূল বেডে ছাড়বেন','আলাদা জায়গায় Quarantine করে পর্যবেক্ষণ','বিক্রি করে দেবেন','শুকিয়ে ফেলবেন'],1,'রোগ/পরজীবী মূল খামারে ছড়ানো ঠেকাতে (মডিউল ২০)।'],
  ['বেডে হঠাৎ দুর্গন্ধ ও পানি জমলে সম্ভাব্য কারণ কী?',['অতিরিক্ত Feed ও বায়ুচলাচলের অভাব','Feed কম দেওয়া','খুব বেশি শুকনো বেডিং','কেঁচোর সংখ্যা কম'],0,'Feed কমান, বেডিং মেশান, বায়ু চলাচল বাড়ান (মডিউল ৩৭)।'],
  ['প্যাকেটে ব্যাচ নম্বর রাখার প্রধান উপকার কী?',['দাম বাড়ানো যায়','সমস্যা হলে উৎস খুঁজে বের করা যায় (ট্রেসেবিলিটি)','ওজন কমানো যায়','কিছুই না'],1,'অভিযোগ এলে কোন ব্যাচ ও বেড থেকে এসেছে তা জানা যায়।']]},
 business:{title:'💰 ব্যবসা',q:[
  ['Break-even মানে কী?',['সর্বোচ্চ মুনাফা','যে বিক্রিতে মোট আয় = মোট খরচ','শুধু স্থির খরচ','ঋণ শোধের তারিখ'],1,'এর উপরে বিক্রি হলেই মুনাফা শুরু।'],
  ['Payback period-এর সরল হিসাব কোনটি?',['বিনিয়োগ ÷ মাসিক নিট মুনাফা','আয় × খরচ','খরচ − আয়','বিনিয়োগ × ১২'],0,'ফলাফল মাসে আসে; আয় বাড়লে বদলাবে (ক্যাশফ্লো ক্যালকুলেটর)।'],
  ['দাম ঠিক করার আগে সবচেয়ে প্রথম কী জানা দরকার?',['প্রতিযোগীর বিজ্ঞাপন','নিজের প্রতি kg খরচ','কত রঙের প্যাকেট','কোন দিন বিক্রি বেশি'],1,'খরচের নিচে বিক্রি টেকসই নয়; বাজারদরও পাশাপাশি দেখুন।'],
  ['ঋণ নেওয়ার আগে কোন যাচাইটি সবচেয়ে জরুরি?',['প্রথম মাসগুলোর ক্যাশফ্লোতে কিস্তি মেটানো যাবে কি না','ব্যাংকের ভবন কত বড়','বন্ধু কত ঋণ নিয়েছে','কোন রঙের ফাইল'],0,'শুরুতে আয় কম থাকে — EMI ও ক্যাশফ্লো ক্যালকুলেটর মিলিয়ে দেখুন।']]}
};

function checklistHTML(){
  return `<div class="grid g3" id="chk-grid">${Object.keys(CHECK).map(k=>{
    const c=CHECK[k], st=LSget('chk_'+k+'_'+c.key(),{});
    const n=Object.values(st).filter(Boolean).length;
    return `<div class="card card-pad chk-card"><h3>${c.title}</h3>
      <div class="farm-task-sum" id="sum-${k}">${F(n)} / ${F(c.items.length)} সম্পন্ন</div>
      ${c.items.map((t,i)=>`<label class="farm-task ${st[i]?'done':''}"><input type="checkbox" data-chk="${k}" data-i="${i}" ${st[i]?'checked':''}><span>${esc(t)}</span></label>`).join('')}
      <div class="no-print" style="margin-top:10px"><button class="btn btn-ghost" data-reset-chk="${k}">রিসেট</button></div></div>`;}).join('')}</div>`;
}

let qs=null, section='safety';
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function startQuiz(sec){
  section=sec;
  qs=QUIZ[sec].q.map(x=>{ const idx=shuffle([0,1,2,3]); return {t:x[0],o:idx.map(i=>x[1][i]),a:idx.indexOf(x[2]),e:x[3],pick:null}; });
  drawQuiz();
}
function drawQuiz(){
  const box=document.getElementById('quiz-box'); if(!box||!qs) return;
  box.innerHTML=qs.map((q,i)=>`<div class="card card-pad" style="margin-bottom:14px"><b>${F(i+1)}. ${esc(q.t)}</b>
    <div style="margin-top:10px">${q.o.map((o,j)=>`<label class="quiz-opt ${q.pick===j?'sel':''}"><input type="radio" name="q${i}" value="${j}" ${q.pick===j?'checked':''}><span>${esc(o)}</span></label>`).join('')}</div></div>`).join('')+
    `<div class="no-print"><button class="btn btn-primary" id="quiz-submit">✅ জমা দিন</button></div><div id="quiz-res"></div>`;
  box.querySelectorAll('input[type=radio]').forEach(r=>r.addEventListener('change',()=>{ const i=+r.name.slice(1); qs[i].pick=+r.value; box.querySelectorAll(`input[name=q${i}]`).forEach(x=>x.parentElement.classList.toggle('sel',x.checked)); }));
  document.getElementById('quiz-submit').onclick=submit;
}
function submit(){
  if(qs.some(q=>q.pick===null)){ T('সব প্রশ্নের উত্তর দিন','warn'); return; }
  const score=qs.filter(q=>q.pick===q.a).length, total=qs.length, pct=Math.round(score/total*100), pass=pct>=80;
  const box=document.getElementById('quiz-box');
  box.querySelectorAll('.card').forEach((c,i)=>{ const q=qs[i];
    c.querySelectorAll('.quiz-opt').forEach((l,j)=>{ if(j===q.a) l.classList.add('right'); else if(j===q.pick) l.classList.add('wrong'); });
    c.insertAdjacentHTML('beforeend',`<div class="callout ${q.pick===q.a?'':'warn'}" style="margin:10px 0 0;font-size:13px">${q.pick===q.a?'✅ সঠিক':'❌ ভুল'} — ${esc(q.e)}</div>`); });
  document.getElementById('quiz-res').innerHTML=`<div class="calc-result" style="display:block"><h4>ফলাফল: ${F(score)} / ${F(total)} (${F(pct)}%)</h4>
    <p>${pass?'অভিনন্দন! আপনি এই বিভাগে উত্তীর্ণ (৮০%+)।':'আরও অনুশীলন দরকার — সংশ্লিষ্ট মডিউল আবার পড়ে চেষ্টা করুন।'}</p>
    <div class="no-print" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px"><button class="btn btn-ghost" id="quiz-again">🔁 আবার চেষ্টা</button>${pass?'<button class="btn btn-primary" id="quiz-cert">🎓 সনদ বানান</button>':''}</div></div>`;
  document.getElementById('quiz-submit').style.display='none';
  document.getElementById('quiz-again').onclick=()=>startQuiz(section);
  const cb=document.getElementById('quiz-cert'); if(cb) cb.onclick=()=>certificate(score,total);
  const best=LSget('quiz_best',{}); if(!best[section]||pct>best[section]){ best[section]=pct; LSset('quiz_best',best); renderBest(); }
  if(window.FarmAPI) window.FarmAPI.add('quiz',{date:todayS(),section:QUIZ[section].title,score:score,total:total,percent:pct});
  document.getElementById('quiz-res').scrollIntoView({behavior:'smooth',block:'center'});
}
function certificate(score,total){
  const name=(prompt('সনদে কোন নাম লিখবেন?')||'').trim(); if(!name) return;
  const cert=document.getElementById('cert-area');
  cert.innerHTML=`<div class="cert"><div class="cert-in"><div style="font-size:42px">🌿</div><h2>অংশগ্রহণ ও সফলতার স্ব-মূল্যায়ন সনদ</h2>
    <p>এই মর্মে প্রত্যয়ন করা যাচ্ছে যে</p><div class="cert-name">${esc(name)}</div>
    <p>BioVermi Bangladesh প্ল্যাটফর্মের <b>${esc(QUIZ[section].title)}</b> কুইজে ${F(score)}/${F(total)} নম্বর পেয়ে উত্তীর্ণ হয়েছেন।</p>
    <p style="font-size:13px;color:#666">তারিখ: ${esc(todayS())}</p>
    <p style="font-size:11.5px;color:#888">এটি অনলাইন স্ব-মূল্যায়নের সনদ; কোনো সরকারি বা স্বীকৃত প্রতিষ্ঠানের সনদ নয়।</p></div></div>
    <div class="no-print" style="text-align:center;margin-top:12px"><button class="btn btn-primary" id="cert-print">🖨️ প্রিন্ট / PDF</button></div>`;
  document.getElementById('cert-print').onclick=()=>{ document.body.classList.add('print-cert'); window.print(); setTimeout(()=>document.body.classList.remove('print-cert'),500); };
  cert.scrollIntoView({behavior:'smooth'});
}
function renderBest(){
  const best=LSget('quiz_best',{}), el=document.getElementById('quiz-best'); if(!el) return;
  el.innerHTML=Object.keys(QUIZ).map(k=>`<span class="res-badge" style="margin-right:6px">${QUIZ[k].title}: ${best[k]!=null?F(best[k])+'%':'—'}</span>`).join('');
}

function init(){
  const root=document.getElementById('train-root'); if(!root) return;
  let tab=(location.hash||'').slice(1)==='quiz'?'quiz':'check';
  function draw(){
    root.innerHTML=`<div class="tabs no-print" style="margin-bottom:20px"><button class="tab ${tab==='check'?'active':''}" data-t="check">✅ চেকলিস্ট</button><button class="tab ${tab==='quiz'?'active':''}" data-t="quiz">🧠 কুইজ ও সনদ</button></div>`+
    (tab==='check'?`<div class="no-print" style="margin-bottom:14px"><button class="btn btn-ghost" id="chk-print">🖨️ প্রিন্ট</button></div>${checklistHTML()}`:
    `<div class="card card-pad" style="margin-bottom:16px"><h3>বিভাগ বেছে নিন</h3><div class="tabs" style="margin:10px 0;flex-wrap:wrap">${Object.keys(QUIZ).map(k=>`<button class="tab ${k===section&&qs?'active':''}" data-sec="${k}">${QUIZ[k].title}</button>`).join('')}</div><div id="quiz-best" style="margin-top:6px"></div></div><div id="quiz-box"><div class="empty"><div class="em">🧠</div>উপরে একটি বিভাগ বেছে কুইজ শুরু করুন (৮০%+ পেলে সনদ)</div></div><div id="cert-area"></div>`);
    root.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{ tab=b.dataset.t; history.replaceState(null,'','#'+(tab==='quiz'?'quiz':'')); draw(); });
    if(tab==='check'){
      const p=document.getElementById('chk-print'); if(p) p.onclick=()=>window.print();
      root.querySelectorAll('[data-chk]').forEach(cb=>cb.addEventListener('change',()=>{
        const k=cb.dataset.chk, key='chk_'+k+'_'+CHECK[k].key(), st=LSget(key,{}); st[cb.dataset.i]=cb.checked; LSset(key,st);
        cb.parentElement.classList.toggle('done',cb.checked);
        document.getElementById('sum-'+k).textContent=F(Object.values(st).filter(Boolean).length)+' / '+F(CHECK[k].items.length)+' সম্পন্ন'; }));
      root.querySelectorAll('[data-reset-chk]').forEach(b=>b.onclick=()=>{ const k=b.dataset.resetChk; LSset('chk_'+k+'_'+CHECK[k].key(),{}); draw(); });
    }else{
      root.querySelectorAll('[data-sec]').forEach(b=>b.onclick=()=>{ startQuiz(b.dataset.sec); root.querySelectorAll('[data-sec]').forEach(x=>x.classList.toggle('active',x===b)); });
      renderBest();
    }
  }
  draw();
}
document.addEventListener('DOMContentLoaded',init);
})();
