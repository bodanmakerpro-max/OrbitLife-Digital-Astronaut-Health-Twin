'use strict';
/* OrbitLife Developer Tools. Only the authenticated commander can modify settings or delete records. */
(()=>{
  const el=id=>document.getElementById(id);
  const val=id=>el(id)?.value;
  const escapeText=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let settings=null, lastStatus=null, loading=false;
  function applyStyle(config){
    if(!config)return;
    const root=document.documentElement;
    if(/^#[0-9a-fA-F]{6}$/.test(config.accent||'')){
      root.style.setProperty('--cyan',config.accent);
      root.style.setProperty('--ol-ring',config.accent+'25');
    }
    root.style.setProperty('--radius',Math.max(6,Math.min(26,Number(config.radius)||14))+'px');
    document.body.classList.toggle('ol-density-compact',config.density==='compact');
  }
  function message(text,error=false){const notice=el('devFeedback');notice.textContent=text;notice.classList.remove('hidden');notice.classList.toggle('error',error);}
  function allowed(){return !!state.me?.admin;}
  async function loadStyle(){
    try{const result=await api('/api/developer/public-style');applyStyle(result.settings);}catch(e){}
  }
  function setPortChoices(ports,active){
    const select=el('devPort');
    const options=['<option value="">Select USB port...</option>'];
    if(active&&!ports.some(p=>p.device===active))options.push(`<option value="${escapeText(active)}">${escapeText(active)} (not detected)</option>`);
    for(const p of ports)options.push(`<option value="${escapeText(p.device)}">${escapeText(p.device)} · ${escapeText(p.description)}</option>`);
    select.innerHTML=options.join('');select.value=active||'';
  }
  async function refreshStatus(repaint=false){
    if(!allowed()||loading)return;
    loading=true;
    try{
      const result=await api('/api/developer/status');
      lastStatus=result;
      const stat=el('devStatus');
      stat.classList.toggle('connected',result.connected);
      stat.textContent=(result.connected?'● Connected to ':'○ Disconnected · ')+(result.connected?result.port:result.message);
      el('devLastEvent').textContent=`Last event: ${result.last_event||'None'} · Events received: ${result.received} · ${result.last_seen||'No data yet'}`;
      if(repaint||!settings){
        settings=result.config;setPortChoices(result.available_ports,result.config.serial_port);
        el('devSerialEnabled').checked=result.config.serial_enabled;
        el('devDemoRfidElias').checked=result.config.demo_rfid_elias!==false;
        el('devAccent').value=result.config.accent;
        el('devRadius').value=result.config.radius;
        el('devRadiusValue').textContent=result.config.radius+' px';
        el('devDensity').value=result.config.density;
      }
    }catch(e){el('devStatus').textContent=e.message;}
    finally{loading=false;}
  }
  function fillCrew(){
    const select=el('devAstronaut');
    if(!select||!state.crew.length)return;
    const current=select.value;
    select.innerHTML=state.crew.map(c=>`<option value="${escapeText(c.astronaut_id)}">${escapeText(c.astronaut_id+' · '+c.name)}</option>`).join('');
    if(current)select.value=current;
  }
  async function loadRecords(){
    if(!allowed())return;
    const query=new URLSearchParams({astronaut_id:val('devAstronaut'),category:val('devCategory')});
    if(val('devDate'))query.set('date',val('devDate'));
    el('devRecords').textContent='Loading records…';
    try{
      const result=await api('/api/developer/records?'+query);
      if(!result.records.length){el('devRecords').textContent='No records found for this selection.';return;}
      el('devRecords').innerHTML=result.records.map(r=>`<div class="ol-dev-record-row"><div><b>Record #${r.id}</b><small>${escapeText(r.summary)||'No preview available'}</small></div><button type="button" data-dev-delete="${r.id}">Delete</button></div>`).join('');
    }catch(e){el('devRecords').textContent=e.message;}
  }
  async function saveSettings(changes){
    try{
      const result=await api('/api/developer/settings','POST',{settings:changes});
      settings=result.settings;
      applyStyle(result.settings);
      message('Settings saved.');
      await refreshStatus(true);
    }catch(e){message(e.message,true);}
  }
  function install(){
    const oldAuth=window.updateAuth;
    window.updateAuth=function(...args){const result=oldAuth(...args);el('devNav')?.classList.toggle('hidden',!allowed());if(!allowed()&&state.view==='developer')window.goto('crew');return result;};
    const oldGoto=window.goto;
    window.goto=function(view){if(view==='developer'&&!allowed()){message('Only the mission commander can open Developer Tools.',true);return;}const result=oldGoto(view);if(view==='developer'){fillCrew();refreshStatus(true);}return result;};
    el('devRefreshPorts').addEventListener('click',()=>refreshStatus(true));
    el('devOpenPair').addEventListener('click',()=>{window.goto('crew');el('terminalPairPanel').open=true;el('terminalPairPanel').scrollIntoView({behavior:'smooth'});});
    el('devRadius').addEventListener('input',()=>{el('devRadiusValue').textContent=val('devRadius')+' px';applyStyle({accent:val('devAccent'),radius:Number(val('devRadius')),density:val('devDensity')});});
    el('devAccent').addEventListener('input',()=>applyStyle({accent:val('devAccent'),radius:Number(val('devRadius')),density:val('devDensity')}));
    el('devDensity').addEventListener('change',()=>applyStyle({accent:val('devAccent'),radius:Number(val('devRadius')),density:val('devDensity')}));
    for(const swatch of document.querySelectorAll('[data-dev-swatch]'))swatch.addEventListener('click',()=>{el('devAccent').value=swatch.dataset.devSwatch;el('devAccent').dispatchEvent(new Event('input'));});
    el('devSerialForm').addEventListener('submit',e=>{e.preventDefault();saveSettings({serial_port:val('devPort'),serial_enabled:el('devSerialEnabled').checked,demo_rfid_elias:el('devDemoRfidElias').checked});});
    el('devStyleForm').addEventListener('submit',e=>{e.preventDefault();saveSettings({accent:val('devAccent'),radius:Number(val('devRadius')),density:val('devDensity')});});
    el('devResetStyle').addEventListener('click',()=>saveSettings({accent:'#20c6d8',radius:14,density:'comfortable'}));
    el('devFindRecords').addEventListener('click',loadRecords);
    document.querySelectorAll('[data-dev-test]').forEach(btn=>btn.addEventListener('click',async()=>{try{await api('/api/developer/test-event','POST',{event:btn.dataset.devTest});message('Test event sent to the current page.');}catch(err){message(err.message,true);}}));
    el('devRecords').addEventListener('click',async e=>{
      const btn=e.target.closest('[data-dev-delete]');if(!btn)return;
      const id=Number(btn.dataset.devDelete);
      const confirmText=window.prompt(`Delete record #${id}? A database backup will be saved first.\nType DELETE ${id} to confirm:`);
      if(confirmText!==`DELETE ${id}`)return;
      btn.disabled=true;
      try{
        const result=await api('/api/developer/delete','POST',{id,category:val('devCategory'),astronaut_id:val('devAstronaut'),confirmation:confirmText});
        message(`Deleted record #${id}. Backup: ${result.backup_saved}`);
        await loadRecords();
      }catch(err){message(err.message,true);btn.disabled=false;}
    });
    setInterval(()=>{if(state.view==='developer'&&allowed())refreshStatus(false);},1600);
    el('devNav')?.classList.toggle('hidden',!allowed());
    loadStyle();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
