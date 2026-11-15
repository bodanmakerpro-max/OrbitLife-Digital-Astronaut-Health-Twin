/* PulseDeck ESP32 kiosk events; touchscreen stays fully usable. */
(() => {
  'use strict';
  let lastEvent = 0;
  let selectedByCard = '';
  let currentFocus = null;
  let isEditing = false;
  let refreshingPair = false;
  let polling=false, rfIdLoginBusy=false;
  const $id = id => document.getElementById(id);
  const isVisible = el => !!el && !el.disabled && el.getClientRects().length > 0 &&
    !el.closest('.hidden,[aria-hidden="true"]');
  const interactiveSelector = 'button,input:not([type=hidden]),select,textarea,a[href],[data-inspect-astro]';
  function focusables() {
    const modal = !$id('loginModal').classList.contains('hidden') ? $id('loginModal') :
      (!$id('crewInspectModal').classList.contains('hidden') ? $id('crewInspectModal') : document.querySelector('.view.active'));
    return Array.from(modal?.querySelectorAll(interactiveSelector) || []).filter(el => isVisible(el));
  }
  function focusElement(el) {
    if (currentFocus) currentFocus.classList.remove('terminal-focused');
    currentFocus = el;
    if (el) {
      el.classList.add('terminal-focused');
      el.focus({preventScroll: true});
      el.scrollIntoView({block:'nearest',behavior:'smooth'});
    }
  }
  function resetFocus() {isEditing = false; focusElement(null);}
  function rotate(delta) {
    if (window.OrbitLifeLaunch?.rotate?.(delta)) return;
    if (!state.me && !['crew','menu'].includes(state.view)) return;
    const all=focusables();
    if (!all.length) return;
    let el=currentFocus;
    if(isEditing && el && isVisible(el)) {
      const tag=el.tagName;
      if (tag==='SELECT') {
        const idx=Math.min(el.options.length-1,Math.max(0,el.selectedIndex+delta));
        el.selectedIndex=idx;el.dispatchEvent(new Event('change',{bubbles:true}));return;
      }
      if(tag==='INPUT' && ['number','range'].includes(el.type)) {
        const min=el.min!==''?Number(el.min):0, max=el.max!==''?Number(el.max):100;
        const step=el.step && el.step!=='any'?Number(el.step):1;
        const current=el.value===''?min:Number(el.value);
        const dp=(String(step).split('.')[1]||'').length;
        const next=Math.min(max,Math.max(min,current+delta*step));
        el.value=next.toFixed(Math.min(5,dp));
        el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return;
      }
    }
    const idx=all.indexOf(el);
    focusElement(all[(idx+delta+all.length)%all.length]);
  }
  function press() {
    if (window.OrbitLifeLaunch?.press?.()) return;
    if (!state.me && !['crew','menu'].includes(state.view)) return;
    const all=focusables();
    if(!currentFocus || !isVisible(currentFocus)) {focusElement(all[0]);return;}
    const el=currentFocus;
    if(el.matches('select,input[type=number],input[type=range]')) {isEditing=!isEditing;return;}
    if(el.matches('input[type=text],input[type=date],input[type=datetime-local],input[type=password],textarea')) {
      isEditing=false;el.focus();flash('Type using the touchscreen keyboard. Rotate to move to the next field.');return;
    }
    if(el.matches('input[type=checkbox],input[type=radio],button,a[href]')) {el.click();resetFocus();return;}
    if(el.hasAttribute('data-inspect-astro')) {el.click();resetFocus();return;}
    if(el.closest('form')) {el.focus();return;}
  }
  function openLoginFor(astronaut_id) {
    if (window.OrbitLifeLaunch?.onCardScan?.(astronaut_id)) return;
    selectedByCard=astronaut_id;
    const member=state.crew.find(c => c.astronaut_id===astronaut_id);
    if(!member) return;
    if(state.me?.user?.astronaut_id===astronaut_id) {
      flash('RFID verified for '+member.name+'. Use the encoder to navigate.');
    } else {
      selectLoginMember(astronaut_id);
      $id('loginModal').classList.remove('hidden');
      $id('loginPassword').focus();
      flash('RFID: '+member.name+'. Enter your password to access health records.');
    }
  }
  async function signInWithCard(event){
    if(rfIdLoginBusy)return;
    rfIdLoginBusy=true;
    const notice=$id('olLoginRFIDStatus');
    if(notice)notice.textContent='RFID detected. Signing in...';
    try{
      const result=await api('/api/terminal/rfid-login','POST',{event_id:event.id});
      await window.orbitCompleteLogin(result,'rfid');
      if(notice)notice.textContent='RFID sign-in successful.';
      resetFocus();
    }catch(err){
      if(notice)notice.textContent='RFID login failed: '+err.message;
      flash('RFID: '+err.message,true);
    }finally{rfIdLoginBusy=false;}
  }
  function action(event) {
    switch(event.type) {
      case 'card':if(event.auto_login)signInWithCard(event);else openLoginFor(event.astronaut_id);break;
      case 'action':window.OrbitLifeLaunch?.perform?.(event.action);resetFocus();break;
      case 'unknown-card':flash('Unpaired RFID card. Sign in as commander to pair it.',true);break;
      case 'navigate':
        if(!state.me || (event.astronaut_id && event.astronaut_id!==state.me.user.astronaut_id && !state.me.admin)) {
          if(event.astronaut_id)openLoginFor(event.astronaut_id);
          else $id('loginModal').classList.remove('hidden');
          return;
        }
        if(event.view==='crew')goto('crew');
        else goto(event.view);
        resetFocus();break;
      case 'rotate':rotate(event.delta);break;
      case 'press':press();break;
      case 'logout':
        if(state.me) $id('logoutBtn').click();
        resetFocus();break;
      case 'back':
        if(window.OrbitLifeLaunch?.back?.()) return;
        if(isEditing){isEditing=false;return;}
        if(!$id('crewInspectModal').classList.contains('hidden'))hideCrewInspect();
        else if(!$id('loginModal').classList.contains('hidden'))$id('loginModal').classList.add('hidden');
        else goto('crew');resetFocus();break;
    }
    const tag=$id('terminalConnection');
    tag.classList.remove('hidden');
    tag.textContent='ESP32 terminal · '+event.type.replace('-',' ');
  }
  async function poll() {
    if(polling || !state.crew?.length)return;
    polling=true;
    try {
      const response=await fetch('/api/terminal/events?after='+lastEvent,{cache:'no-store'});
      if(response.ok) {
        const data=await response.json();
        for (const event of data.events || []) {
          lastEvent=Math.max(lastEvent,event.id);
          action(event);
        }
      }
    } catch(e) { /* main app already reports server errors */ }
    finally{polling=false;}
    const panel=$id('terminalPairPanel');
    if(panel && state.me?.admin) {
      panel.classList.remove('hidden');
      if(!panel.dataset.members) {
        $id('terminalPairAstronaut').innerHTML=state.crew.map(c =>
          '<option value="'+c.astronaut_id+'">'+c.astronaut_id+' · '+c.name.replaceAll('<','&lt;')+'</option>').join('');
        panel.dataset.members='1';
      }
    } else if(panel) panel.classList.add('hidden');
  }
  async function getLastCard() {
    if(refreshingPair)return;
    refreshingPair=true;
    try {
      const data=await api('/api/terminal/last-card');
      $id('terminalPairStatus').textContent=data.uid
        ? 'Scanned: '+data.uid+(data.paired_to?' · Paired to '+data.paired_to:' · Not paired')
        : 'No recent card scan';
    }catch(e){flash(e.message,true);}finally{refreshingPair=false;}
  }
  function setup() {
    const refresh=$id('terminalPairRefresh'),pair=$id('terminalPairSave');
    if(refresh)refresh.addEventListener('click',getLastCard);
    if(pair)pair.addEventListener('click',async()=>{
      try {
        const id=$id('terminalPairAstronaut').value;
        await api('/api/terminal/pair','POST',{astronaut_id:id});
        flash('RFID card paired to '+id+'. Scan it again to log in automatically.');
        await getLastCard();
      }catch(e){flash(e.message,true);}
    });
    // The touchscreen and encoder share whichever field the astronaut last touched.
    document.addEventListener('focusin', (event) => {
      const el=event.target;
      if(!el?.matches?.(interactiveSelector) || !isVisible(el))return;
      if(currentFocus && currentFocus!==el)currentFocus.classList.remove('terminal-focused');
      currentFocus=el;
      isEditing=(el.tagName==='SELECT' || (el.tagName==='INPUT' && el.type==='range'));
    });
    setInterval(poll,650);poll();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);
  else setup();
})();
