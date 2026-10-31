/* ============================================================
   BioVermi Bangladesh — Core Application
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ---------- Theme ---------- */
function initTheme(){
  const saved = LS.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  LS.set('theme', next);
  toast(next === 'dark' ? '🌙 ডার্ক মোড চালু' : '☀️ লাইট মোড চালু');
}

/* ---------- Toast ---------- */
function toast(msg, type='ok'){
  let wrap = $('.toast-wrap');
  if(!wrap){ wrap = document.createElement('div'); wrap.className='toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = 'toast ' + (type==='error'?'error':type==='warn'?'warn':'');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='.3s'; setTimeout(()=>t.remove(),320); }, 3000);
}

/* ---------- Progress ---------- */
function getProgress(){ return LS.get('progress', {}); }
function toggleComplete(id){
  const p = getProgress();
  if(p[id]){ delete p[id]; } else { p[id] = Date.now(); }
  LS.set('progress', p);
  updateProgressUI();
  return !!p[id];
}
function updateProgressUI(){
  const p = getProgress();
  const done = Object.keys(p).length;
  const total = MODULES.length;
  const pct = total ? Math.round(done/total*100) : 0;
  $$('[data-progress-bar]').forEach(el=>el.style.width = pct+'%');
  $$('[data-progress-text]').forEach(el=>el.textContent = `${done} / ${total} মডিউল সম্পন্ন (${pct}%)`);
  $$('.nav-sub .nav-item').forEach(a=>{
    const id = a.getAttribute('data-mid');
    a.classList.toggle('completed', !!p[id]);
  });
}

/* ---------- Sidebar ---------- */
function buildSidebar(){
  const parts = {
    biogas:{label:'বায়োগ্যাস উৎপাদন', icon:'🔥'},
    vermicompost:{label:'ভার্মিকম্পোস্ট উৎপাদন', icon:'🪱'},
    integrated:{label:'সমন্বিত খামার', icon:'🔄'},
    business:{label:'ব্যবসা ও বাজার', icon:'💰'},
    learning:{label:'শিক্ষা ও রেফারেন্স', icon:'🎓'}
  };
  const sidebar = $('#sidebar');
  if(!sidebar) return;
  let html = '';
  for(const key in parts){
    const mods = MODULES.filter(m=>m.part===key);
    html += `<div class="nav-group">
      <div class="nav-group-title">${parts[key].label}</div>
      <div class="nav-sub open">
        ${mods.map(m=>`<div class="nav-item" data-mid="${m.id}" onclick="location.href='${pageForPart(key)}?module=${m.id}'">
          <span class="ico" style="font-size:14px">${m.num}.</span>
          <span style="flex:1">${m.title}</span>
        </div>`).join('')}
      </div>
    </div>`;
  }
  const extra = `
    <div class="nav-group">
      <div class="nav-group-title">সাধারণ</div>
      <a class="nav-item" href="index.html"><span class="ico">🏠</span> হোম</a>
      <a class="nav-item" href="dashboard.html"><span class="ico">📊</span> ড্যাশবোর্ড</a>
      <a class="nav-item" href="calculators.html"><span class="ico">🧮</span> ক্যালকুলেটর</a>
      <a class="nav-item" href="glossary.html"><span class="ico">📖</span> শব্দকোষ</a>
      <a class="nav-item" href="references.html"><span class="ico">📚</span> রেফারেন্স</a>
    </div>`;
  sidebar.querySelector('.sidebar-scroll').innerHTML = html + extra;
  updateProgressUI();
}
function pageForPart(part){
  if(part==='biogas') return 'biogas.html';
  if(part==='vermicompost') return 'vermicompost.html';
  if(part==='integrated') return 'integrated-farm.html';
  if(part==='business') return 'biogas.html';
  return 'index.html';
}

/* ---------- Mobile sidebar ---------- */
function toggleSidebar(){
  $('#sidebar')?.classList.toggle('open');
}

/* ---------- Search ---------- */
function initSearch(){
  const input = $('#globalSearch');
  const results = $('#searchResults');
  if(!input || !results) return;
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    if(q.length < 2){ results.classList.remove('show'); results.innerHTML=''; return; }
    const matches = MODULES.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.en.toLowerCase().includes(q) ||
      (m.summary||'').toLowerCase().includes(q)
    ).slice(0, 12);
    if(!matches.length){
      results.innerHTML = '<div class="sr-item"><span>কোনো ফলাফল পাওয়া যায়নি</span></div>';
    } else {
      results.innerHTML = matches.map(m=>`
        <div class="sr-item" onclick="location.href='${pageForPart(m.part)}?module=${m.id}'">
          <b>${m.num}. ${m.title}</b>
          <span>${m.en}</span>
        </div>`).join('');
    }
    results.classList.add('show');
  });
  document.addEventListener('click', e=>{
    if(!e.target.closest('.search-wrap')) results.classList.remove('show');
  });
}

/* ---------- Module listing ---------- */
function renderModuleList(part, container){
  const mods = MODULES.filter(m=>m.part===part);
  const p = getProgress();
  container.innerHTML = `<div class="mod-grid">${mods.map(m=>`
    <div class="mod-card" onclick="location.href='${pageForPart(part)}?module=${m.id}'">
      <div class="num">${m.num}</div>
      ${p[m.id] ? '<span class="done-badge">✓ সম্পন্ন</span>' : ''}
      <h4>${m.title}</h4>
      <p>${m.summary||''}</p>
      <div class="meta"><span>📖 ${m.read} মিনিট</span><span>${m.icon||''} ${m.en}</span></div>
    </div>`).join('')}</div>`;
}

/* ---------- Module detail ---------- */
function renderModule(id, container){
  const m = MODULES.find(x=>x.id===id);
  if(!m){
    container.innerHTML = '<div class="empty"><div class="em">🔍</div><p>মডিউলটি পাওয়া যায়নি।</p><a class="btn btn-primary" href="index.html">হোমে ফিরুন</a></div>';
    return;
  }
  const p = getProgress();
  const isDone = !!p[m.id];
  const samePart = MODULES.filter(x=>x.part===m.part);
  const idx = samePart.findIndex(x=>x.id===m.id);
  const prev = idx > 0 ? samePart[idx-1] : null;
  const next = idx < samePart.length-1 ? samePart[idx+1] : null;

  const sections = m.sections.map((s, i)=>`
    <section class="lesson-section" id="sec-${i+1}">
      <h2>${s.h}</h2>
      ${(s.p||[]).map(par=>`<p>${par}</p>`).join('')}
      ${s.list ? `<ul>${s.list.map(li=>`<li>${li}</li>`).join('')}</ul>` : ''}
      ${s.table ? `<div class="table-wrap"><table><thead><tr>${s.table.head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      ${s.callout ? `<div class="callout ${s.callout.type||''}"><b>${s.callout.title}</b>${s.callout.body}</div>` : ''}
    </section>`).join('');

  const terms = m.terms && m.terms.length ? `
    <section class="lesson-section" id="terms">
      <h2>মূল টার্ম</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>English</th><th>বাংলা</th><th>ব্যাখ্যা</th></tr></thead>
        <tbody>${m.terms.map(t=>`<tr><td><b>${t.en}</b></td><td>${t.bn}</td><td>${t.d}</td></tr>`).join('')}</tbody>
      </table></div>
    </section>` : '';

  container.innerHTML = `
    <div class="lesson-layout">
      <div class="lesson-main">
        <div class="page-head">
          <div class="crumb"><a href="index.html">হোম</a> › <a href="${pageForPart(m.part)}">${partLabel(m.part)}</a> › মডিউল ${m.num}</div>
          <h1>${m.icon||''} ${m.title}</h1>
          <p>${m.en}</p>
        </div>

        <div class="lesson-meta">
          <span>📖 পাঠের সময়: ~${m.read} মিনিট</span>
          <span>🔢 মডিউল ${m.num} / ৫৩</span>
          <span>${isDone ? '✅ সম্পন্ন' : '⏳ অসম্পন্ন'}</span>
        </div>

        <div class="objectives">
          <h3>🎯 শিক্ষার লক্ষ্য</h3>
          <ul>${(m.objectives||[]).map(o=>`<li>${o}</li>`).join('')}</ul>
        </div>

        ${sections}

        ${terms}

        ${m.safety ? `<div class="callout ${m.safety.includes('কখনো')||m.safety.includes('বিপদ')?'danger':'warn'}"><b>⚠️ নিরাপত্তা সতর্কতা</b>${m.safety}</div>` : ''}

        ${m.refs ? `<section class="lesson-section"><h2>রেফারেন্স</h2><ul class="refs">${m.refs.map(r=>`<li>${r}</li>`).join('')}</ul></section>` : ''}

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:24px">
          <button class="btn ${isDone?'btn-ghost':'btn-primary'}" onclick="handleComplete('${m.id}')">${isDone?'↺ সম্পন্নতা সরান':'✅ পাঠ সম্পন্ন হিসেবে চিহ্নিত করুন'}</button>
          <button class="btn btn-ghost" onclick="window.print()">🖨️ প্রিন্ট করুন</button>
        </div>

        <div class="lesson-nav">
          ${prev ? `<a class="btn btn-ghost" href="${pageForPart(prev.part)}?module=${prev.id}" style="flex-direction:column;align-items:flex-start;height:auto;padding:12px 16px">
            <span class="lbl">← পূর্ববর্তী</span><span class="ttl">${prev.title}</span></a>` : '<span></span>'}
          ${next ? `<a class="btn btn-ghost" href="${pageForPart(next.part)}?module=${next.id}" style="flex-direction:column;align-items:flex-end;height:auto;padding:12px 16px;text-align:right">
            <span class="lbl">পরবর্তী →</span><span class="ttl">${next.title}</span></a>` : '<span></span>'}
        </div>
      </div>

      <aside class="lesson-toc">
        <b>এই পাঠে</b>
        ${m.sections.map((s,i)=>`<a href="#sec-${i+1}">${s.h}</a>`).join('')}
        ${m.terms && m.terms.length ? '<a href="#terms">মূল টার্ম</a>' : ''}
        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)">
          <div class="progress"><div style="width:${Math.min(100,(m.read/30)*100)}%"></div></div>
        </div>
      </aside>
    </div>`;

  // scroll spy
  const tocLinks = $$('.lesson-toc a');
  const secs = $$('.lesson-section');
  window.addEventListener('scroll', ()=>{
    let cur = '';
    secs.forEach(s=>{ if(s.getBoundingClientRect().top < 120) cur = s.id; });
    tocLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+cur));
  }, {passive:true});
}
function handleComplete(id){
  const done = toggleComplete(id);
  toast(done ? '✅ মডিউল সম্পন্ন হয়েছে!' : '↺ সম্পন্নতা সরানো হয়েছে', done?'ok':'warn');
  setTimeout(()=>location.reload(), 400);
}
function partLabel(p){
  return {biogas:'বায়োগ্যাস', vermicompost:'ভার্মিকম্পোস্ট', integrated:'সমন্বিত খামার', business:'ব্যবসা', learning:'শিক্ষা'}[p] || p;
}

/* ============================================================
   CALCULATORS
   ============================================================ */
function fmt(n, d=2){ return Number(n).toLocaleString('bn-BD',{maximumFractionDigits:d}); }
function val(id){ const el = document.getElementById(id); if(!el) return NaN; return parseFloat(el.value); }
function setErr(id, msg){
  const el = document.getElementById(id);
  const e = document.getElementById(id+'Err');
  if(el) el.classList.toggle('invalid', !!msg);
  if(e){ e.textContent = msg || ''; e.classList.toggle('show', !!msg); }
}

function calcSlurry(){
  const dung = val('sd-dung'), mc = val('sd-mc'), tts = val('sd-ts');
  let ok = true;
  if(!(dung > 0)){ setErr('sd-dung','সঠিক পরিমাণ দিন'); ok=false; } else setErr('sd-dung','');
  if(!(mc >= 0 && mc < 100)){ setErr('sd-mc','০–৯৯ এর মধ্যে দিন'); ok=false; } else setErr('sd-mc','');
  if(!(tts > 0 && tts < 100)){ setErr('sd-ts','১–৯৯ এর মধ্যে দিন'); ok=false; } else setErr('sd-ts','');
  if(!ok) return;

  const currentTS = dung * (1 - mc/100);
  const targetTS = currentTS / (tts/100);
  const water = Math.max(0, targetTS - dung);
  const totalSlurry = dung + water;

  document.getElementById('sd-result').innerHTML = `
    <h4>ফলাফল <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>বর্তমান শুকনো ভর (TS)</span><span>${fmt(currentTS)} kg</span></div>
    <div class="res-row"><span>প্রয়োজনীয় পানি</span><span>${fmt(water)} লিটার</span></div>
    <div class="res-row"><span>মোট Slurry</span><span>${fmt(totalSlurry)} kg</span></div>
    <div class="res-row"><span>Daily Feed Volume</span><span>≈ ${fmt(totalSlurry)} লিটার</span></div>
    <div class="steps">
      <div>১. শুকনো ভর = গোবর × (১ − আর্দ্রতা/১০০) = <code>${fmt(currentTS)} kg</code></div>
      <div>২. Target Total Mass = শুকনো ভর ÷ (Target TS/১০০) = <code>${fmt(targetTS)} kg</code></div>
      <div>৩. পানি = Target Total Mass − গোবর = <code>${fmt(water)} লিটার</code></div>
      <div>৪. Slurry = গোবর + পানি = <code>${fmt(totalSlurry)} kg</code></div>
    </div>
    <div class="callout" style="margin-top:12px;font-size:12.5px">এটি আনুমানিক হিসাব; প্রকৃত TS ল্যাবে যাচাই করুন। ডাইজেস্টার ডিজাইনে যোগ্য প্রকৌশলীর পরামর্শ নিন।</div>
  `;
  document.getElementById('sd-result').style.display = 'block';
}

function calcSizing(){
  const slurry = val('bs-slurry'), hrt = val('bs-hrt'), gasY = val('bs-yield');
  let ok = true;
  if(!(slurry>0)){ setErr('bs-slurry','সঠিক slurry দিন'); ok=false; } else setErr('bs-slurry','');
  if(!(hrt>0)){ setErr('bs-hrt','HRT দিন'); ok=false; } else setErr('bs-hrt','');
  if(!(gasY>0)){ setErr('bs-yield','গ্যাস উৎপাদন হার দিন'); ok=false; } else setErr('bs-yield','');
  if(!ok) return;

  const digester = slurry * hrt;
  const gasDaily = slurry * gasY;
  const gasHolder = gasDaily * 0.4;
  const digestate = slurry * 0.85;

  document.getElementById('bs-result').innerHTML = `
    <h4>ডিজাইন ফলাফল <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>Digester Volume</span><span>${fmt(digester)} m³</span></div>
    <div class="res-row"><span>Daily Gas Production</span><span>${fmt(gasDaily)} m³/day</span></div>
    <div class="res-row"><span>Gas Holder Volume (৪০%)</span><span>${fmt(gasHolder)} m³</span></div>
    <div class="res-row"><span>আনুমানিক Digestate</span><span>${fmt(digestate)} m³/day</span></div>
    <div class="steps">
      <div>Digester Volume = Slurry × HRT = <code>${fmt(slurry)} × ${fmt(hrt)} = ${fmt(digester)} m³</code></div>
      <div>Gas = Slurry × Yield = <code>${fmt(gasDaily)} m³/day</code></div>
      <div>Gas Holder ≈ ৪০% × Gas = <code>${fmt(gasHolder)} m³</code></div>
    </div>
    <div class="callout danger" style="margin-top:12px;font-size:12.5px"><b>Engineering Design আবশ্যক</b>বাস্তব নির্মাণের আগে সাইট-ভিত্তিক মাটি পরীক্ষা ও যোগ্য সিভিল ইঞ্জিনিয়ারের নকশা নিন।</div>
  `;
  document.getElementById('bs-result').style.display = 'block';
}

function calcBusiness(){
  const capex = val('bb-capex'), monthlyCost = val('bb-cost'), gasUse = val('bb-gas'), gasPrice = val('bb-price');
  let ok = true;
  if(!(capex>=0)){ setErr('bb-capex','সঠিক বিনিয়োগ দিন'); ok=false; } else setErr('bb-capex','');
  if(!(monthlyCost>=0)){ setErr('bb-cost','সঠিক খরচ দিন'); ok=false; } else setErr('bb-cost','');
  if(!ok) return;
  const rev = (gasUse||0) * (gasPrice||0);
  const net = rev - monthlyCost;
  const annualNet = net * 12;
  const payback = (net > 0 && capex > 0) ? capex / annualNet : Infinity;
  const roi = capex > 0 ? (annualNet / capex) * 100 : 0;

  document.getElementById('bb-result').innerHTML = `
    <h4>আর্থিক বিশ্লেষণ <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>মাসিক আয়</span><span>৳ ${fmt(rev)}</span></div>
    <div class="res-row"><span>মাসিক খরচ</span><span>৳ ${fmt(monthlyCost)}</span></div>
    <div class="res-row"><span>মাসিক নিট মুনাফা</span><span>৳ ${fmt(net)}</span></div>
    <div class="res-row"><span>বার্ষিক নিট মুনাফা</span><span>৳ ${fmt(annualNet)}</span></div>
    <div class="res-row"><span>Payback Period</span><span>${isFinite(payback)?fmt(payback)+' বছর':'—'}</span></div>
    <div class="res-row"><span>ROI</span><span>${fmt(roi)}%</span></div>
    <div class="steps">Net = Revenue − Cost; Payback = Capex ÷ Annual Net; ROI = (Annual Net ÷ Capex) × 100</div>
  `;
  document.getElementById('bb-result').style.display = 'block';
}

function calcFeed(){
  const biomass = val('vf-biomass'), rate = val('vf-rate'), interval = val('vf-interval');
  let ok = true;
  if(!(biomass>0)){ setErr('vf-biomass','কেঁচোর মোট ওজন দিন'); ok=false; } else setErr('vf-biomass','');
  if(!(rate>0)){ setErr('vf-rate','Feed rate দিন'); ok=false; } else setErr('vf-rate','');
  if(!(interval>0)){ setErr('vf-interval','দিন দিন'); ok=false; } else setErr('vf-interval','');
  if(!ok) return;

  const daily = biomass * rate/100;
  const perFeed = daily * interval;
  const next = new Date(); next.setDate(next.getDate()+interval);

  document.getElementById('vf-result').innerHTML = `
    <h4>Feed পরিকল্পনা <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>দৈনিক Feed</span><span>${fmt(daily)} kg</span></div>
    <div class="res-row"><span>প্রতি Feeding-এ</span><span>${fmt(perFeed)} kg</span></div>
    <div class="res-row"><span>পরবর্তী Feeding</span><span>${next.toLocaleDateString('bn-BD')}</span></div>
    <div class="steps">Daily Feed = Biomass × Rate%; Per Feed = Daily × Interval</div>
    <div class="callout" style="margin-top:12px;font-size:12.5px">এটি প্রাথমিক নির্দেশনা; কেঁচোর অবস্থা ও বেড দেখে সমন্বয় করুন।</div>
  `;
  document.getElementById('vf-result').style.display = 'block';
}

function calcWormPop(){
  const area = val('wp-area'), perSqft = val('wp-per');
  let ok = true;
  if(!(area>0)){ setErr('wp-area','এলাকা দিন'); ok=false; } else setErr('wp-area','');
  if(!(perSqft>0)){ setErr('wp-per','কেঁচো/বর্গফুট দিন'); ok=false; } else setErr('wp-per','');
  if(!ok) return;
  const total = area * perSqft;
  const biomass = total * 0.6; // g per worm approximate
  document.getElementById('wp-result').innerHTML = `
    <h4>জনসংখ্যা অনুমান <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>মোট কেঁচো</span><span>≈ ${fmt(total,0)}</span></div>
    <div class="res-row"><span>আনুমানিক ওজন</span><span>≈ ${fmt(biomass/1000,2)} kg</span></div>
    <div class="steps">Population = Area × Per sqft; Biomass ≈ Population × ০.৬ গ্রাম</div>
  `;
  document.getElementById('wp-result').style.display = 'block';
}

function calcBed(){
  const L = val('bd-l'), W = val('bd-w'), D = val('bd-d'), density = val('bd-density');
  let ok = true;
  if(!(L>0)){ setErr('bd-l','দৈর্ঘ্য দিন'); ok=false; } else setErr('bd-l','');
  if(!(W>0)){ setErr('bd-w','প্রস্থ দিন'); ok=false; } else setErr('bd-w','');
  if(!(D>0)){ setErr('bd-d','গভীরতা দিন'); ok=false; } else setErr('bd-d','');
  if(!ok) return;
  const vol = L * W * D;
  const worms = (density || 200) * L * W;
  document.getElementById('bd-result').innerHTML = `
    <h4>বেড ডিজাইন <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>আয়তন</span><span>${fmt(vol)} ঘনফুট</span></div>
    <div class="res-row"><span>পৃষ্ঠতল</span><span>${fmt(L*W)} বর্গফুট</span></div>
    <div class="res-row"><span>প্রস্তাবিত কেঁচো</span><span>≈ ${fmt(worms,0)}</span></div>
    <div class="steps">Volume = L × W × D; Worm Count = Density × Area</div>
  `;
  document.getElementById('bd-result').style.display = 'block';
}

function calcIntegrated(){
  const bCapex = val('if-bcapex')||0, vCapex = val('if-vcapex')||0;
  const monthlyCost = val('if-cost')||0;
  const revGas = val('if-revgas')||0, revVermi = val('if-revvermi')||0, revWorm = val('if-revworm')||0;
  let ok = true;
  if(bCapex<0 || vCapex<0){ ok=false; }
  if(!ok) return;
  const totalCapex = bCapex + vCapex;
  const monthlyRev = revGas + revVermi + revWorm;
  const monthlyNet = monthlyRev - monthlyCost;
  const annualNet = monthlyNet * 12;
  const payback = (monthlyNet > 0 && totalCapex > 0) ? totalCapex / annualNet : Infinity;
  const roi = totalCapex > 0 ? (annualNet/totalCapex)*100 : 0;

  document.getElementById('if-result').innerHTML = `
    <h4>সমন্বিত হিসাব <span class="res-badge">Estimated</span></h4>
    <div class="res-row"><span>মোট বিনিয়োগ</span><span>৳ ${fmt(totalCapex)}</span></div>
    <div class="res-row"><span>মাসিক আয়</span><span>৳ ${fmt(monthlyRev)}</span></div>
    <div class="res-row"><span>মাসিক খরচ</span><span>৳ ${fmt(monthlyCost)}</span></div>
    <div class="res-row"><span>মাসিক নিট</span><span>৳ ${fmt(monthlyNet)}</span></div>
    <div class="res-row"><span>Payback</span><span>${isFinite(payback)?fmt(payback)+' বছর':'—'}</span></div>
    <div class="res-row"><span>ROI</span><span>${fmt(roi)}%</span></div>
    <div class="callout" style="margin-top:12px;font-size:12.5px">Internal transfer ও external purchase আলাদা রাখুন — একই খরচ দুইবার যোগ করবেন না।</div>
  `;
  document.getElementById('if-result').style.display = 'block';
}

/* ---------- Calculator tabs ---------- */
function initCalcTabs(){
  const tabs = $$('.tab[data-calc]');
  const panels = $$('.calc-panel');
  if(!tabs.length) return;
  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      const key = t.getAttribute('data-calc');
      panels.forEach(p=>p.style.display = p.getAttribute('data-panel')===key ? 'block':'none');
    });
  });
}

/* ---------- Dashboard ---------- */
function initDashboard(){
  if(!document.getElementById('dash')) return;

  const demo = LS.get('demoData', {
    biogasDaily: 4.2, biogasTotal: 380, dungInput: 120, digestate: 95,
    activeBeds: 6, wormPop: 18500, dailyFeed: 18, vermiEst: 60, totalStock: 240,
    monthlyRevenue: 22000, monthlyExpense: 8500, profit: 13500
  });
  LS.set('demoData', demo);

  const cards = [
    {label:'মোট বায়োগ্যাস উৎপাদন', value: demo.biogasTotal+' m³', sub:'সর্বকালীন (ডেমো)', icon:'🔥', cls:''},
    {label:'দৈনিক গ্যাস উৎপাদন', value: demo.biogasDaily+' m³', sub:'গত ২৪ ঘণ্টা', icon:'⚡', cls:'info'},
    {label:'দৈনিক গোবর ইনপুট', value: demo.dungInput+' kg', sub:'আজ', icon:'🐄', cls:'earth'},
    {label:'Digestate আউটপুট', value: demo.digestate+' kg', sub:'আজ', icon:'💧', cls:'info'},
    {label:'সক্রিয় বেড', value: demo.activeBeds, sub:'Production + Breeding', icon:'🛏️', cls:''},
    {label:'কেঁচোর সংখ্যা', value: demo.wormPop.toLocaleString('bn-BD'), sub:'আনুমানিক', icon:'🪱', cls:'earth'},
    {label:'দৈনিক Feed', value: demo.dailyFeed+' kg', sub:'আজ', icon:'🍽️', cls:''},
    {label:'আনুমানিক ভার্মিকম্পোস্ট', value: demo.vermiEst+' kg', sub:'চলতি মাস', icon:'🌱', cls:'info'},
    {label:'মোট Stock', value: demo.totalStock+' kg', sub:'ভার্মিকম্পোস্ট', icon:'📦', cls:''},
    {label:'মাসিক আয়', value:'৳ '+demo.monthlyRevenue.toLocaleString('bn-BD'), sub:'ডেমো', icon:'💰', cls:''},
    {label:'মাসিক খরচ', value:'৳ '+demo.monthlyExpense.toLocaleString('bn-BD'), sub:'ডেমো', icon:'📉', cls:'warn'},
    {label:'আনুমানিক মুনাফা', value:'৳ '+demo.profit.toLocaleString('bn-BD'), sub:'ডেমো', icon:'📈', cls:''}
  ];

  document.getElementById('dash-cards').innerHTML = cards.map(c=>`
    <div class="stat ${c.cls}">
      <span class="s-tag demo">Demo</span>
      <div class="s-top"><div class="s-ico">${c.icon}</div></div>
      <div class="s-label">${c.label}</div>
      <div class="s-value">${c.value}</div>
      <div class="s-sub">${c.sub}</div>
    </div>`).join('');

  // Charts
  const ctx1 = document.getElementById('chartGas');
  const ctx2 = document.getElementById('chartVermi');
  if(ctx1 && window.Chart){
    new Chart(ctx1, {
      type:'line',
      data:{
        labels:['সপ্তাহ ১','সপ্তাহ ২','সপ্তাহ ৩','সপ্তাহ ৪','সপ্তাহ ৫','সপ্তাহ ৬'],
        datasets:[{label:'গ্যাস (m³)', data:[24,28,26,31,34,36], borderColor:'#40916c', backgroundColor:'rgba(64,145,108,.15)', fill:true, tension:.4}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
    });
  }
  if(ctx2 && window.Chart){
    new Chart(ctx2, {
      type:'bar',
      data:{
        labels:['বেড A','বেড B','বেড C','বেড D','বেড E','বেড F'],
        datasets:[{label:'ভার্মিকম্পোস্ট (kg)', data:[35,42,38,50,45,40], backgroundColor:['#40916c','#52b788','#74c69d','#95d5b2','#2d6a4f','#1b4332'], borderRadius:6}]
      },
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}
    });
  }

  // Tasks
  const tasks = LS.get('tasks', [
    {t:'গোবর সংগ্রহ ও ডাইজেস্টারে দেওয়া', p:'high', done:false},
    {t:'Bed A-তে feed দেওয়া', p:'med', done:false},
    {t:'Gas pressure পরীক্ষা', p:'high', done:false},
    {t:'Condensate trap খালি করা', p:'low', done:false},
    {t:'ভার্মিকম্পোস্ট Batch 3 প্যাকেজিং', p:'med', done:false}
  ]);
  const taskBox = document.getElementById('dash-tasks');
  if(taskBox){
    taskBox.innerHTML = tasks.map((t,i)=>`
      <label class="task ${t.done?'done':''}">
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleTask(${i})">
        <span>${t.t}</span>
        <span class="badge badge-${t.p}">${t.p==='high'?'উচ্চ':t.p==='med'?'মাঝারি':'নিম্ন'}</span>
      </label>`).join('');
  }

  // Alerts
  document.getElementById('dash-alerts').innerHTML = `
    <div class="callout warn"><b>⚠️ Digestate পরীক্ষা</b>নতুন digestate ব্যাচের pH, EC ও অ্যামোনিয়া পরীক্ষা করুন — कেঁচোর बेडে দেওয়ার আগে।</div>
    <div class="callout"><b>🔧 প্ল্যান্ট মেইনটেন্যান্স</b>H₂S ফিল্টার ২ সপ্তাহ পর পরিবর্তনের সময়।</div>
    <div class="callout ok"><b>✅ ভালো অবস্থা</b>Bed A ও B-তে কেঁচোর সংখ্যা গত সপ্তাহের তুলনায় বেড়েছে।</div>`;
}
function toggleTask(i){
  const tasks = LS.get('tasks', []);
  if(tasks[i]){ tasks[i].done = !tasks[i].done; LS.set('tasks', tasks); initDashboard(); }
}

/* ---------- Glossary ---------- */
function renderGlossary(filter=''){
  const box = document.getElementById('gloss-list');
  if(!box) return;
  const q = filter.toLowerCase();
  const list = GLOSSARY.filter(g => !q || g.en.toLowerCase().includes(q) || g.bn.includes(q));
  if(!list.length){ box.innerHTML = '<div class="empty"><div class="em">🔍</div><p>কোনো শব্দ পাওয়া যায়নি</p></div>'; return; }
  box.innerHTML = list.map(g=>`
    <div class="gloss-item">
      <b>${g.en}</b>
      <div class="bn">${g.bn}</div>
      <p>${g.d}</p>
    </div>`).join('');
}

/* ---------- References ---------- */
function renderReferences(){
  const box = document.getElementById('refs-list');
  if(!box) return;
  box.innerHTML = REFERENCES.map(r=>`
    <div class="gloss-item">
      <b>${r.org}</b>
      <div class="bn">${r.title}</div>
      <p>${r.link !== '—' ? `<a href="${r.link}" target="_blank" rel="noopener">${r.link}</a>` : 'লাইব্রেরি/বই রেফারেন্স'}</p>
    </div>`).join('');
}

/* ---------- CSV Import/Export ---------- */
function exportCSV(){
  const rows = [['Key','Value']];
  for(let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    rows.push([k, localStorage.getItem(k)]);
  }
  const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'biovermi-backup-'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); URL.revokeObjectURL(url);
  toast('📥 ব্যাকআপ ডাউনলোড হয়েছে');
}
function importCSV(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const lines = ev.target.result.split('\n').slice(1);
    let count = 0;
    lines.forEach(line => {
      const m = line.match(/"([^"]*)","([^"]*)"/);
      if(m && m[1]){ try{ localStorage.setItem(m[1], m[2]); count++; }catch(err){} }
    });
    toast(`📤 ${count}টি এন্ট্রি রিস্টোর হয়েছে`,'ok');
    setTimeout(()=>location.reload(),800);
  };
  reader.readAsText(file);
}

/* ---------- Page bootstrap ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  buildSidebar();
  initSearch();

  // Theme buttons
  $$('[data-theme-toggle]').forEach(b=>b.addEventListener('click', toggleTheme));
  $$('[data-sidebar-toggle]').forEach(b=>b.addEventListener('click', toggleSidebar));

  // Nav active
  const path = location.pathname.split('/').pop() || 'index.html';
  $$('.nav-item').forEach(a=>{
    if(a.getAttribute('href')===path && !a.getAttribute('data-mid')) a.classList.add('active');
  });

  const page = document.body.getAttribute('data-page');
  const params = new URLSearchParams(location.search);
  const mid = params.get('module');

  if(page==='biogas' || page==='vermicompost' || page==='integrated'){
    const main = document.getElementById('page-content');
    if(mid && main){
      renderModule(mid, main);
    } else if(main){
      const part = page==='biogas'?'biogas':page==='vermicompost'?'vermicompost':'integrated';
      const titles = {biogas:'🔥 বায়োগ্যাস উৎপাদন মডিউল', vermicompost:'🪱 ভার্মিকম্পোস্ট মডিউল', integrated:'🔄 সমন্বিত খামার মডিউল'};
      main.innerHTML = `
        <div class="page-head">
          <div class="crumb"><a href="index.html">হোম</a> › ${partLabel(part)}</div>
          <h1>${titles[part]}</h1>
          <p>প্রতিটি মডিউলে ক্লিক করে বিস্তারিত পাঠ শুরু করুন। পাঠ সম্পন্ন করলে প্রগ্রেস ট্র্যাক হবে।</p>
        </div>
        <div id="mod-list"></div>`;
      renderModuleList(part, document.getElementById('mod-list'));
    }
  }

  if(page==='dashboard') initDashboard();
  if(page==='glossary'){
    renderGlossary();
    document.getElementById('gloss-search')?.addEventListener('input', e=>renderGlossary(e.target.value));
  }
  if(page==='references') renderReferences();
  if(page==='calculators') initCalcTabs();
  if(page==='home'){
    const box = document.getElementById('featured-mods');
    if(box){
      const featured = MODULES.filter(m=>[1,3,12,17,26,40].includes(m.num));
      box.innerHTML = featured.map(m=>`
        <div class="mod-card" onclick="location.href='${pageForPart(m.part)}?module=${m.id}'">
          <div class="num">${m.num}</div>
          <h4>${m.title}</h4>
          <p>${m.summary}</p>
          <div class="meta"><span>📖 ${m.read} মিনিট</span></div>
        </div>`).join('');
    }
  }
  updateProgressUI();
});
