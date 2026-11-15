"""Local administrator-only developer API. Never expose on a public network."""
import datetime as dt
import json
import sqlite3
from pathlib import Path
import usb_serial

# Deletion restricted to explicit record categories, never crew identities/credentials.
CATEGORIES={'daily':'daily','wearable':'wearable','radiation':'radiation',
            'symptoms':'symptoms','medications':'medications','nutrition':'diet',
            'cortisol':'cortisol','incidents':'incidents','food_illness':'food_illness_reports'}

def admin(user):
    return bool(user and user.get('is_admin'))

def list_records(db,category,astronaut,date):
    if category not in CATEGORIES:raise ValueError('Choose a supported record category.')
    row=db.execute('SELECT id FROM users WHERE astronaut_id=?',(astronaut,)).fetchone()
    if not row:raise ValueError('Unknown astronaut.')
    table=CATEGORIES[category]
    column='astronaut_id' if category=='incidents' else 'user_id'
    key=astronaut if category=='incidents' else row['id']
    datecol={'daily':'date','wearable':'date','radiation':'measured_at','symptoms':'created_at','nutrition':'date',
       'cortisol':'collected_at','incidents':'created_at','food_illness':'created_at','medications':'taken_date'}.get(category)
    clauses=[f'{column}=?'];params=[key]
    if date:
        try:dt.date.fromisoformat(date)
        except ValueError:raise ValueError('Invalid date.')
        if datecol:clauses.append(f'substr({datecol},1,10)=?');params.append(date)
        else:raise ValueError('Date filter unavailable for this category.')
    rows=db.execute(f'SELECT * FROM {table} WHERE '+ ' AND '.join(clauses)+' ORDER BY id DESC LIMIT 120',params).fetchall()
    # Show a small safe preview without exposing extra data by default.
    return [{'id':r['id'],'summary':(' / '.join(str(r[k])[:80] for k in r.keys() if k not in ('id','user_id','astronaut_id','photo_file','photo_status','device_id','notes','description','source_detail','instructions','entered_by','reported_by_name','reported_by','entered_at','created_at'))[:130])} for r in rows]

def delete_record(db,category,astronaut,record_id):
    if category not in CATEGORIES:raise ValueError('Invalid category.')
    if type(record_id) is not int or record_id<1:raise ValueError('Select a record.')
    row=db.execute('SELECT id FROM users WHERE astronaut_id=?',(astronaut,)).fetchone()
    if not row:raise ValueError('Unknown astronaut.')
    table=CATEGORIES[category]
    key=astronaut if category=='incidents' else row['id']
    column='astronaut_id' if category=='incidents' else 'user_id'
    found=db.execute(f'SELECT id FROM {table} WHERE id=? AND {column}=?',(record_id,key)).fetchone()
    if not found:raise ValueError('That record does not belong to this astronaut.')
    # Do not cascade into another astronaut's data. Avoid deleting identity, audit, or credentials.
    if category=='nutrition':
        db.execute('UPDATE meal_plans SET diet_log_id=NULL,status="planned",consumed_at="" WHERE diet_log_id=? AND user_id=?',(record_id,row['id']))
    db.execute(f'DELETE FROM {table} WHERE id=? AND {column}=?',(record_id,key))
    return {'ok':True,'removed':record_id,'category':category}
