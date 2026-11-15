/* OrbitLife 20.0 Personal Digital Twin. Uses existing authenticated local APIs. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const MOOD = [
    ['sleep_quality','Poor sleep quality','0 = excellent, 10 = poor',false],
    ['sleepiness','Feeling sleepy now','0 = awake, 10 = sleepy',false],
    ['unhappy','Low or unhappy mood','0 = happy, 10 = unhappy',false],
    ['mental_fatigue','Mental fatigue','0 = sharp, 10 = exhausted',false],
    ['stress','Feeling stressed','0 = calm, 10 = stressed',false],
    ['workload','High workload today','0 = very light, 10 = very high',false],
    ['sick','Feeling unwell','0 = healthy, 10 = unwell',false],
    ['physical_exhaustion','Physical exhaustion','0 = energetic, 10 = exhausted',false],
    ['tired','General tiredness','0 = fresh, 10 = tired',false],
    ['low_mood','Feeling down','0 = not at all, 10 = extremely',false],
    ['boredom','Feeling bored','0 = engaged, 10 = bored',false],
    ['loneliness','Feeling lonely','0 = connected, 10 = very lonely',false],
    ['monotony','Monotony of daily life','0 = varied, 10 = monotonous',false],
    ['crew_conflict','Crew conflict in the last week','Report only whether any conflict occurred',true]
  ];
  let current = null;
  let mode = 'quick';
  let answers = new Map();
  let fetchCounter = 0;
  const displayNum = value => value == null ? '—' : String(value);
  const api = async (path, options) => {
    const response = await fetch(path, Object.assign({credentials:'same-origin'}, options || {}));
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  };
  function showMessage(text, failed=false) {
    const el=byId('twinMessage');
    if (!el) return;
    el.textContent=text;
    el.classList.toggle('error', !!failed);
  }
  function todayLocal(){const d = new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10);}
  function setMode(next) {
    mode = next;
    answers = new Map();
    document.querySelectorAll('[data-twin-mode]').forEach(b=>{
      const chosen=b.dataset.twinMode===mode;
      b.classList.toggle('active',chosen);
      b.setAttribute('aria-pressed', String(chosen));
    });
    const items= mode==='quick' ? MOOD.slice(0,5) : MOOD;
    byId('twinQuestions').innerHTML = items.map(([key,label,help,binary],i) =>
      `<div class="twin-q"><div class="twin-q-head"><strong>${String(i+1).padStart(2,'0')} · ${safe(label)}</strong><span class="twin-q-value" id="twinQValue-${safe(key)}">Not answered</span></div>
        <small class="twin-q-help">${safe(help)}</small>
        ${binary?`<select data-mood-input="${safe(key)}" aria-label="${safe(label)}"><option value="">Choose an answer</option><option value="0">No crew conflict</option><option value="10">Yes, at least one</option></select>`:
        `<input data-mood-input="${safe(key)}" type="range" min="0" max="10" value="5" step="1" aria-label="${safe(label)}"><div class="twin-q-ticks"><span>0 · None</span><span>10 · Very high</span></div>`}</div>`).join('');
    byId('twinQuestions').querySelectorAll('[data-mood-input]').forEach(el=>{
      el.addEventListener('input',()=>updateAnswer(el));
      el.addEventListener('change',()=>updateAnswer(el));
    });
    updateProgress();
  }
  function updateAnswer(el){
    if(!el.value)answers.delete(el.dataset.moodInput);
    else answers.set(el.dataset.moodInput, Number(el.value));
    const marker=byId('twinQValue-'+el.dataset.moodInput);
    if (marker) {
      marker.textContent=answers.has(el.dataset.moodInput)? `${answers.get(el.dataset.moodInput)} / 10` : 'Not answered';
      marker.classList.toggle('touched',answers.has(el.dataset.moodInput));
    }
    updateProgress();
  }
  function updateProgress(){
    const count = mode==='quick'?5:14;
    const ready=answers.size===count;
    byId('twinMoodProgress').textContent=`${answers.size} of ${count} questions answered. Lower values mean fewer reported difficulties.`;
    byId('twinMoodSave').disabled=!ready;
  }
  function metricCard(id,m){
    const value=m.latest===null?'—':m.latest;
    const baseline=m.baseline===null?'Awaiting at least 3 earlier readings':`Own earlier median ${m.baseline} ${m.unit}`;
    return `<article class="twin-metric" title="${safe(m.note)}"><span class="twin-label">${safe(m.label)}</span>
      <div class="twin-value">${safe(value)} <small>${safe(m.unit)}</small></div>
      <div class="twin-baseline">${safe(baseline)}</div>
      <div class="twin-source-tag">${safe(m.source || 'No recorded source')}</div></article>`;
  }
  function drawChart(){
    const name=byId('twinChartMetric').value;
    const canvas=byId('twinChart'), caption=byId('twinChartCaption');
    const m=current?.metrics?.[name];
    if(!m || m.points.length<2){
      canvas.innerHTML='<div class="twin-chart-empty">Add at least two entries to see a trend. No readings are invented.</div>';
      caption.textContent='Personal timelines show only records that exist.';
      return;
    }
    const points=m.points, values=points.map(p=>p.value);
    let lo=Math.min(...values), hi=Math.max(...values);
    if (hi===lo){hi+=1;lo-=1;}
    else {const pad=(hi-lo)*.15;lo-=pad;hi+=pad;}
    const W=600,H=165,pad=23;
    const X=i=>pad+i*(W-pad*2)/(points.length-1);
    const Y=v=>H-pad-(v-lo)*(H-2*pad)/(hi-lo);
    const poly=points.map((p,i)=>`${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
    const last=points[points.length-1];
    canvas.innerHTML=`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
       <defs><linearGradient id="twinLineArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#40d7de" stop-opacity=".26"/><stop offset="100%" stop-color="#40d7de" stop-opacity="0"/></linearGradient></defs>
       <path d="M${pad} ${H-pad} H${W-pad}" stroke="#315263" fill="none" stroke-width="1"/>
       <path d="M${poly.replaceAll(' ', ' L')} L${X(points.length-1).toFixed(1)} ${H-pad} L${pad} ${H-pad} Z" fill="url(#twinLineArea)"/>
       <polyline points="${poly}" fill="none" stroke="#63e9f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
       <circle cx="${X(points.length-1)}" cy="${Y(last.value)}" r="4.5" fill="#d8ffff" stroke="#21b8cc" stroke-width="2"/>
       <text x="${pad}" y="11" fill="#91b6c8" font-size="10">${hi.toFixed(1)} ${safe(m.unit)}</text>
       <text x="${pad}" y="${H-5}" fill="#91b6c8" font-size="10">${safe(points[0].date.slice(5))}</text>
       <text x="${W-pad}" y="${H-5}" fill="#91b6c8" font-size="10" text-anchor="end">${safe(last.date.slice(5))}</text>
     </svg>`;
    canvas.setAttribute('aria-label',`${m.label}: ${points.length} observed points, latest ${last.value} ${m.unit} on ${last.date}`);
    caption.textContent=`${points.length} entries · latest ${last.value} ${m.unit} (${last.date}) · source: ${m.source || 'unspecified'}. No clinical threshold applied.`;
  }
  function renderTwin(data){
    current=data;
    byId('twinName').textContent = `${data.identity.name} · ${data.identity.astronaut_id}`;
    const order=['sleep','heart_rate','oxygen','activity','water','wearable_stress','mood'];
    byId('twinMetrics').innerHTML=order.map(key=>metricCard(key,data.metrics[key])).join('');
    const names={daily:'Daily logs',wearable:'Wearable days',mood:'Mood surveys',radiation:'Radiation reports',symptoms:'Symptom reports',diet:'Nutrition records',medications:'Medications',cortisol:'Cortisol reports'};
    byId('twinSources').innerHTML=Object.entries(names).map(([key,label])=>`<div class="twin-source"><span>${safe(label)}</span><b>${safe(data.sources[key]??0)}</b></div>`).join('');
    byId('twinObservations').innerHTML=data.observations.length?data.observations.map(item=>
      `<div class="twin-observation"><b>${safe(item.metric)}</b><span>${safe(item.text)}</span></div>`).join(''):
      '<p class="twin-note">More dated measurements are needed before a baseline can be shown.</p>';
    const moods=data.mood_history.slice(0,8);
    byId('twinMoodHistory').innerHTML=moods.length ? moods.map(row=>
      `<div class="twin-history-row"><div class="twin-history-value">${safe(row.self_report_index)}</div><div><b>${safe(row.mission_date)}</b><small>${safe(row.mode==='quick'?'5-question check-in':'14-question check-in')} · self-reported · /100</small></div></div>`).join(''):
      '<p class="twin-note">No saved survey yet. Try the 5-question check-in above.</p>';
    byId('twinRiskGrid').innerHTML=data.risks.map((r,i)=>
      `<article class="twin-risk"><b>${String(i+1).padStart(2,'0')} · ${safe(r.name)}</b><p>${safe(r.note)}</p><small>Related: ${safe(r.signals)}</small></article>`).join('');
    drawChart();
    showMessage('Digital Twin updated from your locally stored records. This is a research demo, not a medical diagnosis.');
  }
  async function refresh(){
    const request=++fetchCounter;
    if (typeof state==='undefined' || !state.me){
      current=null;
      showMessage('Sign in or scan your assigned RFID card to see the Digital Twin.',true);
      return;
    }
    const target=state.me.admin?(state.target||state.me.user.astronaut_id):state.me.user.astronaut_id;
    showMessage('Reading personal records…');
    try {
      const data=await api('/api/twin?astronaut_id='+encodeURIComponent(target));
      if(request!==fetchCounter) return;
      renderTwin(data);
    } catch(error){ if(request===fetchCounter)showMessage(error.message,true); }
  }
  async function submitMood(event){
    event.preventDefault();
    if (!current || !state.me) return showMessage('Sign in to save your check-in.',true);
    const count=mode==='quick'?5:14;
    if(answers.size!==count)return showMessage('Please answer all questions in the selected check-in.',true);
    const responses=Object.fromEntries(answers.entries());
    const target=state.me.admin?(state.target||state.me.user.astronaut_id):state.me.user.astronaut_id;
    const payload={astronaut_id:target,mode,date:byId('twinMoodDate').value,
      sleep_start:byId('twinSleepStart').value,sleep_end:byId('twinSleepEnd').value,
      notes:byId('twinMoodNotes').value,responses};
    const save=byId('twinMoodSave');save.disabled=true;
    try {
      const saved=await api('/api/twin/mood',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      setMode(mode);
      byId('twinMoodNotes').value='';
      showMessage(`Saved privately. Your experimental self-report comfort index is ${saved.index}/100. Not a medical diagnosis.`);
      await refresh();
      byId('twinMoodHistory').scrollIntoView({behavior:'smooth',block:'nearest'});
    } catch(error){showMessage(error.message,true);updateProgress();}
  }
  function init(){
    if(!byId('view-twin'))return;
    byId('twinMoodDate').value=todayLocal();
    byId('twinMoodForm').addEventListener('submit',submitMood);
    byId('twinRefresh').addEventListener('click',refresh);
    byId('twinChartMetric').addEventListener('change',drawChart);
    byId('twinJumpMood').addEventListener('click',()=>byId('twinMoodPanel').scrollIntoView({behavior:'smooth',block:'start'}));
    byId('twinAskAI').addEventListener('click',()=>{
      if(!current) return showMessage('Load the Digital Twin first.',true);
      const observations=current.observations.map(i=>i.text).join('; ');
      const mood=current.metrics.mood;
      const moodPart=mood.latest!==null?` Most recent unvalidated self-report comfort index: ${mood.latest}/100 on ${mood.as_of}.`:' No mood survey saved yet.';
      const msg=`For astronaut ${current.identity.astronaut_id}, discuss what to track next based only on these descriptive trends: ${observations || 'No baseline available yet'}.${moodPart} Explain data limitations and do not diagnose or prescribe treatment.`;
      if(typeof askQuestion==='function')askQuestion(msg);
      else if(typeof goto==='function')goto('assistant');
    });
    document.querySelectorAll('[data-twin-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.twinMode)));
    // The original app controls navigation. Watch only this section's active state
    // so entry from sidebar, welcome tools and quick actions all refresh data.
    let previous=false;
    const view=byId('view-twin');
    const observer=new MutationObserver(()=>{
      const now=view.classList.contains('active');
      if(now&&!previous)refresh();
      previous=now;
    });
    observer.observe(view,{attributes:true,attributeFilter:['class']});
    byId('adminTarget')?.addEventListener('change',()=>{
      if(view.classList.contains('active'))refresh();
    });
    setMode('quick');
    if(view.classList.contains('active'))refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
