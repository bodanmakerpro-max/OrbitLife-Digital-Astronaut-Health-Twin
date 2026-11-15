'use strict';
/* OrbitLife 11: mission-focused quick navigation, accessible crew-wide AI, efficient entry. */
(() => {
  const $=id=>document.getElementById(id);
  const icons={
    crew:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="10" r="2"/><path d="M5.5 16c.5-2 4.5-2 5 0M14 9h5M14 13h5M14 17h4"/>',
    personal:'<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    daily:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>',
    wearables:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="m9 2 1 5m5-5-1 5m-4 10-1 5m5-5 1 5"/>',
    radiation:'<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="9"/><path d="M12 10V5m1.8 8.2 4 2.4m-7.6-2.4-4 2.4"/>',
    cortisol:'<path d="M12 2c-5 6-8 10-8 14a8 8 0 0 0 16 0c0-4-3-8-8-14Z"/><path d="M10 17c.7.7 2 .7 3 0"/>',
    body:'<circle cx="12" cy="5" r="3"/><path d="M5 21v-8l3-3h8l3 3v8M9 21v-6m6 6v-6"/>',
    medications:'<path d="m9 4 11 11a4 4 0 0 1-6 6L3 10a4 4 0 0 1 6-6Z"/><path d="m8 15 7-7"/>',
    menu:'<path d="M4 3v8m4-8v8M4 7h4M6 11v10M17 3v18"/>',
    records:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',
    nutrition:'<path d="M5 3v8m4-8v8M5 7h4M7 11v10M17 3c-3 3-4 7-1 10h2v8"/>',
    emergency:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 4h.01"/>',
    assistant:'<path d="M12 3 9.6 9.6 3 12l6.6 2.4L12 21l2.4-6.6L21 12l-6.6-2.4L12 3Z"/>',
    crewprofile:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2.2 2.2m9.6 9.6L19 19M19 5l-2.2 2.2m-9.6 9.6L5 19"/>',
    search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>'
  };
  const svg=k=>`<svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${icons[k]||icons.assistant}</svg>`;
  const languages={
    en:{daily:'Daily check-in',collapse:'Collapse menu',expand:'Expand menu',quick:'Quick AI',report:'Report emergency',check:'Daily check-in',radiation:'Radiation',symptom:'Report symptom',nutrition:'Nutrition',meds:'Medications',search:'Find a page',details:'More measurements',hide:'Fewer measurements',prefill:'Use latest wearable',empty:'No recorded readings to prefill.',synthetic:'These are simulated wearable values. Review before saving.',imported:'Imported wearable values are not automatically verified.',ready:'Values added. Review them and press Save when ready.',incident:'Incidents',emerg:'Emergency',filter:'Search commands',ask:'Ask me something'},
    mk:{daily:'Дневна проверка',collapse:'Собери мени',expand:'Прошири мени',quick:'Брз AI',report:'Пријави итен случај',check:'Дневна проверка',radiation:'Зрачење',symptom:'Пријави симптом',nutrition:'Исхрана',meds:'Лекови',search:'Најди страница',details:'Повеќе мерења',hide:'Помалку мерења',prefill:'Внеси од часовник',empty:'Нема мерења за внесување.',synthetic:'Ова се симулирани податоци. Провери ги пред зачувување.',imported:'Увезените мерења не се автоматски проверени.',ready:'Провери ги внесените податоци и зачувај.',incident:'Инциденти',emerg:'Итно',filter:'Пребарај наредби',ask:'Прашај ме нешто'},
    fr:{daily:'Bilan quotidien',collapse:'Réduire le menu',expand:'Développer le menu',quick:'IA rapide',report:'Signaler une urgence',check:'Bilan quotidien',radiation:'Radiations',symptom:'Signaler un symptôme',nutrition:'Nutrition',meds:'Médicaments',search:'Trouver une page',details:'Plus de mesures',hide:'Moins de mesures',prefill:'Charger la montre',empty:'Aucune donnée à renseigner.',synthetic:'Ces valeurs sont simulées. Vérifiez-les avant de sauvegarder.',imported:'Les valeurs importées ne sont pas vérifiées automatiquement.',ready:'Vérifiez les données, puis enregistrez.',incident:'Incidents',emerg:'Urgence',filter:'Rechercher',ask:'Demande-moi quelque chose'},
    ru:{daily:'Ежедневная проверка',collapse:'Свернуть меню',expand:'Развернуть меню',quick:'Быстрый ИИ',report:'Сообщить о ЧП',check:'Ежедневная проверка',radiation:'Радиация',symptom:'Сообщить о симптоме',nutrition:'Питание',meds:'Лекарства',search:'Найти страницу',details:'Больше измерений',hide:'Меньше измерений',prefill:'Взять данные с часов',empty:'Нет данных для заполнения.',synthetic:'Это симулированные данные. Проверьте их перед сохранением.',imported:'Импортированные данные не проверены автоматически.',ready:'Проверьте значения и сохраните.',incident:'Происшествия',emerg:'Экстренно',filter:'Поиск команд',ask:'Спроси меня что-нибудь'}
  };
  const locale=()=>languages[state.me?.user?.language]?state.me.user.language:'en';
  const l=k=>languages[locale()][k]||languages.en[k]||k;
  const currentTheme=()=>state.me?.user?.theme||'system';
  let compact=false, commandOpen=false, selectedCommand=0;
  let busy=false;
  const navCommands=[
    {view:'crew',name:'Home / crew',key:'crew'}, {view:'menu',name:'Today’s food',key:'menu'}, {view:'records',name:'Records search',key:'records'}, {view:'personal',name:'My dashboard',key:'personal'},
    {view:'daily',name:'Daily check-in',key:'daily'},{view:'wearables',name:'Wearable health',key:'wearables'},
    {view:'radiation',name:'Radiation exposure',key:'radiation'},{view:'cortisol',name:'Cortisol',key:'cortisol'},
    {view:'body',name:'Symptoms & body map',key:'body'}, {view:'medications',name:'Medications',key:'medications'},
    {view:'nutrition',name:'Meals & nutrition',key:'nutrition'}, {view:'assistant',name:'AI health assistant',key:'assistant'},
    {view:'crewprofile',name:'My crew profile',key:'crewprofile'}, {view:'settings',name:'Settings',key:'settings'}
  ];
  function setupNav(){
    document.querySelectorAll('nav .navitem').forEach(btn=>{
      const key=btn.dataset.view|| (btn.id==='olNavQuickAI'?'assistant':'crew');
      const node=btn.querySelector('b');
      if(node){node.innerHTML=svg(key);node.classList.add('ol-nav-icon');}
      const label=document.createElement('span');label.className='ol-nav-label';
      [...btn.childNodes].filter(n=>n!==node).forEach(n=>label.append(n));
      btn.append(label);btn.title=label.textContent.trim();
      if(!btn.getAttribute('aria-label'))btn.setAttribute('aria-label',btn.title);
    });
    document.querySelectorAll('#navigation details.nav-group').forEach(el=>el.open=false);
    $('olNavQuickAI')?.addEventListener('click',showAi);
    const toggle=$('olSidebarToggle');
    const cacheKey='orbitlife:sidebar-compact';
    try{compact=localStorage.getItem(cacheKey)==='true';}catch(_){}
    const apply=()=>{
      document.querySelector('.app')?.classList.toggle('ol-sidebar-compact',compact);
      document.querySelectorAll('#navigation details.nav-group').forEach(el=>{if(compact){if(!('wasOpen' in el.dataset))el.dataset.wasOpen=String(el.open);el.open=true;}else if('wasOpen' in el.dataset){el.open=el.dataset.wasOpen==='true';delete el.dataset.wasOpen;}});
      toggle.setAttribute('aria-pressed',String(compact));toggle.setAttribute('aria-label',l(compact?'expand':'collapse'));
      toggle.setAttribute('title',l(compact?'expand':'collapse'));
      toggle.querySelector('.ol-toggle-label').textContent=l(compact?'expand':'collapse');
      const indicator=toggle.querySelector('.ol-toggle-icon');if(indicator)indicator.textContent=compact?'→':'←';
    };
    toggle.addEventListener('click',()=>{compact=!compact;try{localStorage.setItem(cacheKey,String(compact));}catch(_){}apply();});
    apply();
  }
  function updateAuthUI(){
    const signed=!!state.me;
    const onHome=!state.view||state.view==='crew';
    $('olQuickAiFab').classList.remove('hidden');
    $('olHeaderAI').classList.toggle('hidden',!signed);
    $('olCrewCommandBar').classList.toggle('hidden',!signed);

    const toggle=$('olSidebarToggle');
    if(toggle){toggle.querySelector('.ol-toggle-label').textContent=l(compact?'expand':'collapse');toggle.title=l(compact?'expand':'collapse');}
    const s=$('olCommandSearch');if(s)s.placeholder=l('filter');
  }
  function createCommandBar(){
    const slot=$('olCrewCommandBar');
    const options=[['daily','daily'],['body','symptom'],['radiation','radiation'],['nutrition','nutrition'],['medications','meds']];
    slot.innerHTML=`<div class="ol-command-bar"><div class="ol-command-label"><span class="ol-command-pulse"></span><span class="ol-command-name">MISSION SHORTCUTS</span></div><div class="ol-command-actions">${options.map(([view,key])=>`<button type="button" class="ol-command-tile" data-ol-go="${view}">${svg(view)}<span data-cmd-key="${key}">${l(key)}</span></button>`).join('')}<button type="button" class="ol-command-tile ol-command-find" id="olFindMenu">${svg('search')}<span data-cmd-key="search">${l('search')}</span><kbd>Ctrl K</kbd></button></div></div>`;
    slot.querySelectorAll('[data-ol-go]').forEach(el=>el.addEventListener('click',()=>goto(el.dataset.olGo)));
    slot.querySelector('#olFindMenu').addEventListener('click',openCommandPalette);
    slot.classList.toggle('hidden',!state.me);
  }
  function translateCommandBar(){document.querySelectorAll('[data-cmd-key]').forEach(el=>{el.textContent=l(el.dataset.cmdKey);});}
  function createCommandPalette(){
    const dialog=document.createElement('div');dialog.id='olCommandPalette';dialog.className='ol-command-overlay hidden';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Find an OrbitLife page');
    dialog.innerHTML=`<div class="ol-command-dialog"><label>${svg('search')}<input id="olCommandSearch" type="search" autocomplete="off" placeholder="Search pages or actions" aria-label="Search pages and actions"></label><div id="olCommandItems" role="listbox" aria-label="Pages"></div><footer><span>↑ ↓ Navigate</span><span>Enter Open</span><span>Esc Close</span></footer></div>`;
    document.body.append(dialog);
    $('olCommandSearch').addEventListener('input',()=>{selectedCommand=0;renderCommands();});
    dialog.addEventListener('click',e=>{if(e.target===dialog)closeCommandPalette();});
    $('olCommandItems').addEventListener('click',e=>{const b=e.target.closest('button[data-view]');if(b){closeCommandPalette();goto(b.dataset.view);}});
  }
  function renderCommands(){
    const term=$('olCommandSearch').value.trim().toLowerCase();
    const displayName=c=>document.querySelector(`#navigation [data-view="${c.view}"] .ol-nav-label`)?.textContent?.trim()||c.name;
    const options=navCommands.filter(c=>!term||c.name.toLowerCase().includes(term)||c.view.includes(term)||displayName(c).toLowerCase().includes(term));
    const list=$('olCommandItems');
    list.innerHTML=options.map((c,i)=>`<button type="button" data-view="${c.view}" role="option" aria-selected="${i===selectedCommand}" class="${i===selectedCommand?'selected':''}">${svg(c.key)}<span>${displayName(c)}</span><span class="ol-command-enter">↵</span></button>`).join('')||'<p>No matching pages</p>';
  }
  function openCommandPalette(){if(!state.me)return;commandOpen=true;selectedCommand=0;$('olCommandPalette').classList.remove('hidden');$('olCommandSearch').value='';$('olCommandSearch').placeholder=l('filter');renderCommands();$('olCommandSearch').focus();}
  function closeCommandPalette(){commandOpen=false;$('olCommandPalette').classList.add('hidden');}
  function showAi(){
    $('olQuickAiOverlay').classList.remove('hidden');
    $('olQuickAiQuestion').focus();
  }
  function hideAi(){$('olQuickAiOverlay').classList.add('hidden');}
  // Shared public Quick AI can be opened from Welcome and the home shortcuts.
  window.OrbitLifeQuickAI={open:showAi,close:hideAi};
  function appendChat(text,who){const container=$('olQuickAiThread'),row=document.createElement('div');row.className='ol-quickai-response '+(who==='user'?'from-user':'');row.textContent=text;container.append(row);container.scrollTop=container.scrollHeight;}
  async function askQuickAi(e){e.preventDefault();if(busy)return;
    const field=$('olQuickAiQuestion'),question=field.value.trim();if(!question)return;
    appendChat(question,'user');field.value='';busy=true;$('olQuickAiSubmit').disabled=true;
    const mode=$('olQuickAiMode').value;
    try{const res=await api('/api/quick-ai','POST',{question,mode,language:window.OrbitLifeI18n?.language()||'en'});appendChat(res.answer,'bot');}
    catch(err){appendChat('Could not answer: '+err.message,'bot');}
    finally{busy=false;$('olQuickAiSubmit').disabled=false;field.focus();}
  }
  function initAI(){
    $('olQuickAiFab').addEventListener('click',showAi);$('olHeaderAI').addEventListener('click',showAi);
    $('olQuickAiClose').addEventListener('click',hideAi);$('olQuickAiOverlay').addEventListener('click',e=>{if(e.target===$('olQuickAiOverlay'))hideAi();});
    $('olQuickAiForm').addEventListener('submit',askQuickAi);
    $('olQuickAiQuestion').addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();$('olQuickAiForm').requestSubmit();}});
  }
  function dailyOptimizations(){
    const form=$('dailyForm');if(!form)return;
    ['systolic','diastolic','temperature_c','glucose_mgdl','glucose_context','mass_method','notes'].forEach(name=>form.querySelector(`[name="${name}"]`)?.closest('label')?.classList.add('ol-optional'));
    const controls=document.createElement('div');controls.className='ol-daily-control wide';
    controls.innerHTML=`<button type="button" class="button secondary" id="olToggleOptionalDaily" aria-expanded="false">＋ <span>${l('details')}</span></button><button type="button" class="button secondary" id="olPrefillWearable">${svg('wearables')} <span>${l('prefill')}</span></button><p id="olPrefillNote" class="ol-prefill-note" aria-live="polite"></p>`;
    form.prepend(controls);
    $('olToggleOptionalDaily').addEventListener('click',()=>{const show=form.classList.toggle('ol-show-details');$('olToggleOptionalDaily').setAttribute('aria-expanded',String(show));$('olToggleOptionalDaily').querySelector('span').textContent=l(show?'hide':'details');});
    $('olPrefillWearable').addEventListener('click',()=>{
      const v=state.profile?.wearable?.latest;
      if(!v){$('olPrefillNote').textContent=l('empty');return;}
      const source=v.source==='synthetic'?l('synthetic'):l('imported');
      const map={sleep:v.sleep_hours,hr:v.resting_hr,spo2:v.spo2,exercise:v.active_minutes};
      let added=0;for(const [key,val] of Object.entries(map)){
        const input=form.querySelector(`[name="${key}"]`);if(input&&input.value===''&&val!==null&&val!==undefined){input.value=val;input.dispatchEvent(new Event('input',{bubbles:true}));added++;}}
      $('olPrefillNote').textContent=source+' '+(added?l('ready'):l('empty'));
    });
  }
  function activeStatus(){
    updateAuthUI();translateCommandBar();
    const button=$('olQuickAiFab');if(button)button.querySelector('span').textContent=l('ask');
    const header=$('olHeaderAI');if(header)header.querySelector('span').textContent=l('quick');
    const toggle=$('olToggleOptionalDaily');if(toggle)toggle.querySelector('span').textContent=l($('dailyForm')?.classList.contains('ol-show-details')?'hide':'details');
    const w=$('olPrefillWearable');if(w)w.querySelector('span').textContent=l('prefill');
  }
  function init(){
    setupNav();createCommandBar();createCommandPalette();initAI();dailyOptimizations();
    const prior=updateAuth;updateAuth=function(...args){const x=prior(...args);activeStatus();return x;};
    const priorGo=goto;goto=function(view){const r=priorGo(view);if(view==='crew'&&state.me){window.OrbitLifeEmergency?.refresh().catch(()=>{});}return r;};
    document.addEventListener('keydown',e=>{
      const isTyping=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        if(!state.me)return;e.preventDefault();commandOpen?closeCommandPalette():openCommandPalette();return;
      }
      if(e.key==='Escape'){
        if(commandOpen){e.preventDefault();closeCommandPalette();}
        else if(!$('olQuickAiOverlay').classList.contains('hidden')){e.preventDefault();hideAi();}
      }
      if(commandOpen&&e.key==='ArrowDown'){e.preventDefault();const n=$('olCommandItems').querySelectorAll('button');selectedCommand=Math.min(selectedCommand+1,n.length-1);renderCommands();}
      if(commandOpen&&e.key==='ArrowUp'){e.preventDefault();selectedCommand=Math.max(0,selectedCommand-1);renderCommands();}
      if(commandOpen&&e.key==='Enter'&&!isTyping){e.preventDefault();$('olCommandItems').querySelector('button.selected')?.click();}
      if(commandOpen&&e.key==='Enter'&&document.activeElement?.id==='olCommandSearch'){
        e.preventDefault();$('olCommandItems').querySelector('button.selected')?.click();
      }
    });
    window.addEventListener('orbitlife:incidents',e=>{
      const count=e.detail?.incidents?.filter(i=>i.status==='active').length||0;
      const board=$('olActiveIncidents');if(board){board.dataset.hasIncidents=String(count>0);}
    });
    activeStatus();
  }
  document.addEventListener('DOMContentLoaded',init,{once:true});
})();
