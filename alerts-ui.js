 'use strict';
/* Emergency announcements, intentionally minimal for public/shared displays. */
(()=>{
 const $=id=>document.getElementById(id);
 const l={
  en:{heading:'Mission emergency announcements',active:'active reports',singular:'active report',report:'View crew emergency reports',no:'',await:'Crew login required for medical details',critical:'Critical',high:'High',moderate:'Moderate',low:'Low'},
  mk:{heading:'Итни известувања за мисијата',active:'активни пријави',singular:'активна пријава',report:'Преглед на итните пријави',no:'',await:'За медицинските детали е потребна најава',critical:'Критично',high:'Висока итност',moderate:'Умерена итност',low:'Ниска итност'},
  fr:{heading:'Alertes d’urgence de la mission',active:'signalements actifs',singular:'signalement actif',report:'Consulter les signalements',no:'',await:'Connexion requise pour les détails médicaux',critical:'Critique',high:'Élevée',moderate:'Modérée',low:'Faible'},
  ru:{heading:'Экстренные объявления миссии',active:'активных сообщений',singular:'активное сообщение',report:'Открыть сообщения экипажа',no:'',await:'Для медицинских сведений требуется вход',critical:'Критично',high:'Высокая',moderate:'Умеренная',low:'Низкая'}
 };
 let busy=false,lastData={count:0,alerts:[]};
 function lang(){try{return window.OrbitLifeI18n?.language() || state.me?.user?.language || 'en';}catch(e){return 'en';}}
 function make(tag,cls,content){const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el;}
 function render(){
  const t=l[lang()]||l.en;
  for(const id of ['olLaunchAlerts','olHomeAlerts']){
   const element=$(id);if(!element)continue;
   element.replaceChildren();element.classList.toggle('hidden',!lastData.count);
   if(!lastData.count)continue;
   element.append(make('div','ol-alerts-title',t.heading));
   const count=make('div','ol-alerts-count',lastData.count+' '+(lastData.count===1?t.singular:t.active));
   element.append(count);
   const items=make('div','ol-alerts-items');
   for(const alert of lastData.alerts.slice(0,5)){
    const line=make('div','ol-alerts-item');
    line.append(make('strong','',alert.astronaut_name));
    line.append(make('span','ol-alerts-urgency '+String(alert.urgency).toLowerCase(),t[alert.urgency]||alert.urgency));
    const time=Date.parse(alert.created_at);
    if(Number.isFinite(time))line.append(make('time','',(d=>[String(d.getDate()).padStart(2,'0'),String(d.getMonth()+1).padStart(2,'0'),d.getFullYear()].join('.')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'))(new Date(time))));
    items.append(line);
   }
   element.append(items);
   if(id==='olHomeAlerts'&&typeof state!=='undefined'&&state.me){
    const b=make('button','button warning',t.report);b.type='button';
    b.onclick=()=>document.getElementById('olActiveIncidents')?.scrollIntoView({behavior:'smooth',block:'center'});
    element.append(b);
   }else element.append(make('p','ol-alert-private-note',t.await));
  }
 }
 async function refresh(){if(busy)return;busy=true;try{
   const res=await fetch('/api/public-alerts',{credentials:'same-origin',cache:'no-store'});
   if(!res.ok)throw new Error('Cannot load emergency announcements');
   lastData=await res.json();render();
  }catch(err){console.warn('OrbitLife public alerts unavailable',err);}finally{busy=false;}}
 function init(){window.OrbitLifeAlertsRefresh=refresh;refresh();setInterval(()=>{if(document.visibilityState==='visible')refresh();},9000);
  window.addEventListener('orbitlife:locale-changed',render);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
