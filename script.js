/* ============================================================
   BioVermi Bangladesh — Core Application (Bug Fixed)
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
}

/* ---------- Sidebar ---------- */
function buildSidebar(){
  const sidebarNav = document.getElementById('sidebar-nav'); // HTML এর id
  if(!sidebarNav) return;

  const parts = {
    biogas:{label:'বায়োগ্যাস উৎপাদন'},
    vermicompost:{label:'ভার্মিকম্পোস্ট উৎপাদন'},
    integrated:{label:'সমন্বিত খামার'},
    business:{label:'ব্যবসা ও বাজার'},
    learning:{label:'শিক্ষা ও রেফারেন্স'}
  };
  let html = '';
  for(const key in parts){
    if(typeof MODULES !== 'undefined'){
      const mods = MODULES.filter(m=>m.part===key);
      if(mods.length === 0) continue;
      html += `<div class="nav-group">
        <div class="nav-group-title">${parts[key].label}</div>
        <div class="nav-sub open">
          ${mods.map(m=>`<div class="nav-item" data-mid="${m.id}" onclick="location.href='${pageForPart(key)}?module=${m.id}'">
            <span class="ico" style="font-size:13px">${m.num}.</span>
            <span style="flex:1; line-height:1.3; font-size:13.5px">${m.title}</span>
          </div>`).join('')}
        </div>
      </div>`;
    }
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
    
  sidebarNav.innerHTML = html + extra;
  updateProgressUI();
}

function pageForPart(part){
  if(part==='biogas') return 'biogas.html';
  if(part==='vermicompost') return 'vermicompost.html';
  if(part==='integrated') return 'integrated-farm.html';
  if(part==='business') return 'integrated-farm.html';
  return 'glossary.html';
}

/* ---------- Search ---------- */
function initSearch(){
  const input = $('#globalSearch');
  const results = $('#searchResults');
  if(!input || !results) return;
  input.addEventListener('input', ()=>{
    const q = input.value.trim().toLowerCase();
    if(q.length < 2){ results.classList.remove('show'); return; }
    if(typeof MODULES === 'undefined') return;
    
    const matches = MODULES.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.en && m.en.toLowerCase().includes(q))
    ).slice(0, 10);
    
    if(!matches.length){
      results.innerHTML = '<div class="sr-item"><span>কোনো ফলাফল নেই</span></div>';
    } else {
      results.innerHTML = matches.map(m=>`
        <div class="sr-item" onclick="location.href='${pageForPart(m.part)}?module=${m.id}'">
          <b>${m.num}. ${m.title}</b>
        </div>`).join('');
    }
    results.classList.add('show');
  });
  document.addEventListener('click', e=>{
    if(!e.target.closest('.search-wrap')) results.classList.remove('show');
  });
}

/* ---------- Render Modules ---------- */
function renderModuleList(part, container){
  if(typeof MODULES === 'undefined') return;
  const mods = MODULES.filter(m=>m.part===part);
  container.innerHTML = `<div class="mod-grid">${mods.map(m=>`
    <div class="mod-card" onclick="location.href='${pageForPart(part)}?module=${m.id}'">
      <div class="num">${m.num}</div>
      <h4>${m.title}</h4>
      <p>${m.summary||''}</p>
      <div class="meta"><span>📖 ${m.read} মিনিট</span></div>
    </div>`).join('')}</div>`;
}

function renderModule(id, container){
  if(typeof MODULES === 'undefined') return;
  const m = MODULES.find(x=>x.id===id);
  if(!m){
    container.innerHTML = '<div class="empty"><h2>মডিউল পাওয়া যায়নি</h2></div>';
    return;
  }
  const p = getProgress();
  const isDone = !!p[m.id];

  const sections = m.sections.map((s, i)=>`
    <section class="lesson-section" id="sec-${i+1}">
      <h2>${s.h}</h2>
      ${(s.p||[]).map(par=>`<p>${par}</p>`).join('')}
      ${s.list ? `<ul>${s.list.map(li=>`<li>${li}</li>`).join('')}</ul>` : ''}
      ${s.table ? `<div class="table-wrap"><table><thead><tr>${s.table.head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${s.table.rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
    </section>`).join('');

  const objectives = m.objectives && m.objectives.length ? `
    <div class="objectives">
      <h3>🎯 শিক্ষার লক্ষ্য</h3>
      <ul>${m.objectives.map(o=>`<li>${o}</li>`).join('')}</ul>
    </div>` : '';

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
          <h1>${m.icon||''} ${m.title}</h1>
          <p>${m.en||''}</p>
        </div>
        <div class="lesson-meta">
          <span>📖 ~${m.read} মিনিট</span>
          <span>🔢 মডিউল ${m.num} / ৫৩</span>
        </div>
        ${objectives}
        ${sections}
        ${terms}
        ${m.safety ? `<div class="callout danger"><b>⚠️ নিরাপত্তা সতর্কতা</b>${m.safety}</div>` : ''}
        
        <div style="margin-top:24px">
          <button class="btn ${isDone?'btn-ghost':'btn-primary'}" onclick="handleComplete('${m.id}')">${isDone?'↺ সরান':'✅ সম্পন্ন করুন'}</button>
        </div>
      </div>
    </div>`;
  window.scrollTo(0,0);
}

function handleComplete(id){
  toggleComplete(id);
  location.reload();
}

/* ---------- App Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  initTheme();
  buildSidebar();
  initSearch();

  const page = document.body.getAttribute('data-page');
  const params = new URLSearchParams(location.search);
  const mid = params.get('module');

  if(page==='biogas' || page==='vermicompost' || page==='integrated'){
    const main = document.getElementById('page-content');
    if(mid && main){
      renderModule(mid, main);
    } else if(main){
      const part = page==='biogas'?'biogas':page==='vermicompost'?'vermicompost':'integrated';
      main.innerHTML = `<div class="page-head"><h1>মডিউল সমূহ</h1></div><div id="mod-list"></div>`;
      renderModuleList(part, document.getElementById('mod-list'));
    }
  }
  updateProgressUI();
});
