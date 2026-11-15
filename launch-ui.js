'use strict';
/* OrbitLife 19: single touch + encoder menu shared by OLED and browser.
   Paired RFID cards authenticate through the server; older unpaired demo scans only select a profile. */
(()=>{
  const q=id=>document.getElementById(id);
  const options={
    home:['dashboard','food','login'],
    card:['emergency','food','daily','radiation','body','medications','records','assistant','dashboard','login']
  };
  let cardId='',currentIndex=0,wasLoggedIn=false,installed=false,lastClock='',lastLanguage='';
  let pendingTimeout=null;
  const launchVisible=()=>!q('olLaunchScreen').classList.contains('hidden');
  const tr=key=>window.OrbitLifeI18n?.translate?.(key)||key;
  const mode=()=>cardId?'card':'home';
  function greetingName(name){
    const language=window.OrbitLifeI18n?.language?.()||'en';
    const prefix={mk:'Здраво, ',en:'Welcome, ',fr:'Bonjour ',ru:'Привет, '}[language]||'Welcome, ';
    return prefix+name+'!';
  }
  function buttons(){return cardId?[...q('olLaunchCardActions').querySelectorAll('[data-launch-action]')]:[
    q('olLaunchDashboard'),q('olLaunchGuest'),q('olLaunchLogin')];}
  function sendControl(data){
    fetch('/api/terminal/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'same-origin'}).catch(()=>{});
  }
  function showHighlight(share=false){
    const list=buttons();
    if(!list.length)return;
    currentIndex=(currentIndex+list.length)%list.length;
    q('olLaunchScreen').querySelectorAll('.ol-launch-selected').forEach(el=>el.classList.remove('ol-launch-selected'));
    list[currentIndex]?.classList.add('ol-launch-selected');
    list[currentIndex]?.setAttribute('aria-current','true');
    list.forEach((el,i)=>{if(i!==currentIndex)el.removeAttribute('aria-current');});
    if(cardId)list[currentIndex]?.scrollIntoView({block:'nearest'});
    if(share)sendControl({type:'select',index:currentIndex});
  }
  function updateClock(){
    const now=new Date();
    q('olLaunchClock').textContent=now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    const lang=window.OrbitLifeI18n?.language?.()||'mk';
    const locale=({mk:'mk-MK',fr:'fr-FR',ru:'ru-RU',en:'en-GB'})[lang]||'mk-MK';
    if(lang==='mk'){
      const weekdays=['недела','понеделник','вторник','среда','четврток','петок','сабота'];
      const months=['јануари','февруари','март','април','мај','јуни','јули','август','септември','октомври','ноември','декември'];
      q('olLaunchDate').textContent=weekdays[now.getDay()]+', '+now.getDate()+' '+months[now.getMonth()]+' '+now.getFullYear()+' година';
    }else q('olLaunchDate').textContent=now.toLocaleDateString(locale,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    q('olLaunchZone').textContent=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
    const stamp=now.toTimeString().slice(0,5);
    if(lastClock!==stamp){lastClock=stamp;sendControl({type:'clock',value:stamp});}
    if(lastLanguage!==lang){lastLanguage=lang;sendControl({type:'language',value:lang});}
  }
  function syncScreen(screen){sendControl({type:'screen',mode:screen});if(screen!=='browse')sendControl({type:'select',index:currentIndex});updateClock();}
  function showGreeting(id){
    cardId=id||'AST-001';
    const astronaut=(typeof state!=='undefined'?state.crew:[])?.find(c=>c.astronaut_id===cardId);
    q('olLaunchName').textContent=astronaut?.name||'Astronaut';
    q('olLaunchRole').textContent=(astronaut?.role||tr('Commander'))+' · '+cardId;
    q('olLaunchPhoto').src=typeof portrait==='function'?portrait(cardId):'portraits/AST-001.webp';
    q('olLaunchWelcomeTitle').textContent=greetingName(astronaut?.name||'astronaut');
    q('olLaunchCardPanel').classList.add('visible');
    q('olLaunchStandardPanel').classList.add('hidden');
    currentIndex=0;showHighlight();syncScreen('card');
  }
  function resetGreeting(sync=true){
    cardId='';q('olLaunchCardPanel').classList.remove('visible');
    q('olLaunchStandardPanel').classList.remove('hidden');
    q('olLaunchWelcomeTitle').textContent=tr('Mission-ready interface');
    currentIndex=0;showHighlight();if(sync)syncScreen('home');
  }
  function show(){
    q('olLaunchScreen').classList.remove('hidden');document.body.classList.add('ol-launch-active');
    if(!cardId)resetGreeting(false);
    showHighlight();syncScreen(mode());
    syncReturn();
  }
  function dismiss(){
    q('olLaunchScreen').classList.add('hidden');document.body.classList.remove('ol-launch-active');
    cardId='';syncScreen('browse');syncReturn();
  }
  function syncReturn(){const el=q('olReturnMonitor');if(el)el.classList.toggle('hidden',launchVisible());}
  function openLogin(forBodan,after){
    const selectedCard=cardId;
    if(after)window.orbitAfterLogin={view:after,astronaut_id:selectedCard||state.me?.user?.astronaut_id||state.selectedLogin||'AST-001'};
    dismiss();
    if(forBodan && selectedCard && typeof selectLoginMember==='function')selectLoginMember(selectedCard);
    q('loginModal').classList.remove('hidden');q('loginPassword').focus();
  }
  function reportEmergency(){
    q('olEmergencyFab')?.click();
    const reportButton=q('olEmergencyReportChoice');
    if(reportButton)setTimeout(()=>reportButton.click(),80);
  }
  function launch(action){
    if(action==='back'){if(cardId)resetGreeting();else show();return;}
    if(action==='quickai'){
      window.OrbitLifeQuickAI?.open();return;
    }
    if(action==='food'||action==='dashboard'){
      dismiss();window.goto(action==='food'?'menu':'crew');return;
    }
    if(action==='login'){
      if(state.me){dismiss();window.goto('personal');return;}
      return openLogin(!!cardId,null);
    }
    if(action==='emergency' || ['personal','daily','wearables','radiation','cortisol','body','medications','nutrition','records','assistant','crewprofile','twin'].includes(action)){
      if(!state.me){openLogin(!!cardId,action);return;}
      if(cardId && state.me.user?.astronaut_id!==cardId){
        flash(tr('Sign out before entering another crew account.'),true);return;
      }
      dismiss();if(action==='emergency')reportEmergency();else window.goto(action);
      return;
    }
  }
  function onCardScan(id){
    // Only unpaired legacy demo selections reach this method; paired cards log in directly.
    const valid=(typeof state!=='undefined' && state.crew?.some?.(c=>c.astronaut_id===id));
    q('olLaunchScreen').classList.remove('hidden');document.body.classList.add('ol-launch-active');
    showGreeting(valid?id:'AST-001');syncReturn();
    return true;
  }
  function rotate(delta){
    if(!launchVisible())return false;
    const list=buttons();if(!list.length)return true;
    currentIndex=(currentIndex+(delta<0?-1:1)+list.length)%list.length;
    showHighlight();return true;
  }
  function press(){
    if(!launchVisible())return false;
    buttons()[currentIndex]?.click();return true;
  }
  function back(){
    if(!launchVisible()){show();return true;}
    if(cardId){resetGreeting();return true;}
    return true;
  }
  function perform(action){
    if(launchVisible()){
      const ix=options[mode()].indexOf(action);
      if(ix>=0){currentIndex=ix;showHighlight();}
      launch(action);return true;
    }
    if(action==='back'){show();return true;}
    if(action==='quickai'){window.OrbitLifeQuickAI?.open();return true;}
    if(action==='dashboard'||action==='food'){window.goto(action==='food'?'menu':'crew');return true;}
    if(action==='login'){q('loginModal').classList.remove('hidden');return true;}
    if(action==='emergency' && state.me){reportEmergency();return true;}
    if(state.me && ['personal','daily','wearables','radiation','cortisol','body','medications','nutrition','records','assistant','crewprofile','twin'].includes(action)){window.goto(action);return true;}
    return false;
  }
  function setup(){
    if(installed)return;installed=true;
    q('olLaunchScreen').addEventListener('click',event=>{
      const btn=event.target.closest('[data-launch-action]');if(!btn)return;
      const index=buttons().indexOf(btn);if(index>=0){currentIndex=index;showHighlight(true);}
      launch(btn.dataset.launchAction);
    });
    q('olReturnMonitor')?.addEventListener('click',show);
    q('olSidebarWelcome')?.addEventListener('click',show);
    // Touch updates selected item on the small OLED as well.
    q('olLaunchScreen').addEventListener('pointerdown',event=>{
      const b=event.target.closest('[data-launch-action]'),n=buttons().indexOf(b);
      if(n>=0){currentIndex=n;showHighlight(true);}
    });
    const oldAuth=window.updateAuth;
    window.updateAuth=function(...args){const result=oldAuth(...args);
      const logged=!!state.me;
      if(logged)dismiss();else if(wasLoggedIn){resetGreeting(false);show();}
      wasLoggedIn=logged;syncReturn();return result;};
    const oldGoto=window.goto;
    window.goto=function(view){const result=oldGoto(view);syncReturn();return result;};
    document.addEventListener('keydown',event=>{
      if(!launchVisible() || ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
      if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){
        event.preventDefault();rotate(['ArrowLeft','ArrowUp'].includes(event.key)?-1:1);sendControl({type:'select',index:currentIndex});
      }else if(event.key==='Enter' && document.activeElement?.tagName!=='BUTTON'){
        event.preventDefault();press();
      }else if(event.key==='Escape'){event.preventDefault();back();}
    });
    window.OrbitLifeLaunch={onCardScan,rotate,press,back,show,isVisible:launchVisible,perform};
    wasLoggedIn=!!state.me;
    if(state.me)dismiss();else show();
    updateClock();setInterval(updateClock,1000);
    window.addEventListener('orbitlife:locale-changed',()=>{lastLanguage='';updateClock();if(cardId)q('olLaunchWelcomeTitle').textContent=greetingName(q('olLaunchName')?.textContent||'astronaut');});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
