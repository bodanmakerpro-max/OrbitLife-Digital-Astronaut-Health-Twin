'use strict';
/* PulseDeck 13: calmer homepage, records search and accessible interaction updates. */
(() => {
  const el=id=>document.getElementById(id);
  const escapeText=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fields={date:'calendar',sleep:'moon',hr:'heart',spo2:'lungs',mass:'scale',exercise:'activity',water:'drop',mood:'smile',stress:'pulse',fatigue:'battery',systolic:'heart',diastolic:'heart',temperature_c:'thermometer',glucose_mgdl:'drop',notes:'note'};
  const paths={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',moon:'<path d="M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11Z"/>',heart:'<path d="M20 5a5 5 0 0 0-8 0 5 5 0 0 0-8 7l8 8 8-8a5 5 0 0 0 0-7Z"/>',lungs:'<path d="M12 3v10M10 9C6 6 3 8 3 15s7 7 8 2m3-8c4-3 7-1 7 6s-7 7-8 2"/>',scale:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 12a4 4 0 0 1 8 0M12 12l2-3"/>',activity:'<path d="M2 12h4l3-7 5 14 3-7h5"/>',drop:'<path d="M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0c0-4-3-7-7-13Z"/>',smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14a5 5 0 0 0 8 0M8 9h.01M16 9h.01"/>',pulse:'<path d="M3 14h4l2-5 3 8 3-5h6"/>',battery:'<rect x="3" y="7" width="17" height="10" rx="2"/><path d="M21 10v4M6 10v4"/>',thermometer:'<path d="M10 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z"/>',note:'<path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/>'};
  function icon(name){return `<svg class="ol-input-svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.note}</svg>`;}
  function dailyIcons(){
    const form=el('dailyForm'); if(!form)return;
    for(const [name,type] of Object.entries(fields)){
      const input=form.querySelector(`[name="${name}"]`),label=input?.closest('label');
      if(label&&!label.querySelector('.ol-input-symbol')){
        const span=document.createElement('span');span.className='ol-input-symbol';span.innerHTML=icon(type);label.prepend(span);
      }
    }
  }
  const translations={en:{all:'All topics',search:'Search records',clear:'All dates'},mk:{all:'Сите теми',search:'Пребарај',clear:'Сите датуми'},fr:{all:'Tous les sujets',search:'Rechercher',clear:'Toutes les dates'},ru:{all:'Все темы',search:'Поиск',clear:'Все даты'}};
  async function searchRecords(){
    if(!state.me)return;
    const q=new URLSearchParams({topic:el('olRecordTopic').value});
    if(el('olRecordFrom').value)q.set('from',el('olRecordFrom').value);
    if(el('olRecordTo').value)q.set('to',el('olRecordTo').value);
    if(state.me.admin && state.target)q.set('astronaut_id',state.target);
    el('olRecordCount').textContent='Searching saved records…';
    try{
      const result=await api('/api/records-search?'+q);
      el('olRecordCount').textContent=`${result.records.length} record${result.records.length===1?'':'s'} found · ${state.crew.find(c=>c.astronaut_id===result.astronaut_id)?.name||result.astronaut_id}`;
      el('olRecordResults').innerHTML=result.records.length?result.records.map((r,i)=>`<details class="ol-record-item" ${i===0?'open':''}><summary><span class="ol-record-category">${escapeText(r.topic)}</span><strong>${escapeText(r.title||r.topic)}</strong><time>${escapeText(r.date.slice(0,16).replace('T',' '))||'Date unknown'}</time><span class="ol-record-chevron">⌄</span></summary><div class="ol-record-fields">${Object.entries(r.fields).map(([k,v])=>`<div><small>${escapeText(k.replaceAll('_',' '))}</small><b>${escapeText(v)}</b></div>`).join('')}</div></details>`).join(''):'<p class="ol-record-empty">No records match the selected topic and dates.</p>';
    }catch(err){el('olRecordCount').textContent='Unable to load records';el('olRecordResults').textContent=err.message;}
  }
  function initRecords(){
    el('olRecordForm')?.addEventListener('submit',e=>{e.preventDefault();searchRecords();});
    el('olRecordClear')?.addEventListener('click',()=>{el('olRecordFrom').value='';el('olRecordTo').value='';searchRecords();});
    const previous=window.goto;
    window.goto=function(view){previous(view);if(view==='records')searchRecords();};
  }
  function initHome(){
    const homeAi=document.querySelector('.ol-home-ai-details');
    if(homeAi)homeAi.remove();
    document.querySelectorAll('[data-ol-open]').forEach(button=>button.addEventListener('click',()=>{
      const view=button.dataset.olOpen;
      if(view==='quickai'){window.OrbitLifeQuickAI?.open();return;}
      if(!['crew','menu'].includes(view) && !state.me){el('loginModal').classList.remove('hidden');return;}
      goto(view);
    }));
    document.querySelectorAll('[data-public-target]').forEach(button=>{
      if(button.dataset.publicTarget==='crewGrid')return;
      button.addEventListener('click',()=>goto('crew'));
    });
    // Keep the single homepage assistant for guests and the personal assistant for signed-in crew.
    const prevAuth=window.updateAuth;
    window.updateAuth=function(...args){const output=prevAuth(...args);el('olHomeWorkspace')?.classList.toggle('ol-home-authenticated',!!state.me);return output;};
  }
  function emergencyScenarioLabel(){
    const medicalPanel=el('olEmergencyCard');if(!medicalPanel)return;
    const obs=new MutationObserver(()=>{
      if(!window.orbitLastEmergencyScenario)return;
      if(!medicalPanel.querySelector('.ol-scenario-note')){
        const note=document.createElement('p');note.className='ol-scenario-note';note.textContent='Fictional training record. Emergency details have not been clinically verified.';
        medicalPanel.prepend(note);
      }
    });
    obs.observe(medicalPanel,{childList:true});
  }
  function init(){
    dailyIcons();initRecords();initHome();
    const titleWrap=document.querySelector('#view-personal .personal-identity-left > div');
    if(titleWrap && !document.getElementById('olPersonalQuickFacts')){const quick=document.createElement('div');quick.id='olPersonalQuickFacts';quick.className='ol-personal-quickfacts';titleWrap.appendChild(quick);} 
    el('olRecordFrom').value='';el('olRecordTo').value='';
    // Fictional emergency cards are explicitly marked by the emergency panel itself.
  }
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();
function orbitLoginTransition(name){
  let overlay=document.getElementById('olLoginTransition');
  if(!overlay){overlay=document.createElement('div');overlay.id='olLoginTransition';overlay.setAttribute('aria-live','polite');overlay.innerHTML='<div class="ol-login-icon">◎</div><strong></strong><span>Loading your health dashboard</span>';document.body.append(overlay);}
  overlay.querySelector('strong').textContent='Welcome, '+name;
  overlay.classList.add('shown');overlay.classList.remove('leaving');
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){overlay.classList.remove('shown');return;}
  setTimeout(()=>{overlay.classList.add('leaving');setTimeout(()=>overlay.classList.remove('shown','leaving'),300);},650);
}
