'use strict';
/* Shared public meal planning, personal intake confirmation and food safety review. */
(()=>{
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const day=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const next=()=>{let d=new Date(day()+'T12:00:00');d.setDate(d.getDate()+1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
let menu=null,selected='Breakfast',loadSeq=0,viewDay=day();
const kcal=n=>Math.round(Number(n||0)).toLocaleString();
const shortMacros=m=>`<span><b>${kcal(m.calories)}</b> kcal</span><span>${Math.round(m.protein_g||0)}g P</span><span>${Math.round(m.carbs_g||0)}g C</span><span>${Math.round(m.fat_g||0)}g F</span>`;
function mealContent(m){return (m.items||[]).map(f=>`<span class="ol-food-item">${esc(f.name)} <small>×${Number(f.servings).toFixed(1)}</small></span>`).join('');}
function crewCard(c){
 const all=selected==='All';
 const slots=all?['Breakfast','Lunch','Dinner','Snack']:[selected];
 const summary=slots.map(slot=>{
   const m=c.meals?.[slot];return m?`${all?slot+': ':''}${m.items.slice(0,2).map(i=>i.name).join(' + ')}${m.items.length>2?' + more':''}`:'';
 }).filter(Boolean).join(' · ');
 const allowed=!!state.me&&(state.me.admin||state.me.user.astronaut_id===c.astronaut_id);
 const contents=slots.map(slot=>{
   const m=c.meals?.[slot];if(!m)return '';
   const controls=!state.me?`<button class="button secondary" data-menu-login="${esc(c.astronaut_id)}" type="button">Sign in to confirm</button>`:
     allowed?(m.status==='eaten'?`<span class="ol-eaten-stamp">✓ Meal confirmed</span><button type="button" class="button secondary" data-menu-confirm="${esc(c.astronaut_id)}" data-menu-slot="${esc(slot)}" data-menu-status="skipped">Undo</button>`:
       `<button type="button" class="button primary" data-menu-confirm="${esc(c.astronaut_id)}" data-menu-slot="${esc(slot)}" data-menu-status="eaten">✓ I ate this</button><button type="button" class="button secondary" data-menu-confirm="${esc(c.astronaut_id)}" data-menu-slot="${esc(slot)}" data-menu-status="skipped">Didn't eat</button>`):`<small>Only this astronaut or the mission commander can confirm a meal.</small>`;
   return `<section class="ol-meal-detail"><div class="ol-meal-slot-label">${esc(slot)}</div>${mealContent(m)}<div class="ol-meal-macros">${shortMacros(m)}</div><div class="ol-meal-confirm-actions">${controls}</div></section>`;
 }).join('');
 return `<details class="ol-menu-card" data-astro="${esc(c.astronaut_id)}"><summary class="ol-meal-summary"><img src="${esc(c.avatar_url)}" alt="" loading="lazy"><div class="ol-meal-primary"><strong>${esc(c.name)}</strong><small>${esc(summary||'No meal assigned')}</small></div><span class="ol-meal-expand" aria-hidden="true">⌄</span></summary><div class="ol-meal-extra">${contents}<div class="ol-menu-total">Planned daily energy: <b>${kcal(c.planned_totals?.calories)} kcal</b> · workload: ${esc(c.workload)}</div></div></details>`;
}
function renderPublic(){if(!menu)return;
 $('olMenuOverview').innerHTML=`<span><strong>${esc(menu.date)}</strong></span><span>· ${menu.crew.length} crew members</span><span>· Select an astronaut to expand</span>`;
 $('olMenuGrid').innerHTML=menu.crew.map(crewCard).join('');
 $('olMenuTabs').querySelectorAll('[data-slot]').forEach(b=>{const active=b.dataset.slot===selected;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active));});
 if(state.me)updateWorkloadVisibility();
}
async function loadMenu(date=viewDay){
 const seq=++loadSeq;
 viewDay=date;$('olMenuDate').value=viewDay;
 $('olMenuGrid').innerHTML='<p class="ol-menu-loading">Loading the mission menu…</p>';
 try{const nextMenu=await api('/api/public-menu?date='+encodeURIComponent(date));if(seq===loadSeq){menu=nextMenu;renderPublic();}}
 catch(e){$('olMenuGrid').textContent='Unable to load menu: '+e.message;}
 finally{}
}
function updateWorkloadVisibility(){
 const manager=state.me?.user?.astronaut_id==='AST-001'||state.me?.user?.astronaut_id==='AST-003';
 $('olWorkloadPanel')?.classList.toggle('hidden',!manager);
 $('olFoodInvestigation')?.classList.toggle('hidden',!manager);
 const crew=$('olWorkloadCrew');if(!crew)return;
 const before=crew.value;
 crew.innerHTML=(menu?.crew||state.crew||[]).map(c=>`<option value="${esc(c.astronaut_id)}">${esc(c.name)}</option>`).join('');
 if(before&&[...crew.options].some(x=>x.value===before))crew.value=before;
}
function dayOfNutrition(){return $('olNutritionDay')?.value||day();}
async function showNutrition(){
 if(!state.me||!state.profile)return;
 const query=new URLSearchParams({date:dayOfNutrition(),astronaut_id:state.target||state.me.user.astronaut_id});
 try{
 const d=await api('/api/nutrition-report?'+query.toString());
 document.querySelectorAll('.ol-nutrition-report-note').forEach(n=>n.remove());
 $('olNutritionStats').innerHTML=[['Scheduled kcal',kcal(d.planned.calories)],['Confirmed kcal',kcal(d.confirmed.calories)],['Protein consumed',Math.round(d.confirmed.protein_g)+' g'],['Carbs / fat',Math.round(d.confirmed.carbs_g)+' / '+Math.round(d.confirmed.fat_g)+' g']].map(([label,value])=>`<div class="ol-macro-stat"><small>${label}</small><strong>${value}</strong></div>`).join('');
 $('olNutritionMeals').innerHTML=d.meals.map(m=>`<article class="ol-nutrition-meal"><h3>${esc(m.slot)} <span class="flag ${m.status==='eaten'?'':'muted'}">${m.status==='eaten'?'EATEN':m.status==='skipped'?'SKIPPED':'PLANNED'}</span></h3>${mealContent(m)}<div class="ol-meal-macros">${shortMacros(m)}</div><div class="ol-nutrition-meal-actions">${m.status==='eaten'?'<span class="ol-eaten-stamp">✓ Confirmed eaten</span>':`<button type="button" class="button primary" data-confirm-slot="${esc(m.slot)}" data-meal-status="eaten">✓ I ate this</button>`}<button type="button" class="button secondary" data-confirm-slot="${esc(m.slot)}" data-meal-status="skipped">${m.status==='eaten'?'Undo confirmation':'Not eaten'}</button></div></article>`).join('')||'<p>No meal plan for this date yet. Open Today’s Menu on the homepage.</p>';
 if(d.manual_entries.length){const note=document.createElement('p');note.className='ol-nutrition-report-note';note.textContent=`${d.manual_entries.length} extra manual record(s) are also in your food log. Macros are not inferred from free-text entries.`;$('olNutritionMeals').after(note);}
 }catch(e){$('olNutritionMeals').textContent='Unable to load nutrition report: '+e.message;}
}
async function confirmMeal(slot,status){
 try{
 const body={date:dayOfNutrition(),slot,status};if(state.me.admin)body.astronaut_id=state.target;
 await api('/api/meal-confirm','POST',body);
 await showNutrition();await loadMenu(viewDay);
 // Refresh the existing diet list without destroying form inputs.
 if(typeof loadProfile==='function')await loadProfile(state.target);
 if(typeof flash==='function')flash(status==='eaten'?'Meal confirmed and added to the diet log.':'Meal marked as not eaten.');
 }catch(e){flash(e.message,true);}
}
async function menuConfirmClick(e){
 const signin=e.target.closest('[data-menu-login]');
 if(signin){const id=signin.dataset.menuLogin;window.orbitAfterLogin={view:'menu',astronaut_id:id};if(typeof selectLoginMember==='function')selectLoginMember(id);$('loginModal').classList.remove('hidden');return;}
 const btn=e.target.closest('[data-menu-confirm]');if(!btn)return;
 if(!state.me){$('loginModal').classList.remove('hidden');return;}
 const id=btn.dataset.menuConfirm,slot=btn.dataset.menuSlot,status=btn.dataset.menuStatus;
 if(!state.me.admin && state.me.user.astronaut_id!==id){flash('Sign in as this astronaut to confirm a meal.',true);return;}
 btn.disabled=true;
 try{
   const payload={date:viewDay,slot,status};if(state.me.admin)payload.astronaut_id=id;
   await api('/api/meal-confirm','POST',payload);
   await loadMenu(viewDay);
   if(state.target===id){await showNutrition();if(typeof loadProfile==='function')await loadProfile(id);}
   flash(status==='eaten'?'Meal confirmed and included in your nutrition report.':'Meal marked as not eaten.');
 }catch(err){btn.disabled=false;flash(err.message,true);}
}
function chatLine(message,me=false){
 const thread=$('olHomeAIThread'); if(!thread) return;
 const el=document.createElement('div');el.className='ol-chat-line'+(me?' ol-from-user':'');el.textContent=message;thread.append(el);thread.scrollTop=thread.scrollHeight;
}
async function askHomeAI(event){
 event.preventDefault();const field=$('olHomeAIQuestion');if(!field)return;const q=field.value.trim();if(!q)return;
 chatLine(q,true);field.value='';$('olHomeAISubmit').disabled=true;
 try{
 const lang=$('olHomeAILanguage').value;
 const result=await api('/api/quick-ai','POST',{question:q,mode:$('olHomeAIMode').value,language:lang});
 chatLine(result.answer);
 }catch(e){chatLine('Could not answer: '+e.message);}
 finally{$('olHomeAISubmit').disabled=false;field.focus();}
}
async function updateWorkload(event){
 event.preventDefault();
 const body={astronaut_id:$('olWorkloadCrew').value,date:$('olWorkloadDate').value,workload:$('olWorkloadValue').value,eva_hours:Number($('olEvaHours').value||0),note:$('olWorkloadNote').value};
 try{await api('/api/meal-workload','POST',body);await loadMenu(body.date);flash('Mission meal plan updated for '+body.date+'.');if(state.me)await showNutrition();}
 catch(e){flash(e.message,true);}
}
async function reportIllness(event){
 event.preventDefault();
 try{
 const body={onset:new Date($('olFoodOnset').value).toISOString(),description:$('olFoodIllnessText').value};
 if(state.me.admin)body.astronaut_id=state.target;
 await api('/api/food-illness','POST',body);$('olFoodIllnessText').value='';flash('Suspected food-related symptoms recorded for medical review.');
 if(state.me.user.astronaut_id==='AST-001'||state.me.user.astronaut_id==='AST-003')await loadFoodReview();
 }catch(e){flash(e.message,true);}
}
async function loadFoodReview(){
 try{const r=await api('/api/food-review');
 $('olFoodReviewResults').innerHTML=`<p class="fine">${r.cases.length} recent illness report(s). A common food is not proof of the cause.</p>`+r.foods.slice(0,15).map(f=>`<div class="ol-review-row"><b>${esc(f.name)}</b><small>${f.reported_ill} with symptoms / ${f.confirmed_consumers} confirmed consumers</small></div>`).join('');
 const held=new Set(menu?.holds.map(h=>h.code)||[]);
 $('olHoldFood').innerHTML=r.foods.filter(f=>!held.has(f.food_code)).map(f=>`<option value="${esc(f.food_code)}">${esc(f.name)}</option>`).join('');
 }catch(e){$('olFoodReviewResults').textContent=e.message;}
}
async function holdFood(event){
 event.preventDefault();
 try{await api('/api/food-hold','POST',{code:$('olHoldFood').value,reason:$('olHoldReason').value});
 $('olHoldReason').value='';await loadMenu(viewDay);await loadFoodReview();flash('Food held from new meal plans pending review.');}
 catch(e){flash(e.message,true);}
}
function initialize(){
 $('olMenuDate').value=day();$('olNutritionDay').value=day();$('olWorkloadDate').value=next();$('olFoodOnset').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 $('olMenuGrid').addEventListener('click',menuConfirmClick);
 $('olMenuTabs').addEventListener('click',e=>{const btn=e.target.closest('[data-slot]');if(!btn)return;selected=btn.dataset.slot;renderPublic();});
 $('olMenuDate').addEventListener('change',e=>loadMenu(e.target.value));$('olMenuToday').addEventListener('click',()=>loadMenu(day()));$('olMenuTomorrow').addEventListener('click',()=>loadMenu(next()));
 $('olHomeAIForm')?.addEventListener('submit',askHomeAI);
 $('olNutritionRefresh').addEventListener('click',showNutrition);$('olNutritionDay').addEventListener('change',showNutrition);
 $('olNutritionMeals').addEventListener('click',e=>{const b=e.target.closest('[data-confirm-slot]');if(b)confirmMeal(b.dataset.confirmSlot,b.dataset.mealStatus);});
 $('olWorkloadForm').addEventListener('submit',updateWorkload);$('olFoodIllnessForm').addEventListener('submit',reportIllness);
 $('olRefreshFoodReview').addEventListener('click',loadFoodReview);$('olFoodHoldForm').addEventListener('submit',holdFood);
 const oldGoto=goto;
 goto=function(view){oldGoto(view);if(view==='nutrition')setTimeout(showNutrition,40);};
 const oldAuth=updateAuth;
 updateAuth=function(...args){let result=oldAuth(...args);updateWorkloadVisibility();if(state.me&&$('olHomeAILanguage')){const val=state.me.user.language;$('olHomeAILanguage').value=['en','mk','fr','ru'].includes(val)?val:'en';}return result;};
 // loadProfile gets called when switching administrator-selected profiles. Refresh report if displayed.
 const oldProfile=loadProfile;
 loadProfile=async function(...args){const result=await oldProfile(...args);if(state.view==='nutrition')await showNutrition();return result;};
 loadMenu(day());
}
document.addEventListener('DOMContentLoaded',initialize,{once:true});
})();
