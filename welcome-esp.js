/* PulseDeck 19.1: USB setup before login, using the local Python bridge. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id);
  let busy=false,first=true,lastPort='';
  const message=(text,error=false)=>{
    const m=el('olEspMessage'); if(!m)return;
    m.textContent=text; m.classList.toggle('error',error);
  };
  async function getStatus(force=false){
    if(busy)return;
    try{
      const r=await fetch('/api/terminal/status',{cache:'no-store',credentials:'same-origin'});
      if(!r.ok)throw new Error('Could not read USB status.');
      const s=await r.json(),cfg=s.config||{};
      const pill=el('olEspStatus');
      pill.classList.toggle('ok',!!s.connected);
      pill.textContent=s.connected?'Connected · '+s.port:(cfg.serial_enabled?'Connecting / Offline':'Disconnected');
      if(force||first){
        el('olEspPortList').replaceChildren(...(s.available_ports||[]).map(p=>{
          const option=document.createElement('option'); option.value=p.device;option.label=p.description||p.device;return option;
        }));
        if(first || el('olEspPort').value===lastPort)el('olEspPort').value=cfg.serial_port||'';
        lastPort=cfg.serial_port||'';
        first=false;
      }
      el('olEspConnect').disabled=!!s.connected;
      el('olEspDisconnect').disabled=!cfg.serial_enabled;
      if(!s.pyserial_installed)message('pyserial is missing. Run: py -3.13 -m pip install -r requirements.txt',true);
      else if(cfg.serial_enabled&&!s.connected)message(s.message||'Trying to connect...');
      else if(s.connected)message('ESP32 connected. Scan your paired RFID card to log in.');
      else if(!busy)message('Choose a COM port and click Connect.');
    }catch(err){el('olEspStatus').textContent='Server unavailable';el('olEspStatus').classList.remove('ok');message(err.message,true);}
  }
  async function setConnection(enabled){
    if(busy)return;
    busy=true;
    const connect=el('olEspConnect'),disconnect=el('olEspDisconnect');
    connect.disabled=disconnect.disabled=true;
    try{
      const port=el('olEspPort').value.trim();
      if(enabled&&!port)throw new Error('Choose the ESP32 COM port first.');
      const r=await fetch('/api/terminal/connect',{
        method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',
        body:JSON.stringify({enabled,port})
      });
      const data=await r.json();
      if(!r.ok)throw new Error(data.error||'Could not change USB settings.');
      message(enabled?'Connection requested. The status will update automatically.':'USB disconnected.');
    }catch(err){message(err.message,true);}
    finally{busy=false;await getStatus(true);}
  }
  function setup(){
    if(!el('olEspForm'))return;
    el('olEspForm').addEventListener('submit',event=>{event.preventDefault();setConnection(true);});
    el('olEspDisconnect').addEventListener('click',()=>setConnection(false));
    el('olEspRefresh').addEventListener('click',()=>getStatus(true));
    getStatus(true);
    setInterval(()=>{if(!el('olLaunchScreen')?.classList.contains('hidden'))getStatus();},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
