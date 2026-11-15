"""OrbitLife shared menu, confirmed intake, and exposure review for fictional training crew.
Nutrient figures are illustrative food-entry estimates, NOT certified ISS food-label values.
Plans are proposed only; a consumption confirmation creates an actual diet log.
"""
import datetime as dt
import hashlib
import json
import math
from crew_profiles import CREW_BIOS

SLOTS=('Breakfast','Lunch','Dinner','Snack')
# name, category, energy(kcal), protein, carbs, fats (g), allergen tags, suitable slots
FOODS=[
 ('oatmeal','Oatmeal (rehydrated)','grain',240,8,42,5,(),('Breakfast',)),
 ('cereal','Whole-grain cereal','grain',210,6,43,2,(),('Breakfast',)),
 ('eggs','Scrambled eggs','protein',230,17,5,16,('egg',),('Breakfast',)),
 ('fruit_mix','Dried fruit mix','fruit',185,2,43,1,(),('Breakfast','Snack')),
 ('tortilla','Flour tortilla','grain',180,5,32,4,('wheat',),('Breakfast','Lunch','Dinner')),
 ('nuts','Mixed nuts','snack',235,7,8,21,('nuts','peanuts'),('Breakfast','Snack')),
 ('peanut','Peanut butter','snack',190,7,7,16,('peanuts','nuts'),('Breakfast','Snack')),
 ('granola','Granola bar','snack',210,5,29,8,('wheat',),('Breakfast','Snack')),
 ('orange','Fruit puree','fruit',120,1,29,0,(),('Breakfast','Snack')),
 ('milk','Shelf-stable milk beverage','drink',160,8,18,6,('dairy',),('Breakfast','Snack')),
 ('protein_drink','Protein drink','drink',180,22,15,4,('dairy',),('Breakfast','Snack')),
 ('coffee','Coffee (unsweetened)','drink',2,0,0,0,(),('Breakfast',)),
 ('chicken_rice','Chicken and rice','main',470,31,62,10,(),('Lunch','Dinner')),
 ('mac_cheese','Macaroni and cheese','main',490,19,64,17,('dairy','wheat'),('Lunch','Dinner')),
 ('beef_stew','Beef stew','main',450,31,42,17,(),('Lunch','Dinner')),
 ('turkey','Turkey with rice','main',480,35,57,11,(),('Lunch','Dinner')),
 ('couscous','Couscous with chickpeas','main',465,17,72,11,('wheat',),('Lunch','Dinner')),
 ('rice_beans','Rice and beans','main',455,18,76,8,(),('Lunch','Dinner')),
 ('vegetable_pasta','Vegetable pasta','main',445,15,76,9,('wheat',),('Lunch','Dinner')),
 ('tofu_rice','Tofu and rice','main',430,19,59,13,('soy',),('Lunch','Dinner')),
 ('salmon','Salmon with rice','main',480,33,47,17,('fish',),('Lunch','Dinner')),
 ('shrimp','Shrimp cocktail','protein',160,24,15,1,('shellfish',),('Lunch','Dinner')),
 ('chickpea','Vegetable chickpea soup','side',185,8,30,4,(),('Lunch','Dinner')),
 ('green_beans','Green beans','side',75,3,11,2,(),('Lunch','Dinner')),
 ('carrots','Carrots','side',85,2,18,0,(),('Lunch','Dinner')),
 ('rice','Rice portion','side',205,4,45,1,(),('Lunch','Dinner')),
 ('fruit','Dried apple slices','snack',140,1,35,0,(),('Snack',)),
 ('crackers','Wholegrain crackers','snack',175,5,29,4,('wheat',),('Snack',)),
 ('cookies','Space-style cookies','snack',220,3,31,9,('wheat','dairy'),('Snack',)),
 ('chocolate','Chocolate snack','snack',175,2,22,9,('dairy',),('Snack',)),
 ('energy','Energy bar','snack',255,9,36,9,('nuts','peanuts'),('Snack',)),
 ('juice','Juice beverage','drink',125,1,30,0,(),('Breakfast','Lunch','Snack')),
]
FOOD={x[0]:dict(code=x[0],name=x[1],category=x[2],calories=x[3],protein_g=x[4],carbs_g=x[5],fat_g=x[6],allergens=list(x[7]),slots=list(x[8])) for x in FOODS}


def setup(db):
    db.executescript('''
      CREATE TABLE IF NOT EXISTS meal_schedule(
        user_id INTEGER NOT NULL, day TEXT NOT NULL, workload TEXT NOT NULL DEFAULT 'normal',eva_hours REAL NOT NULL DEFAULT 0,
        note TEXT DEFAULT '', set_by TEXT DEFAULT 'OrbitLife schedule', PRIMARY KEY(user_id,day), FOREIGN KEY(user_id) REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS meal_plans(
        id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, day TEXT NOT NULL,slot TEXT NOT NULL,
        items_json TEXT NOT NULL, calories INTEGER NOT NULL, protein_g REAL NOT NULL,carbs_g REAL NOT NULL,fat_g REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned', consumed_at TEXT DEFAULT '', diet_log_id INTEGER,
        UNIQUE(user_id,day,slot), FOREIGN KEY(user_id) REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS food_holds(code TEXT PRIMARY KEY, reason TEXT NOT NULL, held_by TEXT NOT NULL,held_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS food_illness_reports(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL,
        onset TEXT NOT NULL, description TEXT NOT NULL, reported_by TEXT NOT NULL,created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id));
    ''')


def dateok(value):
    try: return dt.date.fromisoformat(str(value)).isoformat()
    except (ValueError,TypeError):raise ValueError('Select a valid YYYY-MM-DD date.')


def restrictions_for(user):
    s=' '.join(str(user[k] or '') for k in ('allergies','dietary_restrictions','food_pattern')).lower()
    avoided=set()
    for tag, keywords in [('peanuts',('peanut','nuts allergy')),('nuts',('tree nuts','nuts allergy')),
                         ('dairy',('milk protein','dairy-free','lactose','no dairy')),
                         ('fish',('fish-free','fish allergy')),('soy',('soy-free','soy allergy')),
                         ('shellfish',('shellfish','shrimp allergy'))]:
        if any(k in s for k in keywords):avoided.add(tag)
    vegetarian=any(k in s for k in ('vegetarian','plant-based','mostly plant'))
    return avoided, vegetarian


def available(db, row, slot):
    blocked={r['code'] for r in db.execute('SELECT code FROM food_holds')}
    avoids,veg=restrictions_for(row)
    values=[]
    for code,food in FOOD.items():
        if code in blocked or slot not in food['slots'] or any(x in avoids for x in food['allergens']):continue
        if veg and code in ('eggs','chicken_rice','beef_stew','turkey','salmon','shrimp'):continue
        values.append(food)
    return values


def randpick(items, seed):
    if not items:return None
    return items[int.from_bytes(hashlib.sha256(seed.encode()).digest()[:4], 'big')%len(items)]


def ensure_schedule(db,user,day):
    row=db.execute('SELECT * FROM meal_schedule WHERE user_id=? AND day=?',(user['id'],day)).fetchone()
    if row:return dict(row)
    # Fictional shift pattern to demonstrate individually planned nutrition.
    idx=int(user['astronaut_id'][-2:])-1
    offset=(dt.date.fromisoformat(day)-dt.date.today()).days
    heavy={(1,0),(4,0),(7,0),(0,1),(3,1),(7,1),(8,1)}
    workload='heavy' if (idx,offset) in heavy else ('light' if idx in (5,9) else 'normal')
    db.execute('INSERT OR IGNORE INTO meal_schedule(user_id,day,workload,eva_hours,note) VALUES(?,?,?,?,?)',
               (user['id'],day,workload,0,'Synthetic crew duty roster'))
    return dict(db.execute('SELECT * FROM meal_schedule WHERE user_id=? AND day=?',(user['id'],day)).fetchone())


def energy_target(user,sched):
    idx=max(0,min(9,int(user['astronaut_id'][-2:])-1))
    base=max(2050,min(3200,int(CREW_BIOS[idx]['calories'])))
    adjustment={'light':-150,'normal':0,'heavy':350,'eva':300}.get(sched['workload'],0)
    # NASA-STD-3001 V2 7004: additional 200 kcal per EVA hour, for demonstration.
    eva=round(max(0,min(12,float(sched['eva_hours'])))*200)
    return base+adjustment+eva


def plan_meal(db,user,sched,slot,target):
    day=sched['day'];seq=int(user['astronaut_id'][-2:]);ratio={'Breakfast':.25,'Lunch':.32,'Dinner':.32,'Snack':.11}[slot]
    desired=target*ratio
    choices=available(db,user,slot)
    mains=[f for f in choices if f['category']==('main' if slot in ('Lunch','Dinner') else ('grain' if slot=='Breakfast' else 'snack'))]
    if not mains:mains=choices
    seed=f'{day}|{seq}|{slot}|{sched["workload"]}'
    primary=randpick(mains,seed+'|primary')
    if not primary:raise ValueError('No meals available. Review food holds and restrictions.')
    items=[dict(code=primary['code'],servings=1.0)]
    sides=[f for f in choices if f['code']!=primary['code'] and f['category'] in ('side','fruit','protein','drink','snack')]
    if slot=='Snack':sides=[f for f in choices if f['code']!=primary['code']]
    second=randpick(sides,seed+'|second')
    if second:items.append(dict(code=second['code'],servings=1.0))
    # A 3rd non-duplicated food if the meal is far short of target.
    total=sum(FOOD[x['code']]['calories']*x['servings'] for x in items)
    if total < desired*.80:
        third=randpick([f for f in choices if f['code'] not in {x['code'] for x in items} and f['category'] in ('side','grain','fruit','protein','snack','drink')],seed+'|third')
        if third:items.append(dict(code=third['code'],servings=1.0))
    total=sum(FOOD[x['code']]['calories']*x['servings'] for x in items)
    if total:
        scale=max(.72,min(1.50,desired/total))
        for x in items:x['servings']=round(x['servings']*scale,2)
    return summarize(items)


def summarize(items):
    total={k:0. for k in ('calories','protein_g','carbs_g','fat_g')}
    enriched=[]
    for x in items:
        f=FOOD[x['code']];qty=float(x['servings'])
        enriched.append({'code':x['code'],'name':f['name'],'servings':qty,'allergens':f['allergens']})
        for k in total:total[k]+=f[k]*qty
    return (enriched,round(total['calories']),round(total['protein_g'],1),round(total['carbs_g'],1),round(total['fat_g'],1))


def generate(db,user,day,force=False):
    sched=ensure_schedule(db,user,day)
    target=energy_target(user,sched)
    for slot in SLOTS:
        existing=db.execute('SELECT * FROM meal_plans WHERE user_id=? AND day=? AND slot=?',(user['id'],day,slot)).fetchone()
        if existing and (not force or existing['status']!='planned'):continue
        items,k,p,c,f=plan_meal(db,user,sched,slot,target)
        if existing:
            db.execute('UPDATE meal_plans SET items_json=?,calories=?,protein_g=?,carbs_g=?,fat_g=? WHERE id=?',
                       (json.dumps(items),k,p,c,f,existing['id']))
        else:
            db.execute('INSERT OR IGNORE INTO meal_plans(user_id,day,slot,items_json,calories,protein_g,carbs_g,fat_g) VALUES(?,?,?,?,?,?,?,?)',
                       (user['id'],day,slot,json.dumps(items),k,p,c,f))
    return sched,target


def public_menu(db,day):
    dateok(day)
    users=db.execute('SELECT * FROM users WHERE active=1 ORDER BY id').fetchall()
    result=[]
    for user in users:
        schedule,target=generate(db,user,day)
        rows=db.execute('SELECT id,slot,items_json,calories,protein_g,carbs_g,fat_g,status FROM meal_plans WHERE user_id=? AND day=?',(user['id'],day)).fetchall()
        meals={r['slot']:{'id':r['id'],'items':json.loads(r['items_json']),'calories':r['calories'],
              'protein_g':r['protein_g'],'carbs_g':r['carbs_g'],'fat_g':r['fat_g'],
              'status':r['status']} for r in rows}
        planned={k:round(sum(m[k] for m in meals.values()),1) for k in ('calories','protein_g','carbs_g','fat_g')}
        result.append({'astronaut_id':user['astronaut_id'],'name':user['name'],'role':user['role'],
                       'avatar_url': '/portraits/'+user['astronaut_id']+'.webp',
                       'workload':schedule['workload'],'eva_hours':schedule['eva_hours'],'target_kcal':target,
                       'meals':meals,'planned_totals':planned})
    holds=[dict(x) for x in db.execute('SELECT code,reason FROM food_holds')]
    return {'date':day,'crew':result,'slots':SLOTS,'holds':holds,
            'source':'Illustrative mission menu using ISS-style foods; nutrient figures are approximations, not flight-food label values.',
            'actual_only_after_confirmation':True}


def meal_confirm(db,user_id,day,slot,status,actor):
    if status not in ('eaten','skipped'):raise ValueError('Meal status must be eaten or skipped.')
    rec=db.execute('SELECT * FROM meal_plans WHERE user_id=? AND day=? AND slot=?',(user_id,day,slot)).fetchone()
    if not rec:raise ValueError('Meal plan not found.')
    if rec['status']=='eaten' and rec['diet_log_id']:
        db.execute('DELETE FROM diet WHERE id=? AND user_id=?',(rec['diet_log_id'],user_id))
    if status=='eaten':
        items=json.loads(rec['items_json'])
        desc=', '.join(f"{r['name']} ×{r['servings']:g}" for r in items)
        note=(f"Auto-generated confirmed intake, {slot.lower()}: protein {rec['protein_g']} g, carbs {rec['carbs_g']} g, fats {rec['fat_g']} g; "
              f"estimated nutrients; confirmed by {actor}.")
        cur=db.execute('INSERT INTO diet(user_id,date,meals,calories,notes) VALUES(?,?,?,?,?)',
                       (user_id,day,desc,rec['calories'],note))
        dietid=cur.lastrowid
    else:dietid=None
    db.execute('UPDATE meal_plans SET status=?,consumed_at=?,diet_log_id=? WHERE id=?',
               (status,dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),dietid,rec['id']))
    return {'ok':True,'status':status,'diet_log_id':dietid}


def day_report(db,user_id,day):
    dateok(day)
    rows=db.execute('SELECT slot,items_json,calories,protein_g,carbs_g,fat_g,status FROM meal_plans WHERE user_id=? AND day=?',(user_id,day)).fetchall()
    reported=[]
    for r in rows:
        item=dict(r);item['items']=json.loads(item.pop('items_json'));reported.append(item)
    planned={k:round(sum(float(r[k]) for r in reported),1) for k in ('calories','protein_g','carbs_g','fat_g')}
    eaten={k:round(sum(float(r[k]) for r in reported if r['status']=='eaten'),1) for k in planned}
    manual=[dict(r) for r in db.execute("SELECT meals,calories,notes FROM diet WHERE user_id=? AND date=? AND notes NOT LIKE 'Auto-generated confirmed intake%'",(user_id,day))]
    return {'date':day,'meals':reported,'planned':planned,'confirmed':eaten,'manual_entries':manual,
      'note':'Macro totals cover confirmed planned meals only; manually entered foods without nutrition data are listed separately.'}


def exposure_review(db,start_day):
    start=dateok(start_day)
    cases=[dict(r) for r in db.execute('''SELECT x.id,u.astronaut_id,u.name,x.onset,x.description
       FROM food_illness_reports x JOIN users u ON u.id=x.user_id WHERE substr(x.onset,1,10)>=? ORDER BY x.onset DESC''',(start,))]
    exposures={};eaten_crew=set()
    for r in db.execute("""SELECT p.user_id,u.name,p.items_json FROM meal_plans p JOIN users u ON u.id=p.user_id
       WHERE p.day>=? AND p.status='eaten'""",(start,)):
        eaten_crew.add(r['user_id'])
        for item in json.loads(r['items_json']):
            exposures.setdefault(item['code'],set()).add(r['user_id'])
    sick={r['id'] for r in db.execute('SELECT user_id id FROM food_illness_reports WHERE substr(onset,1,10)>=?',(start,))}
    comparisons=[]
    for code,people in exposures.items():
        comparisons.append({'food_code':code,'name':FOOD[code]['name'],'reported_ill':len(people&sick),
                            'confirmed_consumers':len(people),'unaffected_consumers':len(people-sick)})
    comparisons.sort(key=lambda x:(-x['reported_ill'],-x['confirmed_consumers'],x['name']))
    return {'cases':cases,'foods':comparisons,'note':'Shared foods are investigation leads, not evidence of causation. Compare onset times and other exposures with medical staff.'}
