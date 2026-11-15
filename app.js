'use strict';
const state={me:null,crew:[],profile:null,view:'crew',target:null,side:'front',region:'',apiReady:false,selectedLogin:'AST-001',crewInspect:null,crewFilter:'all',crewSearch:''};
function portrait(id){return /^AST-0(?:0[1-9]|10)$/.test(id||'')?'portraits/'+id+'.webp':'portraits/AST-001.webp';}
function selectLoginMember(id){const c=state.crew.find(x=>x.astronaut_id===id);if(!c)return;state.selectedLogin=id;const i=state.crew.findIndex(x=>x.astronaut_id===id);$('loginUsername').value='astro'+String(i+1).padStart(2,'0');$('loginSelectedPhoto').src=portrait(id);$('loginSelectedName').textContent=c.name;$('loginSelectedRole').textContent=c.role+' · '+id;document.querySelectorAll('.login-member').forEach(el=>{const active=el.dataset.astro===id;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});if($('loginUsername').dataset.lastSelected!==id){$('loginPassword').value='';$('loginUsername').dataset.lastSelected=id;}}
function renderLoginCrew(){if(!state.crew.length)return;$('loginCrewGrid').innerHTML=state.crew.map(c=>`<button type="button" class="login-member" data-astro="${esc(c.astronaut_id)}" aria-label="Sign in as ${esc(c.name)}" aria-pressed="false"><img src="${portrait(c.astronaut_id)}" alt="" loading="lazy"><small>${esc(c.name.split(' ')[0])}</small></button>`).join('');selectLoginMember(state.selectedLogin||'AST-001');$('heroFaces').innerHTML=state.crew.slice(0,6).map(c=>`<img src="${portrait(c.astronaut_id)}" alt="" loading="lazy">`).join('');}

const $=id=>document.getElementById(id);
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>v===null||v===undefined||v===''?'—':esc(v);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const niceDate=date=>date?new Date(date+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}):'No entry';
const has=arr=>Array.isArray(arr)&&arr.length>0;
const formObj=f=>Object.fromEntries(new FormData(f).entries());
async function api(path,method='GET',data){const opts={method,headers:{}};if(data){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(data);}let response;try{response=await fetch(path,opts)}catch(e){throw new Error('Cannot reach the local PulseDeck server. Keep the Python window open.')}const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Request failed.');return payload;}
let messageTimer;
function flash(msg,error=false){const n=$('message');n.textContent=msg;n.className='notice'+(error?' error':'');clearTimeout(messageTimer);messageTimer=setTimeout(()=>n.classList.add('hidden'),6500);}
function goto(view){if(!['crew','menu'].includes(view)&&!state.me){$('loginModal').classList.remove('hidden');return;}state.view=view;if(window.innerWidth<=850){document.querySelector('.sidebar').classList.remove('mobile-menu-open');$('mobileMenuToggle').setAttribute('aria-expanded','false');}document.querySelectorAll('.view').forEach(e=>e.classList.toggle('active',e.id==='view-'+view));document.querySelectorAll('.navitem').forEach(e=>e.classList.toggle('active',e.dataset.view===view));$('crumb').textContent=({crewprofile:'CREW PROFILE',wearables:'WEARABLE HEALTH'})[view]||view.replaceAll('-',' ').toUpperCase();if(view==='body')drawBody();if(view==='personal')renderPersonal();if(view==='radiation')renderRadiation();if(view==='wearables')renderWearables();if(view==='crewprofile')renderCrewBio();const active=document.querySelector('.navitem.active');if(active?.closest('details'))active.closest('details').open=true;window.scrollTo({top:0,behavior:'smooth'});}
function updateAuth(){const logged=!!state.me;document.body.classList.toggle('logged-out',!logged);document.body.classList.toggle('logged-in',logged);$('publicBrand').classList.toggle('hidden',logged);$('publicNav').classList.toggle('hidden',logged);$('appBreadcrumb').classList.toggle('hidden',!logged);$('headerPortrait').classList.toggle('hidden',!logged);if(logged){$('headerPortrait').src=portrait(state.me.user.astronaut_id);$('headerPortrait').alt='Portrait of '+state.me.user.name;}$('loginBtn').classList.toggle('hidden',logged);$('logoutBtn').classList.toggle('hidden',!logged);$('loginStatus').textContent=logged?state.me.user.name:'EXPEDITION 01';document.querySelectorAll('.navitem.private').forEach(e=>{e.title=logged?'':'Log in to access private records';e.style.opacity=logged?'1':'.58';});$('adminSelectWrap').classList.toggle('hidden',!state.me?.admin);$('quickActions').classList.toggle('hidden',!logged);$('aiSidebar').textContent=state.apiReady?'CONNECTED AI AVAILABLE':'OFFLINE ASSISTANT AVAILABLE';}
function renderCrew(){let green=0, amber=0, red=0;state.crew.forEach(c=>{if(c.level==='green')green++;if(c.level==='amber')amber++;if(c.level==='red')red++;});$('summaryRow').innerHTML=[[state.crew.length,'Crew members','CYAN'],[green,'On track','GREEN'],[amber,'Review suggested','AMBER'],[red,'Urgent flags','RED']].map(([v,k])=>`<div class="summary-card"><small>${k}</small><strong>${v}</strong><span class="eyebrow">MISSION OVERVIEW</span></div>`).join('');const visible=state.crew.filter(c=>(state.crewFilter==='all'||c.level===state.crewFilter)&&(!state.crewSearch||`${c.name} ${c.astronaut_id} ${c.role}`.toLowerCase().includes(state.crewSearch)));$('crewGrid').innerHTML=visible.length?visible.map(c=>`<div class="crew-card" tabindex="0" data-inspect-astro="${esc(c.astronaut_id)}" role="button" aria-label="View ${esc(c.name)} crew status and emergency options"><div class="crew-top"><img class="avatar avatar-image" src="${portrait(c.astronaut_id)}" alt="Portrait of ${esc(c.name)}" loading="lazy"><div><div class="crew-name">${esc(c.name)}</div><div class="crew-role">${esc(c.role)}</div></div><span class="crew-id">${c.astronaut_id}</span></div><div class="crew-info"><span class="flag ${esc(c.level)}">${esc(c.health_status).toUpperCase()}</span><span class="crew-role">Day ${c.mission_day}</span></div><div class="crew-action">Latest: ${finite(c.hr)} bpm heart rate · ${finite(c.sleep)} h sleep</div><div class="crew-action">Next action: ${esc(c.action)}</div>${c.critical_flag?'<div class="critical-inline">MANUALLY FLAGGED CRITICAL · EMERGENCY RESPONSE</div>':''}<div class="card-foot"><span>Last check-in: ${niceDate(c.last_checkin)}</span><button class="button secondary" data-open-astro="${esc(c.astronaut_id)}">View status / emergency</button></div></div>`).join(''):'<div class="empty-crew">No astronauts match this filter.</div>';if(state.me?.admin){$('adminTarget').innerHTML=state.crew.map(c=>`<option value="${c.astronaut_id}">${c.astronaut_id} · ${esc(c.name)}</option>`).join('');$('adminTarget').value=state.target||state.me.user.astronaut_id;}}
async function reloadCrew(){const c=await api('/api/crew');state.crew=c.crew;renderCrew();renderLoginCrew();}
async function loadProfile(target){if(!state.me)return;const actual=target||state.target||state.me.user.astronaut_id;const p=await api('/api/profile?astronaut_id='+encodeURIComponent(actual));
if(state.target!==actual){
  for(const id of ['dailyForm','dietForm','medForm','symptomForm','radiationForm'])$(id).reset();
  $('dailyDate').value=today();$('dietDate').value=today();$('radiationTime').value=radiationDateNow();
  state.region='';$('chosenRegion').textContent='Select a body area';$('symptomRegion').value='';
  $('askBodyAI').disabled=true;$('bodyFeedback').classList.add('hidden');
}
state.target=actual;state.profile=p;if(state.me.admin)$('adminTarget').value=actual;renderPersonal();renderDaily();renderRadiation();renderSymptoms();renderMeds();renderDiet();renderEmergency();renderSettings();renderAssistantContext();renderWearables();renderCrewBio();}
function num(v,unit='',digits=null){if(v===null||v===undefined||v==='')return '—';const x=digits===null?v:Number(v).toFixed(digits);return esc(x)+(unit?` <em>${esc(unit)}</em>`:'');}
function renderPersonal(){const p=state.profile;if(!p)return;const u=p.profile,d=p.daily[0];$('personalTitle').textContent=u.name;$('personalId').textContent=u.astronaut_id;$('personalPortrait').src=portrait(u.astronaut_id);$('personalPortrait').alt='Portrait of '+u.name;const personalHead=document.querySelector('#view-personal .personal-identity-left p');if(personalHead){const latestDate=d?.date?niceDate(d.date):'No check-ins yet';personalHead.textContent=(u.role||'Crew member')+' · Last check-in: '+latestDate;}const quick=$('olPersonalQuickFacts');if(quick){quick.innerHTML=[[d?.hr,'bpm','Heart rate'],[d?.sleep,'h','Sleep'],[d?.spo2,'%','SpO₂'],[u.mission_day,'','Mission day']].map(([v,unit,label])=>`<div class="ol-personal-chip"><strong>${v===null||v===undefined||v===''?'—':esc(String(v)+(unit?(' '+unit):''))}</strong><small>${label}</small></div>`).join('');}const met=[['Resting heart rate',d?.hr,'bpm','Most recent check-in'],['Sleep',d?.sleep,'h','Most recent night'],['Body mass',d?.mass,'kg','Tracked trend'],['Blood oxygen',d?.spo2,'%','SpO₂'],['Blood pressure',d?.systolic!==null&&d?.systolic!==undefined?`${d.systolic}/${d.diastolic}`:null,'mmHg','Latest reading'],['Exercise',d?.exercise,'min','Last 24 hours'],['Water logged',d?.water,'L','Most recent day'],['Radiation dose',p.radiation?.dose_total_msv,'mSv','Entered interval doses'],['Fatigue',d?.fatigue,'/ 5','Self-reported'],['Body temperature',d?.temperature_c,'°C','Measured reading'],['Blood glucose',d?.glucose_mgdl,'mg/dL',d?.glucose_context||'Measurement']];$('personalMetrics').innerHTML=met.map(([label,n,unit,sub])=>`<div class="metric"><small>${label}</small><strong>${num(n,unit)}</strong><p>${sub}</p></div>`).join('');renderPersonalTrend();let day=u.mission_day||0;const low=100*Math.pow(.985,day/30),high=100*Math.pow(.99,day/30),center=(low+high)/2;$('boneRing').style.background=`conic-gradient(var(--cyan) ${center}%, #213748 0)`;$('boneValue').textContent=center.toFixed(1)+'%';$('boneRange').textContent=low.toFixed(1)+'–'+high.toFixed(1)+'% reference range';$('boneText').textContent=`Mission day ${day}. Based on a published 1–1.5% monthly spaceflight average, not a scan or personal prediction.`;$('personalActions').innerHTML=`<p><span class="flag ${esc(p.level)}">${esc(p.status)}</span></p><div class="result">${esc(p.action)}</div><p>New check-ins and symptom reports update this action list.</p>`;updateSim();}

function renderPersonalTrend(){
  const p=state.profile;if(!p)return;
  const metric=$('trendMetric')?.value||'sleep';
  const units={sleep:'h',hr:'bpm',mass:'kg',temperature_c:'°C',glucose_mgdl:'mg/dL',exercise:'min',water:'L'};
  const entries=p.daily.slice(0,7).reverse().filter(x=>x[metric]!==null&&x[metric]!==undefined&&x[metric]!=='');
  if(!entries.length){$('dailyTrend').innerHTML='<p class="trend-empty">No measurements recorded for this indicator yet.</p>';return;}
  const values=entries.map(d=>Number(d[metric]));
  const max=Math.max(...values,0.01);
  $('dailyTrend').innerHTML=entries.map((d,i)=>{const v=values[i];const percent=Math.max(9,Math.round(v/max*100));
   return `<div class="trend-item" title="${esc(niceDate(d.date))}: ${esc(v)} ${esc(units[metric])}"><div class="trend-val">${esc(Number(v).toFixed(v%1===0?0:1))}<small>${esc(units[metric])}</small></div><div class="trendbar" style="height:${percent}%"></div><span>${niceDate(d.date)}</span></div>`;
  }).join('');
}

function updateSim(){const p=state.profile;if(!p)return;const d=p.daily[0]||{};const sleep=Number($('simSleep').value),exercise=Number($('simExercise').value);$('simSleepLabel').textContent=sleep+' h';$('simExerciseLabel').textContent=exercise+' min';const s=d.sleep===null||d.sleep===undefined?'no baseline':(sleep-d.sleep>=0?'+':'')+(sleep-d.sleep).toFixed(1)+' h vs latest';const e=d.exercise===null||d.exercise===undefined?'no baseline':(exercise-d.exercise>=0?'+':'')+(exercise-d.exercise)+' min vs latest';$('simResult').textContent=`Sleep: ${s}\nExercise: ${e}\n\nComparison of recorded values only; no predicted health outcome.`;}
function renderDaily(){const p=state.profile;if(!p)return;if(!$('dailyDate').value)$('dailyDate').value=today();$('dailyHistory').innerHTML=has(p.daily)?p.daily.slice(0,14).map(d=>`<div class="record"><div class="record-head"><strong>${niceDate(d.date)}</strong><small>${finite(d.hr)} bpm · ${finite(d.spo2)}% SpO₂</small></div><p>${finite(d.sleep)} h sleep · ${finite(d.exercise)} min activity · ${finite(d.mass)} kg (${esc(d.mass_method||'method not recorded')}) · ${finite(d.water)} L water<br>Temperature: ${finite(d.temperature_c)} °C · Glucose: ${finite(d.glucose_mgdl)} mg/dL</p><button class="button secondary" data-edit-day="${esc(d.date)}">Edit this day</button></div>`).join(''):'<p>No entries yet.</p>';}
function fillDaily(date){const d=state.profile.daily.find(x=>x.date===date);if(!d)return;const f=$('dailyForm');for(const [key,v] of Object.entries(d)){if(f.elements.namedItem(key))f.elements.namedItem(key).value=v??'';}goto('daily');f.scrollIntoView({behavior:'smooth'});}

function radiationDateNow(){const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,16);}
function renderRadiation(){
 const p=state.profile; if(!p)return;
 const r=p.radiation||{readings:[],dose_total_msv:0,dose_entries:0};
 const readings=r.readings||[];const prev=p.profile.career_baseline_msv;
 if(!$('radiationTime').value)$('radiationTime').value=radiationDateNow();
 const last=readings.find(x=>x.source!=='Training / simulated data');
 const facts=[['Logged interval dose',r.dose_entries?Number(r.dose_total_msv).toFixed(4)+' mSv':'No dose entries','Measured intervals only'],['Latest logged dose rate',r.latest_rate_usvh!==null&&r.latest_rate_usvh!==undefined?Number(r.latest_rate_usvh).toFixed(3)+' µSv/h':'No rate logged',r.latest_rate_at?niceRadTime(r.latest_rate_at):'Needs an instrument'],['Recorded entries',r.measured_count||0,'Manual / imported'],['Unmeasured scenarios',r.simulated_count||0,'Not included in totals']];
 $('radiationMetrics').innerHTML=facts.map(([label,value,tip])=>`<div class="rad-stat"><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(tip)}</p></div>`).join('');
 const measured=readings.filter(x=>x.source!=='Training / simulated data'&&x.dose_msv!==null).slice(0,12).reverse();
 const max=Math.max(.001,...measured.map(x=>Number(x.dose_msv)||0));
 $('radiationTrend').innerHTML=measured.length?measured.map(x=>`<div class="rad-bar-wrap"><span>${Number(x.dose_msv).toFixed(3)}</span><div class="rad-column"><div class="rad-bar" style="height:${Math.max(3,Math.round(x.dose_msv/max*100))}%"></div></div><small>${esc(niceDate(x.measured_at.slice(0,10)))}</small></div>`).join(''):'<div class="rad-empty">No measured interval-dose readings yet. Log an instrument reading to display the chart.</div>';
 $('radiationGuidance').textContent=readings.length?`Latest source: ${last?last.source:'Training / simulated data only'}. Recorded values are user-entered or imported; not directly measured by PulseDeck. A dose-rate snapshot cannot be added to the cumulative dose without a validated measurement interval.`:'No radiation records yet. Enter a dosimeter reading or import a CSV file.';
 $('radiationHistory').innerHTML=readings.length?readings.slice(0,30).map(x=>`<div class="record"><div class="record-head"><strong>${esc(niceRadTime(x.measured_at))}</strong><span class="flag ${x.source==='Training / simulated data'?'amber':'muted'}">${x.source==='Training / simulated data'?'SCENARIO':'RECORDED'}</span></div><p>${x.dose_msv===null?'Dose not logged':Number(x.dose_msv).toFixed(4)+' mSv'} · ${x.rate_usvh===null?'Rate not logged':Number(x.rate_usvh).toFixed(3)+' µSv/h'}</p><small>${esc(x.source)} · ${esc(x.location||'No location')} · ${esc(x.notes||'')}</small><div class="record-actions"><button class="button ghost" data-delete-radiation="${x.id}" type="button">Remove entry</button></div></div>`).join(''):'<p class="fine">No readings on file.</p>';
 if(document.activeElement!==$('radiationBaselineForm').elements.namedItem('career_baseline_msv')) $('radiationBaselineForm').elements.namedItem('career_baseline_msv').value=prev??'';
 let text=prev===null||prev===undefined?'Previous career dose is unknown. This app cannot calculate a complete career dose until you enter a documented previous total.':`Previous recorded career dose: ${Number(prev).toFixed(3)} mSv. Arithmetic sum with logged interval dose: ${(Number(prev)+Number(r.dose_total_msv)).toFixed(3)} mSv (not a validated career effective dose).`;
 $('radiationCareer').textContent=text+' Career effective dose and instrument readings are different quantities and require radiation specialist interpretation.';
}
function niceRadTime(t){return String(t||'').replace('T',' ').slice(0,16);}
function csvEscape(value){let x=String(value??'');return '"'+x.replaceAll('"','""')+'"';}
function downloadRadiationCSV(){const p=state.profile;if(!p)return;const head=['measured_at','dose_msv','rate_usvh','source','location','notes'];const rows=[head.join(','),...(p.radiation?.readings||[]).map(r=>head.map(k=>csvEscape(r[k])).join(','))];const file=new Blob([rows.join('\r\n')],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download='OrbitLife_'+p.profile.astronaut_id+'_radiation.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);}
function parseCSV(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){row.push(cell);cell='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);row=[];cell='';}
  else cell+=ch;
 }
 if(quoted)throw new Error('Unclosed quote in CSV.');row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);return rows;
}
async function importRadiationCSV(){
 const f=$('radiationCsv').files[0];if(!f){flash('Choose a dosimeter CSV file first.',true);return;}if(f.size>1500000){flash('CSV too large (max 1.5 MB).',true);return;}
 try{let rows=parseCSV(await f.text());if(rows.length<2)throw new Error('The CSV has no readings.');
  const header=rows.shift().map(x=>x.trim().toLowerCase().replace(/^\ufeff/,''));
  if(!header.includes('measured_at'))throw new Error('Missing measured_at column.');
  const entries=rows.map((row,index)=>{const obj={};for(const k of ['measured_at','dose_msv','rate_usvh','source','location','notes']){const index=header.indexOf(k);obj[k]=index===-1?'':(row[index]||'').trim();}if(!obj.source)obj.source='Imported dosimeter log';return obj;});
  if(entries.length>200)throw new Error('Import only 200 readings at a time.');
  if(!confirm(`Import ${entries.length} radiation readings into ${state.profile.profile.name}'s private log? Check that dose_msv values are incremental doses and are not already included in the log.`))return;
  await saveAndRefresh('/api/radiation/import',{entries},`${entries.length} radiation readings imported.`);$('radiationCsv').value='';
 }catch(e){flash(e.message,true);}
}

function renderSymptoms(){const p=state.profile;if(!p)return;$('symptomHistory').innerHTML=has(p.symptoms)?p.symptoms.slice(0,12).map(s=>`<div class="record"><div class="record-head"><strong>${esc(s.region.toUpperCase())}</strong><span class="flag ${s.severity>=5?'red':'amber'}">Severity ${s.severity}/5</span></div><p>${esc(s.notes)}</p><small>${esc(s.created_at.slice(0,16).replace('T',' '))} · ${esc(s.onset||'Onset not recorded')}</small></div>`).join(''):'<p>No symptom reports yet.</p>';}
function renderMeds(){const m=state.profile?.medications||[];$('medList').innerHTML=m.length?m.map(r=>`<div class="record"><div class="record-head"><strong>${esc(r.name)}</strong><span class="flag ${r.taken_date===today()?'':'muted'}">${r.taken_date===today()?'Logged taken today':'Not logged today'}</span></div><p>${esc(r.schedule||'No schedule entered')}</p><small>${esc(r.instructions||'')}</small><div class="record-actions"><button class="button secondary" data-med-taken="${r.id}" data-value="${r.taken_date===today()?'0':'1'}">${r.taken_date===today()?'Undo today':'Mark taken today'}</button><button class="button ghost" data-med-delete="${r.id}">Remove</button></div></div>`).join(''):'<p>No medications entered yet.</p>';}

// ISS food catalog: representative documented foods, not current inventory or nutrition data.
const ISS_FOODS=[{"category": "Breakfast", "name": "Scrambled eggs", "detail": "Rehydratable; prepared with water"}, {"category": "Breakfast", "name": "Cereal", "detail": "Rehydratable or ready to eat"}, {"category": "Breakfast", "name": "Granola / cereal bar", "detail": "Ready to eat"}, {"category": "Breakfast", "name": "Fruit yogurt", "detail": "Mission-specific, packaged"}, {"category": "Breakfast", "name": "French toast", "detail": "Documented NASA menu item"}, {"category": "Breakfast", "name": "Coffee", "detail": "Rehydratable drink"}, {"category": "Breakfast", "name": "Tea", "detail": "Rehydratable drink"}, {"category": "Main meals", "name": "Shrimp cocktail", "detail": "Rehydratable; NASA / CSA menu"}, {"category": "Main meals", "name": "Chicken teriyaki", "detail": "Shelf-stable / rehydratable meal"}, {"category": "Main meals", "name": "Beef fajita", "detail": "Thermostabilized; serve with tortilla"}, {"category": "Main meals", "name": "Macaroni and cheese", "detail": "Rehydratable entrée"}, {"category": "Main meals", "name": "Chicken and rice", "detail": "Rehydratable entrée"}, {"category": "Main meals", "name": "Beef steak", "detail": "Irradiated or shelf-stable"}, {"category": "Main meals", "name": "Ravioli", "detail": "Thermostabilized pouch"}, {"category": "Main meals", "name": "Tortilla wrap", "detail": "Ready-to-eat tortilla; low crumbs"}, {"category": "Main meals", "name": "Fish with miso and rice", "detail": "Japanese space food example"}, {"category": "Main meals", "name": "Japanese curry", "detail": "Thermostabilized pouch"}, {"category": "Main meals", "name": "Cream of mushroom soup", "detail": "Rehydratable soup"}, {"category": "Main meals", "name": "Rice / noodles", "detail": "Rehydratable"}, {"category": "Fruit & vegetables", "name": "Fresh carrots", "detail": "Fresh on resupply; limited availability"}, {"category": "Fruit & vegetables", "name": "Fresh orange", "detail": "Fresh on resupply; limited availability"}, {"category": "Fruit & vegetables", "name": "Dried apricots", "detail": "Ready-to-eat dried fruit"}, {"category": "Fruit & vegetables", "name": "Freeze-dried spinach", "detail": "Rehydratable vegetable"}, {"category": "Fruit & vegetables", "name": "Green beans", "detail": "Packaged vegetable"}, {"category": "Fruit & vegetables", "name": "Fruit mix", "detail": "Packaged or dried"}, {"category": "Snacks & desserts", "name": "Mixed nuts", "detail": "Ready-to-eat snack"}, {"category": "Snacks & desserts", "name": "Peanut butter", "detail": "Shelf-stable spread"}, {"category": "Snacks & desserts", "name": "Chocolate pudding", "detail": "Thermostabilized dessert"}, {"category": "Snacks & desserts", "name": "Shortbread cookies", "detail": "Ready-to-eat snack"}, {"category": "Snacks & desserts", "name": "Fruit bar", "detail": "Ready-to-eat snack"}, {"category": "Snacks & desserts", "name": "Maple cookies", "detail": "Canadian space food example"}, {"category": "Snacks & desserts", "name": "Honey", "detail": "Shelf-stable spread"}, {"category": "Drinks", "name": "Orange juice", "detail": "Drink concentrate / packaged"}, {"category": "Drinks", "name": "Apple juice", "detail": "Drink concentrate / packaged"}, {"category": "Drinks", "name": "Hot cocoa", "detail": "Rehydratable"}, {"category": "Drinks", "name": "Green tea", "detail": "Rehydratable"}, {"category": "Drinks", "name": "Lemonade", "detail": "Rehydratable"}, {"category": "Drinks", "name": "Water", "detail": "Measured fluid intake"}, {"category": "Condiments", "name": "Hot sauce", "detail": "Liquid condiment"}, {"category": "Condiments", "name": "Spicy mustard", "detail": "Packaged condiment"}, {"category": "Condiments", "name": "Strawberry jam", "detail": "Packaged spread"}];
function setupFoodCatalog(){const cats=[...new Set(ISS_FOODS.map(x=>x.category))];$('foodCategory').innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');renderFoodOptions();}
function renderFoodOptions(){const cat=$('foodCategory').value, prev=$('foodItem').value;
  const matches=ISS_FOODS.filter(f=>cat==='all'||f.category===cat);
  $('foodItem').innerHTML='<option value="">Choose a food item</option>'+matches.map(f=>`<option value="${esc(f.name)}">${esc(f.name)}</option>`).join('');
  if(matches.some(f=>f.name===prev))$('foodItem').value=prev;
  showFoodDetail();
}
function showFoodDetail(){const f=ISS_FOODS.find(x=>x.name===$('foodItem').value);$('foodDescription').textContent=f?f.detail:'Choose a food to see how it is commonly prepared for space.';}
function addSelectedFood(){const food=ISS_FOODS.find(x=>x.name===$('foodItem').value);if(!food){flash('Select a food from the catalog.',true);return;}
  const servings=Number($('foodServings').value);if(!Number.isInteger(servings)||servings<1||servings>10){flash('Servings must be between 1 and 10.',true);return;}
  const line=`${$('mealType').value}: ${food.name}${servings>1?' × '+servings:''}`;
  const box=$('dietMeals');box.value=box.value.trim()?(box.value.trim()+'\n'+line):line;
  $('selectedFoods').textContent=`Added: ${food.name} · ${$('mealType').value}`;box.dispatchEvent(new Event('input'));}
function renderAssistantContext(){const p=state.profile;const c=$('assistantContext');if(!c||!p)return;const d=p.daily[0];const parts=[['Most recent check-in',d?.date||'Not recorded'],['Resting heart rate',d?.hr==null?'—':d.hr+' bpm'],['Sleep',d?.sleep==null?'—':d.sleep+' hours'],['Body mass',d?.mass==null?'—':d.mass+' kg'],['Temperature',d?.temperature_c==null?'—':d.temperature_c+' °C'],['Blood glucose',d?.glucose_mgdl==null?'—':d.glucose_mgdl+' mg/dL'],['Logged dose',p.radiation?.dose_entries?p.radiation.dose_total_msv+' mSv':'Not recorded'],['Symptom reports',p.symptoms?.length||0],['Food entries',p.diet?.length||0],['Wearable feed',p.wearable?.latest?(p.wearable.latest.source==='synthetic'?'Synthetic · '+p.wearable.latest.date:'Imported · '+p.wearable.latest.date):'Not recorded']];
  c.innerHTML=parts.map(([a,b])=>`<div class="quick-row"><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');}

function renderDiet(){const p=state.profile;if(!p)return;$('dietDate').value=today();$('dietList').innerHTML=p.diet.length?p.diet.slice(0,15).map(d=>`<div class="record"><div class="record-head"><strong>${niceDate(d.date)}</strong><small>${d.calories===null||d.calories===undefined||d.calories===''?'Not recorded':d.calories+' kcal'}</small></div><p>${esc(d.meals)}</p><small>${esc(d.notes)}</small></div>`).join(''):'<p>No food entries yet.</p>';$('restrictionInfo').textContent='Restrictions: '+(p.profile.dietary_restrictions||'Not entered. You can add these under Emergency Info.');}
function renderEmergency(){const p=state.profile;if(!p)return;const u=p.profile;const form=$('emergencyForm');for(const k of ['emergency_contact','blood_type','allergies','conditions','emergency_notes','dietary_restrictions']){const element=form.elements.namedItem(k);if(element)element.value=u[k]||'';}$('emergencyCard').innerHTML=[['Astronaut ID',u.astronaut_id],['Name',u.name],['Flight role',u.role],['Emergency contact',u.emergency_contact],['Blood type',u.blood_type],['Allergies',u.allergies],['Health conditions',u.conditions],['Dietary restrictions',u.dietary_restrictions],['Emergency notes',u.emergency_notes]].map(([label,v])=>`<div class="quick-row"><span>${label}</span><strong>${esc(v||'Not entered')}</strong></div>`).join('');}
function renderSettings(){const u=state.me?.user;if(!u)return;$('accountCard').innerHTML=`<div class="settings-profile"><img src="${portrait(u.astronaut_id)}" alt="Portrait of ${esc(u.name)}"><div><b>${esc(u.name)}</b><small>${esc(u.astronaut_id)}</small></div></div>`+[['Digital ID',u.astronaut_id],['Name',u.name],['Role',u.role],['Username',u.username]].map(([k,v])=>`<div class="quick-row"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('');}
function ageFromBirth(d){if(!d)return null;const t=new Date(d+'T12:00:00');if(!Number.isFinite(t.getTime()))return null;const now=new Date();let years=now.getFullYear()-t.getFullYear();if(now.getMonth()<t.getMonth()||(now.getMonth()===t.getMonth()&&now.getDate()<t.getDate()))years--;return years>=0?years:null;}
function renderCrewBio(){const pack=state.profile;if(!pack)return;const p=pack.profile;
 $('crewBioName').textContent=p.name;$('crewBioId').textContent=p.astronaut_id;$('crewBioRole').textContent=p.role+' · '+(p.nationality||'Mission crew');$('crewBioPortrait').src=portrait(p.astronaut_id);
 $('crewBioDescription').textContent=p.bio||'No personal biography entered yet.';
 const age=ageFromBirth(p.dob);const traits=(p.strengths||'').split('·').map(x=>x.trim()).filter(Boolean);
 $('crewBioTags').innerHTML=traits.length?traits.map(t=>`<span>${esc(t)}</span>`).join(''):'<span>No strengths entered</span>';
 const facts=[['Date of birth',p.dob||'Not entered'],['Age',age===null?'Not entered':age+' years'],['Gender',p.gender||'Not entered'],['Race / ethnicity',p.heritage||'Not entered'],['Nationality',p.nationality||'Not entered'],['Favorite food',p.favorite_foods||'Not entered'],['Eating habits',p.food_pattern||'Not entered'],['Astronaut ID',p.astronaut_id]];
 $('crewBioFacts').innerHTML=facts.map(([a,b])=>`<div class="profile-fact"><small>${esc(a)}</small><strong>${esc(b)}</strong></div>`).join('');
 const form=$('crewBioForm');for(const key of ['dob','gender','heritage','nationality','strengths','bio','favorite_foods','food_pattern']){const el=form.elements.namedItem(key);if(el)el.value=p[key]||'';}
}
const WATCH_UNITS={sleep_hours:'h',resting_hr:'bpm',steps:'steps',stress_score:'/100',body_battery:'/100',active_minutes:'min',hrv_ms:'ms'};
function wearValue(v,unit=''){return v==null?'—':esc(String(v))+(unit?' '+esc(unit):'');}
function renderWearables(){const p=state.profile;if(!p)return;const w=p.wearable||{},u=p.profile,v=w.latest||null;
 $('wearablePortrait').src=portrait(u.astronaut_id);$('wearableName').textContent=u.name;$('wearableSubtitle').textContent=u.astronaut_id+' · '+u.role;
 $('wearSourceBadge').textContent=v?.source==='imported'?'IMPORTED RECORDS / NO LIVE LINK':'SYNTHETIC DATA / NO LIVE LINK';
 const metrics=[['Sleep',v?.sleep_hours,'h',v?.date||'No records'],['Resting heart rate',v?.resting_hr,'bpm','Illustrative daily figure'],['Steps',v?.steps,'','Daily activity count'],['Stress index',v?.stress_score,'/100','Illustrative wearable scale'],['Body Battery-style',v?.body_battery,'/100','Illustrative energy score'],['Active minutes',v?.active_minutes,'min','Activity time'],['SpO₂',v?.spo2,'%','Illustrative oxygen saturation'],['Sleep score',v?.sleep_score,'/100','Illustrative sleep score']];
 $('wearableMetrics').innerHTML=metrics.map(([t,value,unit,desc])=>`<div class="metric"><small>${esc(t)}</small><strong>${num(value,unit)}</strong><p>${esc(desc)}</p></div>`).join('');
 const latest=(w.history||[]).slice(0,14);
 $('wearableRows').innerHTML=latest.map(r=>`<tr><td>${esc(r.date)}</td><td class="${esc(r.source)}">${r.source==='synthetic'?'Simulated':'Imported'}</td><td>${wearValue(r.sleep_hours,'h')}</td><td>${wearValue(r.resting_hr,'bpm')}</td><td>${wearValue(r.steps)}</td><td>${wearValue(r.stress_score)}</td><td>${wearValue(r.body_battery)}</td><td>${wearValue(r.active_minutes,'min')}</td></tr>`).join('')||'<tr><td colspan="8">No records</td></tr>';
 $('wearableHabits').innerHTML=[['Personal strengths',u.strengths||'Not entered'],['Food preferences',u.favorite_foods||'Not entered'],['Typical meal pattern',u.food_pattern||'Not entered'],['Data source', (w.synthetic_count||0)+' simulated days, '+(w.imported_count||0)+' imported days']].map(([title,val])=>`<div class="habits-row"><small>${esc(title)}</small><strong>${esc(val)}</strong></div>`).join('');
 renderWearableTrend();
}
function renderWearableTrend(){const w=state.profile?.wearable;if(!w)return;const key=$('wearableTrendMetric').value;
 const rows=(w.history||[]).slice(0,30).filter(r=>r[key]!=null).reverse();
 if(!rows.length){$('wearableChart').innerHTML='<p class="wearable-empty">No data for this metric yet.</p>';return;}
 const vals=rows.map(x=>Number(x[key]));const min=Math.min(...vals),max=Math.max(...vals);const range=Math.max(max-min,1);
 $('wearableChart').innerHTML=rows.map((r,i)=>{const pct=17+83*(vals[i]-min)/range;const day=r.date.slice(8);
 return `<div class="wearable-bar-group" title="${esc(r.date)}: ${esc(vals[i])} ${esc(WATCH_UNITS[key]||'')} · ${esc(r.source)}"><div class="wearable-bar ${esc(r.source)}" style="height:${pct.toFixed(1)}%"></div>${i%5===0||i===rows.length-1?`<span>${esc(day)}</span>`:''}</div>`;}).join('');
}
async function importWearableData(){const file=$('wearableImport').files[0];if(!file)return;try{
 if(file.size>100000)throw new Error('Use a JSON file smaller than 100 KB.');
 const obj=JSON.parse(await file.text());const entries=Array.isArray(obj)?obj:obj.entries;
 if(!Array.isArray(entries))throw new Error('JSON must be an array of daily records or an object containing an entries array.');
 await saveAndRefresh('/api/wearable/import',{entries},entries.length+' wearable records imported. They are not verified as Garmin-origin.');
 }catch(e){flash(e.message,true);}finally{$('wearableImport').value='';}}
function bodyMarkup(back=false){const common=`<text x="135" y="18" text-anchor="middle" class="body-label">${back?'BACK VIEW':'FRONT VIEW'}</text>`;const piece=(type,region,attrs)=>`<${type} class="body-shape ${state.region===region?'selected':''}" data-region="${region}" role="button" tabindex="0" aria-label="Report ${region} symptoms" ${attrs}/>`;const out=[common];out.push(piece('circle','head','cx="135" cy="60" r="29"'));out.push(piece('rect','neck','x="125" y="92" width="20" height="17" rx="5"'));if(back){out.push(piece('path','upper back','d="M107 112 Q136 103 165 112 L163 198 L107 198 Z"'));out.push(piece('path','lower back','d="M107 203 L163 203 L161 266 L109 266 Z"'));}else{out.push(piece('path','chest','d="M106 114 Q135 105 164 114 L170 191 L100 191 Z"'));out.push(piece('path','abdomen','d="M100 196 L170 196 L161 260 L109 260 Z"'));}out.push(piece('path','pelvis','d="M109 264 L161 264 L167 289 L137 310 L103 289 Z"'));out.push(piece('path','left arm','d="M104 115 L92 122 L74 181 L66 238 L73 262 L84 258 L97 190 L113 154 Z"'));out.push(piece('path','right arm','d="M166 115 L178 122 L196 181 L204 238 L197 262 L186 258 L173 190 L157 154 Z"'));out.push(piece('path','left leg','d="M104 292 L135 307 L130 379 L119 414 L105 413 L108 382 L99 327 Z"'));out.push(piece('path','right leg','d="M166 292 L135 307 L140 379 L151 414 L165 413 L162 382 L171 327 Z"'));return `<svg viewBox="0 0 270 440" xmlns="http://www.w3.org/2000/svg" aria-label="Click a body area">${out.join('')}<text class="body-label" x="135" y="434" text-anchor="middle">${back?'POSTERIOR':'ANTERIOR'} · INTERACTIVE</text></svg>`;}
function drawBody(){$('bodyDrawing').innerHTML=bodyMarkup(state.side==='back');document.querySelectorAll('.seg').forEach(e=>e.classList.toggle('active',e.dataset.side===state.side));}
function selectRegion(region){state.region=region;$('chosenRegion').textContent=region.replace(/\b\w/g,c=>c.toUpperCase());$('symptomRegion').value=region;$('askBodyAI').disabled=false;drawBody();}
function chatBubble(role,msg){const bubble=document.createElement('div');bubble.className='bubble '+(role==='user'?'user-bubble':'assistant-bubble');bubble.textContent=msg;$('chatMessages').appendChild(bubble);$('chatMessages').scrollTop=$('chatMessages').scrollHeight;return bubble;}
async function askQuestion(question){if(!state.me){$('loginModal').classList.remove('hidden');return;}goto('assistant');const mode=document.querySelector('input[name=aiMode]:checked').value;chatBubble('user',question);const waiting=chatBubble('assistant','Analyzing the selected astronaut\'s records...');try{const result=await api('/api/chat','POST',{question,mode,...(state.me.admin?{astronaut_id:state.target}:{})});waiting.textContent=result.answer;}catch(e){waiting.textContent='Error: '+e.message+(mode==='connected'?'\nTry Offline mode if no API credits are available.':'');}}
async function saveAndRefresh(endpoint,values,success){const data={...values};if(state.me?.admin&&state.target)data.astronaut_id=state.target;await api(endpoint,'POST',data);await Promise.all([loadProfile(state.target),reloadCrew()]);flash(success||'Saved.');}

function hideCrewInspect(){ $('crewInspectModal').classList.add('hidden');state.crewInspect=null;}
function openLoginFor(id){hideCrewInspect();selectLoginMember(id);$('loginModal').classList.remove('hidden');$('loginPassword').focus();}
function renderCrewInspectData(c,details){
  $('inspectPhoto').src=portrait(c.astronaut_id);
  $('inspectName').textContent=c.name;
  $('inspectRole').textContent=c.role+' · '+c.astronaut_id;
  $('inspectStatus').textContent=c.health_status;
  $('inspectStatus').className='flag '+c.level;
  $('inspectAction').textContent=c.action;
  $('inspectMetrics').textContent=`Latest: ${c.hr??'—'} bpm / ${c.sleep??'—'} h sleep / mission day ${c.mission_day}`;
  $('inspectCriticalTag').classList.toggle('hidden',!c.critical_flag);
  const authorized=!!details;
  $('inspectPrivate').classList.toggle('hidden',!authorized);
  $('inspectLocked').classList.toggle('hidden',authorized);
  $('inspectLogin').classList.toggle('hidden',authorized);
  $('inspectManage').classList.toggle('hidden',!authorized);
  if(!authorized)return;
  const x=details.profile||{};
  const items=[['Blood type',x.blood_type],['Allergies',x.allergies],['Medical conditions',x.conditions],['Emergency contact',x.emergency_contact],['Dietary restrictions',x.dietary_restrictions],['Emergency notes',x.emergency_notes]];
  if(details.radiation){const rr=details.radiation;items.push(['Logged mission radiation',rr.dose_entries?rr.dose_total_msv+' mSv':'No measured interval dose']);items.push(['Latest dose rate',rr.latest_rate_usvh!==null?rr.latest_rate_usvh+' µSv/h':'Not logged']);}
  $('inspectEmergencyFields').innerHTML=items.map(([key,value])=>`<div class="quick-row"><span>${esc(key)}</span><strong>${esc(value||'Not entered')}</strong></div>`).join('');
  $('criticalToggle').checked=!!x.critical_flag;
  $('criticalReason').value=x.critical_reason||'';
  $('criticalReason').required=!$('criticalToggle').checked?false:true;
  $('criticalReason').placeholder='Why is this crew member in critical condition?';
  $('criticalUpdate').textContent=x.critical_updated?'Last update: '+x.critical_updated.replace('T',' ').slice(0,19)+' UTC':'No manually recorded critical event';
}
async function openCrewInspect(id){
 const c=state.crew.find(x=>x.astronaut_id===id);if(!c)return;
 state.crewInspect=id;
 $('crewInspectModal').classList.remove('hidden');
 renderCrewInspectData(c,null);
 $('inspectLocked').textContent='Sign in as this astronaut or the mission administrator to open emergency medical information and change critical condition flags.';
 if(state.me&&(state.me.admin||state.me.user.astronaut_id===id)){
  try{const detail=await api('/api/profile?astronaut_id='+encodeURIComponent(id));
   if(state.crewInspect!==id)return;
   renderCrewInspectData(c,detail);
  }catch(e){flash(e.message,true);}
 }
}

// All successful logins go through the same path (password or one-use RFID grant).
async function orbitCompleteLogin(p,source='password'){
  if(!p?.user)throw new Error('Login response did not include an astronaut.');
  state.me={user:p.user,admin:p.user.astronaut_id==='AST-001'};
  state.target=p.user.astronaut_id;
  state.profile=null;
  $('loginModal').classList.add('hidden');
  $('loginForm').reset();
  if(typeof orbitLoginTransition==='function')orbitLoginTransition(p.user.name);
  updateAuth();
  await reloadCrew();
  await loadProfile();
  goto('personal');
  if(window.orbitAfterLogin?.view){
    const pending=window.orbitAfterLogin;window.orbitAfterLogin=null;
    if(pending.view==='menu'){
      goto('menu');
      setTimeout(()=>{const card=document.querySelector(`#olMenuGrid .ol-menu-card[data-astro="${pending.astronaut_id}"]`);
        if(card){card.open=true;card.scrollIntoView({block:'center',behavior:'smooth'});}},400);
    }else if(pending.view==='emergency'){
      goto('crew');
      setTimeout(()=>{document.getElementById('olEmergencyFab')?.click();document.getElementById('olEmergencyReportChoice')?.click();},150);
    }else if(['daily','radiation','body','medications','records','assistant','twin'].includes(pending.view))goto(pending.view);
  }
  flash((source==='rfid'?'RFID signed in as ':'Logged in as ')+p.user.name);
}
window.orbitCompleteLogin=orbitCompleteLogin;

function bind(){$('openResearch').onclick=$('openResearchFromSidebar').onclick=()=>{$('researchModal').classList.remove('hidden');};$('closeResearch').onclick=()=>{$('researchModal').classList.add('hidden');};$('researchModal').addEventListener('click',e=>{if(e.target===$('researchModal'))$('researchModal').classList.add('hidden');});document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('researchModal').classList.add('hidden');}});$('mobileMenuToggle').addEventListener('click',()=>{const open=document.querySelector('.sidebar').classList.toggle('mobile-menu-open');$('mobileMenuToggle').setAttribute('aria-expanded',String(open));});$('crewSearch').addEventListener('input',e=>{state.crewSearch=e.target.value.toLowerCase().trim();renderCrew();});$('crewFilters').addEventListener('click',e=>{const btn=e.target.closest('[data-crew-filter]');if(!btn)return;state.crewFilter=btn.dataset.crewFilter;document.querySelectorAll('[data-crew-filter]').forEach(x=>x.classList.toggle('selected',x===btn));renderCrew();});document.querySelectorAll('[data-public-target]').forEach(el=>el.addEventListener('click',()=>{const target=el.dataset.publicTarget;if(target==='crewGrid')$('crewGrid').scrollIntoView({behavior:'smooth',block:'start'});else window.scrollTo({top:0,behavior:'smooth'});}));document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>goto(el.dataset.view)));document.querySelectorAll('[data-goto]').forEach(el=>el.addEventListener('click',()=>goto(el.dataset.goto)));$('refreshCrew').addEventListener('click',async()=>{try{await reloadCrew();flash('Crew status refreshed.')}catch(e){flash(e.message,true);}});$('loginBtn').onclick=()=>$('loginModal').classList.remove('hidden');$('heroLoginBtn').onclick=()=>$('loginModal').classList.remove('hidden');$('loginCrewGrid').addEventListener('click',e=>{const btn=e.target.closest('[data-astro]');if(btn){selectLoginMember(btn.dataset.astro);$('loginPassword').focus();}});$('closeLogin').onclick=()=>$('loginModal').classList.add('hidden');$('loginModal').addEventListener('click',e=>{if(e.target===$('loginModal'))$('loginModal').classList.add('hidden')});$('logoutBtn').onclick=async()=>{try{await api('/api/logout','POST',{});state.me=null;state.profile=null;state.target=null;updateAuth();await reloadCrew();goto('crew');flash('Logged out.');}catch(e){flash(e.message,true);}};
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();try{const p=await api('/api/login','POST',formObj(e.currentTarget));await orbitCompleteLogin(p,'password');}catch(err){flash(err.message,true);}});
$('adminTarget').addEventListener('change',async e=>{try{await loadProfile(e.target.value);flash('Viewing crew member '+e.target.value)}catch(err){flash(err.message,true);}});
$('crewGrid').addEventListener('click',e=>{const item=e.target.closest('[data-inspect-astro]');if(item)openCrewInspect(item.dataset.inspectAstro);});
$('crewGrid').addEventListener('keydown',e=>{const item=e.target.closest('[data-inspect-astro]');if(item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCrewInspect(item.dataset.inspectAstro);}});
$('closeCrewInspect').onclick=hideCrewInspect;
$('crewInspectModal').addEventListener('click',e=>{if(e.target===$('crewInspectModal'))hideCrewInspect();});
$('inspectLogin').onclick=()=>openLoginFor(state.crewInspect);
$('inspectOpenProfile').onclick=async()=>{const id=state.crewInspect;hideCrewInspect();try{await loadProfile(id);goto('personal');}catch(e){flash(e.message,true);}};
$('inspectOpenEmergency').onclick=async()=>{const id=state.crewInspect;hideCrewInspect();try{await loadProfile(id);goto('emergency');}catch(e){flash(e.message,true);}};
$('criticalToggle').addEventListener('change',()=>{$('criticalReason').required=$('criticalToggle').checked;});
$('inspectCriticalForm').addEventListener('submit',async e=>{e.preventDefault();const id=state.crewInspect;if(!id)return;
 try{
  const flagged=$('criticalToggle').checked;
  await api('/api/critical','POST',{astronaut_id:id,critical:flagged,reason:$('criticalReason').value});
  await reloadCrew();if(state.target===id)await loadProfile(id);
  await openCrewInspect(id);
  flash(flagged?'Critical flag saved. Follow mission emergency protocol immediately.':'Critical flag cleared.');
 }catch(err){flash(err.message,true);}
});
$('dailyForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/daily',formObj(e.currentTarget),'Daily health entry saved.');}catch(err){flash(err.message,true);}});
$('radiationForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/radiation',formObj(e.currentTarget),'Radiation measurement saved.');$('radiationForm').reset();$('radiationTime').value=radiationDateNow();}catch(err){flash(err.message,true);}});
$('radiationBaselineForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/radiation/baseline',formObj(e.currentTarget),'Previous career dose saved.');}catch(err){flash(err.message,true);}});
$('radiationHistory').addEventListener('click',async e=>{const b=e.target.closest('[data-delete-radiation]');if(b&&confirm('Remove this radiation entry?'))try{await saveAndRefresh('/api/radiation/delete',{id:Number(b.dataset.deleteRadiation)},'Radiation entry removed.');}catch(err){flash(err.message,true);}});
$('importRadiation').addEventListener('click',importRadiationCSV);$('exportRadiation').addEventListener('click',downloadRadiationCSV);
$('dailyHistory').addEventListener('click',e=>{const btn=e.target.closest('[data-edit-day]');if(btn)fillDaily(btn.dataset.editDay);});
$('wearableTrendMetric').addEventListener('change',renderWearableTrend);
$('syncWearable').addEventListener('click',async()=>{try{const d={};if(state.me?.admin)d.astronaut_id=state.target;const reply=await api('/api/wearable/simulate','POST',d);await loadProfile(state.target);flash(reply.new_days?reply.new_days+' new simulated days added.':'Simulated feed is up to date. No Garmin watch connected.');}catch(e){flash(e.message,true);}});
$('wearableImport').addEventListener('change',importWearableData);
$('crewBioForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/crew-bio',formObj(e.currentTarget),'Crew profile saved.');}catch(err){flash(err.message,true);}});
$('trendMetric').addEventListener('change',renderPersonalTrend);$('simSleep').oninput=updateSim;$('simExercise').oninput=updateSim;
document.querySelectorAll('.seg').forEach(e=>e.addEventListener('click',()=>{state.side=e.dataset.side;drawBody();}));
$('bodyDrawing').addEventListener('click',e=>{const node=e.target.closest('[data-region]');if(node)selectRegion(node.dataset.region);});
$('bodyDrawing').addEventListener('keydown',e=>{const node=e.target.closest('[data-region]');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectRegion(node.dataset.region);}});
$('symptomForm').addEventListener('submit',async e=>{e.preventDefault();try{const d=formObj(e.currentTarget);const data={...d,...(state.me.admin?{astronaut_id:state.target}:{})};const result=await api('/api/symptom','POST',data);$('bodyFeedback').className='result'+(result.urgent?' danger':'');$('bodyFeedback').textContent=result.explanation+'\n\nUrgent warning signs: '+result.red_flags+'\n\nThese are possible causes only, not a diagnosis.';await loadProfile(state.target);await reloadCrew();flash(result.urgent?'Serious symptom logged. Follow mission emergency procedure.':'Symptom report saved.',result.urgent);}catch(err){flash(err.message,true);}});
$('askBodyAI').addEventListener('click',()=>{const area=state.region;const note=$('symptomForm').elements.namedItem('notes').value;askQuestion(`I have a symptom in my ${area}. ${note}. What are some possible reasons, what should I track and which warning signs require urgent medical help?`);});
$('medForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/medication',formObj(e.currentTarget),'Medication added to the personal log.');e.target.reset();}catch(err){flash(err.message,true);}});
$('medList').addEventListener('click',async e=>{const taken=e.target.closest('[data-med-taken]'),del=e.target.closest('[data-med-delete]');if(!taken&&!del)return;try{if(taken){await saveAndRefresh('/api/medication/taken',{id:Number(taken.dataset.medTaken),taken:taken.dataset.value==='1'},'Medication status updated.');}else if(del&&confirm('Remove this medication log entry?')){await saveAndRefresh('/api/medication/delete',{id:Number(del.dataset.medDelete)},'Medication removed.');}}catch(err){flash(err.message,true);}});
$('foodCategory').addEventListener('change',renderFoodOptions);$('foodItem').addEventListener('change',showFoodDetail);$('addSelectedFood').addEventListener('click',addSelectedFood);
$('dietForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/diet',formObj(e.target),'Food log saved.');e.target.reset();$('dietDate').value=today();$('selectedFoods').textContent='';renderFoodOptions();}catch(err){flash(err.message,true);}});
$('emergencyForm').addEventListener('submit',async e=>{e.preventDefault();try{await saveAndRefresh('/api/emergency',formObj(e.target),'Emergency medical profile saved.');}catch(err){flash(err.message,true);}});
$('passwordForm').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/password','POST',formObj(e.target));await api('/api/logout','POST',{});state.me=null;state.target=null;state.profile=null;updateAuth();await reloadCrew();goto('crew');flash('Password changed. Log in with your new password.');}catch(err){flash(err.message,true);}});
$('chatForm').addEventListener('submit',async e=>{e.preventDefault();const question=$('chatQuestion').value.trim();if(!question)return;$('chatQuestion').value='';await askQuestion(question);});

document.querySelectorAll('input[name=aiMode]').forEach(el=>el.addEventListener('change',()=>{$('aiModeTag').textContent=el.value==='offline'?'OFFLINE MODE':'CONNECTED MODE';if(el.value==='connected'&&!state.apiReady)flash('No API key set. Connected mode needs a NEW key and available API credits.',true);}));
}
async function start(){bind();setupFoodCatalog();$('dailyDate').value=today();$('dietDate').value=today();$('radiationTime').value=radiationDateNow();drawBody();try{const [me,crews,status]=await Promise.all([api('/api/me'),api('/api/crew'),api('/api/status')]);state.apiReady=status.ai_ready;state.crew=crews.crew;if(me.logged_in){state.me={user:me.user,admin:me.admin};state.target=me.user.astronaut_id;}updateAuth();renderCrew();renderLoginCrew();if(state.me)await loadProfile();}catch(e){flash(e.message,true);}goto('crew');}
start();
