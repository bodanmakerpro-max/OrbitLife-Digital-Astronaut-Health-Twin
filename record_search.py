"""Read-only, account-scoped combined medical history search for PulseDeck."""
import datetime as dt

TOPICS=('all','daily','wearable','radiation','symptoms','medications','nutrition','cortisol','incidents')

def search(db, user_id, astronaut_id, topic='all', date_from='', date_to='', allow_cortisol=False):
    if topic not in TOPICS:raise ValueError('Unknown record type.')
    for s in (date_from,date_to):
        if s:
            try:dt.date.fromisoformat(s)
            except ValueError:raise ValueError('Dates must be YYYY-MM-DD.')
    if date_from and date_to and date_from>date_to:raise ValueError('Start date must be before end date.')
    items=[]
    def add(category, table, datecol, columns, where='user_id=?', ident=None):
        if topic not in ('all',category):return
        if category=='cortisol' and not allow_cortisol:return
        sql=f'SELECT {",".join(columns)} FROM {table} WHERE {where}'
        args=[astronaut_id] if ident=='astro' else [user_id]
        if date_from:sql+=f' AND substr({datecol},1,10)>=?';args.append(date_from)
        if date_to:sql+=f' AND substr({datecol},1,10)<=?';args.append(date_to)
        sql+=f' ORDER BY {datecol} DESC LIMIT 150'
        for row in db.execute(sql,args):
            data=dict(row);when=str(data.pop('record_date','') or '')
            title=data.pop('title',category.capitalize())
            # The returned values are labels only, not unfiltered private internal fields.
            fields={k:v for k,v in data.items() if v is not None and str(v).strip()}
            items.append({'topic':category,'date':when,'title':str(title),'fields':fields})
    add('daily','daily','date',['date AS record_date','sleep','hr','systolic','diastolic','spo2','mass','exercise','water','stress','fatigue','mood','temperature_c','glucose_mgdl','notes'])
    add('wearable','wearable','date',['date AS record_date','source','resting_hr','sleep_hours','steps','stress_score','body_battery','active_minutes','spo2'])
    add('radiation','radiation','measured_at',['measured_at AS record_date','dose_msv','rate_usvh','source','location','notes'])
    add('symptoms','symptoms','created_at',['created_at AS record_date','region AS title','severity','onset','notes'])
    add('medications','medications','taken_date',['taken_date AS record_date','name AS title','schedule','instructions'])
    add('nutrition','diet','date',['date AS record_date','meals AS title','calories','notes'])
    add('cortisol','cortisol','collected_at',['collected_at AS record_date','result','units','since_waking_min','source','simulated'])
    add('incidents','incidents','created_at',['created_at AS record_date','location AS title','description','urgency','status','reported_by_name'],where='astronaut_id=?',ident='astro')
    items.sort(key=lambda row:row['date'],reverse=True)
    return {'records':items[:250],'total':len(items),'topic':topic,'astronaut_id':astronaut_id}
