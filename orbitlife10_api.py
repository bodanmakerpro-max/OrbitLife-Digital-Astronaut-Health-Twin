"""PulseDeck 10 add-on APIs: medical emergency cards, incidents, personal settings, cortisol.
Local educational mission prototype. Medical verification is explicit and separate from personal notes.
"""
import datetime as dt
import hmac
import os
from pathlib import Path
import re
import secrets
import sqlite3

BASE = Path(__file__).resolve().parent
INCIDENT_DIR = BASE / 'private_incident_photos'
AVATAR_DIR = BASE / 'crew_avatars'
IMAGE_LIMIT = 5 * 1024 * 1024
ALLOWED_THEMES = ('light','dark','system')
ALLOWED_LANGS = ('en','mk','fr','ru')
ALLOWED_ACCENTS = ('#13C8E7','#31C48D','#A78BFA','#F59E0B','#F87171','#60A5FA','#E879F9','#14B8A6')


def utcnow(): return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def medical(user): return bool(user and (user['is_admin'] or user['astronaut_id']=='AST-003'))
def clean(x,maxlength=500):return str(x or '').strip()[:maxlength]
def avatar_url(row):
    value=row['avatar_file'] if 'avatar_file' in row.keys() else ''
    return '/avatars/'+value if value else '/portraits/'+row['astronaut_id']+'.webp'
def valid_astro(s):return bool(re.fullmatch(r'AST-0(?:0[1-9]|10)', str(s)))
def user_for(db, astronaut_id):
    if not valid_astro(astronaut_id):return None
    return db.execute('SELECT * FROM users WHERE astronaut_id=? AND active=1',(astronaut_id,)).fetchone()


def setup_features(db):
    columns={r['name'] for r in db.execute('PRAGMA table_info(users)')}
    extras=[('language',"TEXT DEFAULT 'en'"),('theme',"TEXT DEFAULT 'system'"),('accent',"TEXT DEFAULT '#13C8E7'"),
            ('status_text',"TEXT DEFAULT ''"),('status_visible','INTEGER DEFAULT 1'),('avatar_file',"TEXT DEFAULT ''"),
            ('verified_allergies',"TEXT DEFAULT ''"),('verified_conditions',"TEXT DEFAULT ''"),
            ('verified_medications',"TEXT DEFAULT ''"),('approved_emergency_instructions',"TEXT DEFAULT ''"),
            ('crew_medical_contact',"TEXT DEFAULT ''"),('emergency_verified_at',"TEXT DEFAULT ''"),
            ('emergency_verified_by',"TEXT DEFAULT ''")]
    for field,typ in extras:
        if field not in columns:db.execute(f'ALTER TABLE users ADD COLUMN {field} {typ}')
    db.executescript('''
       CREATE TABLE IF NOT EXISTS incidents (
          id INTEGER PRIMARY KEY AUTOINCREMENT, astronaut_id TEXT NOT NULL, reported_by INTEGER NOT NULL,
          reported_by_name TEXT NOT NULL, created_at TEXT NOT NULL, location TEXT NOT NULL,
          description TEXT NOT NULL, urgency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
          photo_status TEXT NOT NULL DEFAULT 'none', photo_file TEXT DEFAULT '', photo_added_at TEXT DEFAULT '',
          closed_at TEXT DEFAULT '', closed_by TEXT DEFAULT '',
          FOREIGN KEY(reported_by) REFERENCES users(id));
       CREATE INDEX IF NOT EXISTS incident_lookup ON incidents(astronaut_id,created_at);
       CREATE TABLE IF NOT EXISTS cortisol (
          id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, collected_at TEXT NOT NULL,
          since_waking_min INTEGER, result REAL NOT NULL, units TEXT NOT NULL,
          source TEXT NOT NULL, source_detail TEXT DEFAULT '', reference_low REAL,reference_high REAL,
          simulated INTEGER NOT NULL DEFAULT 0, entered_by TEXT NOT NULL, entered_at TEXT NOT NULL,
          device_id TEXT DEFAULT '', FOREIGN KEY(user_id) REFERENCES users(id));
       CREATE INDEX IF NOT EXISTS cortisol_lookup ON cortisol(user_id,collected_at);
    ''')


def seed_cortisol(db):
    """Illustrative three-point records are marked simulated; no clinical reference ranges."""
    if db.execute('SELECT COUNT(*) FROM cortisol').fetchone()[0]:return
    users=db.execute('SELECT id,astronaut_id FROM users WHERE active=1').fetchall()
    if not users:return
    for i,u in enumerate(users):
        for days in (12,7,2):
            timestamp=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=days)).replace(hour=7+(i%2),minute=15,second=0,microsecond=0).isoformat(timespec='seconds')
            db.execute('''INSERT INTO cortisol(user_id,collected_at,since_waking_min,result,units,source,source_detail,simulated,entered_by,entered_at)
              VALUES(?,?,?,?,?,?,?,?,?,?)''',(u['id'],timestamp,45+(i%3)*15,round(9.1+i*.27+(12-days)*.14,2),
                'nmol/L','simulation','Synthetic example, not a laboratory result',1,'PulseDeck demo generator',utcnow()))


def format_card(db, row):
    scenario=(row['emergency_verified_by'] or '').startswith('FICTIONAL SCENARIO')
    verified=bool(row['emergency_verified_at']) and not scenario
    def approved(field):
        val=clean(row[field],1200) if (verified or scenario) else ''
        return val if val else 'Unknown'
    return {'astronaut_id':row['astronaut_id'],'name':row['name'],'role':row['role'],
            'avatar_url':avatar_url(row),'critical':bool(row['critical_flag']),
            'allergies':approved('verified_allergies'),'conditions':approved('verified_conditions'),
            'medications':approved('verified_medications'),
            'instructions':approved('approved_emergency_instructions'),
            'medical_contact':approved('crew_medical_contact'),
            'source':'scenario' if scenario else 'verified' if verified else 'missing',
            'last_verified':row['emergency_verified_at'] if verified else None,
            'scenario_updated':row['emergency_verified_at'] if scenario else None,
            'verified_by':row['emergency_verified_by'] or None}


def incident_record(row):
    d=dict(row)
    d['has_photo']=bool(d.pop('photo_file',''))
    d['photo_url']=f'/api/incident-photo/{d["id"]}' if d['has_photo'] else None
    return d


def get(handler,db,user,path,query):
    if path.startswith('/avatars/'):
        name=path[len('/avatars/'):]
        if not re.fullmatch(r'AST-00[1-8]\.(?:png|jpg|webp)',name):return handler.send(404,{'error':'Not found'}),True
        file=AVATAR_DIR/name
        return send_image(handler,file,'avatar'),True
    if path.startswith('/api/incident-photo/'):
        if not user:return handler.send(401,{'error':'Sign in first.'}),True
        try:inc_id=int(path.rsplit('/',1)[-1])
        except ValueError:return handler.send(404,{'error':'Not found'}),True
        row=db.execute('SELECT photo_file, astronaut_id, reported_by FROM incidents WHERE id=?',(inc_id,)).fetchone()
        if not row:return handler.send(404,{'error':'No photo'}),True
        # The crew-wide board contains only redacted alerts. Incident photos remain private.
        if not (medical(user) or user['id']==row['reported_by'] or user['astronaut_id']==row['astronaut_id']):
            return handler.send(403,{'error':'Incident photo access is restricted.'}),True
        if not row['photo_file']:return handler.send(404,{'error':'No photo'}),True
        name=row['photo_file']
        if not re.fullmatch(r'[0-9a-f]{32}\.(?:jpg|png|webp)',name):return handler.send(404,{'error':'Not found'}),True
        return send_image(handler,INCIDENT_DIR/name,'incident'),True
    if path not in ('/api/emergency-card','/api/incidents','/api/personal-preferences','/api/cortisol'):
        return None,False
    if not user:return handler.send(401,{'error':'Sign in first.'}),True
    if path=='/api/personal-preferences':
        return handler.send(200,{'preferences':pref(user)}),True
    params={k:v[0] for k,v in query.items()}
    if path=='/api/emergency-card':
        target=user_for(db,params.get('astronaut_id',''))
        if not target:return handler.send(404,{'error':'Astronaut not found.'}),True
        return handler.send(200,{'card':format_card(db,target),'medical_editor':medical(user)}),True
    if path=='/api/incidents':
        aid=params.get('astronaut_id','')
        if aid and not user_for(db,aid):return handler.send(404,{'error':'Astronaut not found.'}),True
        # Full reports are accessible to the affected crew member, the original
        # reporter (who may need to retry a failed photo), and medical staff.
        if medical(user):
            where=' WHERE astronaut_id=?' if aid else ''
            args=(aid,) if aid else ()
        else:
            where=' WHERE (astronaut_id=? OR reported_by=?)'
            args=(user['astronaut_id'],user['id'])
            if aid:
                where+=' AND astronaut_id=?'
                args+=(aid,)
        stmt='SELECT * FROM incidents'+where+' ORDER BY CASE WHEN status="active" THEN 0 ELSE 1 END, id DESC LIMIT 100'
        result=[incident_record(r) for r in db.execute(stmt,args).fetchall()]
        return handler.send(200,{'incidents':result}),True
    if path=='/api/cortisol':
        target=user_for(db,params.get('astronaut_id',user['astronaut_id']))
        if not target:return handler.send(404,{'error':'Astronaut not found.'}),True
        if not (medical(user) or target['id']==user['id']):return handler.send(403,{'error':'This cortisol record is restricted.'}),True
        records=[dict(x) for x in db.execute('''SELECT id,collected_at,since_waking_min,result,units,source,source_detail,
            reference_low,reference_high,simulated,entered_by,entered_at,device_id FROM cortisol WHERE user_id=?
            ORDER BY collected_at DESC LIMIT 120''',(target['id'],)).fetchall()]
        return handler.send(200,{'astronaut_id':target['astronaut_id'],'records':records,'medical_editor':medical(user)}),True
    return None,False


def pref(user):
    return {'language':user['language'] or 'en','theme':user['theme'] or 'system','accent':user['accent'] or '#13C8E7',
            'status_text':user['status_text'] or '', 'status_visible':bool(user['status_visible']),
            'avatar_url':avatar_url(user)}


def to_float(data,name,lo,hi,required=False):
    raw=data.get(name)
    if raw in ('',None):
        if required:raise ValueError('Enter '+name.replace('_',' '))
        return None
    try:num=float(raw)
    except (ValueError,TypeError):raise ValueError('Invalid '+name.replace('_',' '))
    if not (lo<=num<=hi):raise ValueError(name+' is outside the supported range')
    return num


def validate_cortisol(data,source):
    units=clean(data.get('units'),30)
    if units not in ('nmol/L','µg/dL','ug/dL'):raise ValueError('Choose cortisol units.')
    date=clean(data.get('collected_at'),40)
    try: timestamp=dt.datetime.fromisoformat(date.replace('Z','+00:00'))
    except ValueError:raise ValueError('Enter a valid collection date and time.')
    if timestamp.tzinfo is None:raise ValueError('Collection time needs a time zone offset.')
    if timestamp > dt.datetime.now(dt.timezone.utc)+dt.timedelta(minutes=15):raise ValueError('Collection time cannot be in the future.')
    if timestamp < dt.datetime(2000,1,1,tzinfo=dt.timezone.utc):raise ValueError('Collection time is too old.')
    since_waking=to_float(data,'since_waking_min',0,1440)
    result=to_float(data,'result',0,100000,required=True)
    if result==0:raise ValueError('Result must be above zero.')
    low=to_float(data,'reference_low',0,100000)
    high=to_float(data,'reference_high',0,100000)
    if (low is None)!=(high is None):raise ValueError('Include both ends of the lab range, or neither.')
    if low is not None and high<=low:raise ValueError('Reference maximum must be greater than minimum.')
    detail=clean(data.get('source_detail'),300)
    if source=='lab' and not detail:raise ValueError('Enter the laboratory or report identifier.')
    return (timestamp.isoformat(timespec='seconds'),int(since_waking) if since_waking is not None else None,
            result,units,source,detail,low,high)


def add_cortisol(db, target, data, source, entered_by, device_id=''):
    fields=validate_cortisol(data,source)
    db.execute('''INSERT INTO cortisol (user_id,collected_at,since_waking_min,result,units,source,source_detail,
      reference_low,reference_high,simulated,entered_by,entered_at,device_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
      (target['id'],*fields,1 if source=='simulation' else 0,entered_by,utcnow(),device_id))


def post(handler,db,user,path,data):
    if path not in ('/api/personal-preferences','/api/emergency-verify','/api/incidents',
                    '/api/incident-status','/api/cortisol','/api/cortisol/device'):
        return None,False
    if path=='/api/cortisol/device':
        secret=os.environ.get('ORBITLIFE_CORTISOL_DEVICE_TOKEN','')
        supplied=handler.headers.get('X-PulseDeck-Device-Key','')
        if len(secret)<24 or not hmac.compare_digest(supplied,secret):return handler.send(403,{'error':'Validated device connector is not configured or unauthorized.'}),True
        device=clean(data.get('device_id'),100)
        if not device:return handler.send(400,{'error':'Validated device ID is required.'}),True
        target=user_for(db,data.get('astronaut_id',''))
        if not target:return handler.send(404,{'error':'Astronaut not found.'}),True
        try:add_cortisol(db,target,data,'device','Trusted device import',device)
        except ValueError as e:return handler.send(400,{'error':str(e)}),True
        return handler.send(201,{'saved':True}),True
    if not user:return handler.send(401,{'error':'Sign in first.'}),True
    if path=='/api/personal-preferences':
        language=clean(data.get('language','en'),10);theme=clean(data.get('theme','system'),10)
        accent=clean(data.get('accent','#13C8E7'),10)
        if language not in ALLOWED_LANGS or theme not in ALLOWED_THEMES or accent not in ALLOWED_ACCENTS:
            return handler.send(400,{'error':'Invalid language, theme or accent.'}),True
        status=clean(data.get('status_text'),140);visible=1 if data.get('status_visible') in (True,'true','1',1,'on') else 0
        db.execute('''UPDATE users SET language=?,theme=?,accent=?,status_text=?,status_visible=? WHERE id=?''',
            (language,theme,accent,status,visible,user['id']))
        return handler.send(200,{'saved':True,'preferences':{'language':language,'theme':theme,'accent':accent,'status_text':status,'status_visible':bool(visible)}}),True
    if path=='/api/emergency-verify':
        if not medical(user):return handler.send(403,{'error':'Only authorized medical staff can verify emergency details.'}),True
        target=user_for(db,data.get('astronaut_id',''))
        if not target:return handler.send(404,{'error':'Astronaut not found.'}),True
        fields=['verified_allergies','verified_conditions','verified_medications','approved_emergency_instructions','crew_medical_contact']
        vals=[clean(data.get(k),1000 if k=='approved_emergency_instructions' else 600) for k in fields]
        if not any(vals):return handler.send(400,{'error':'Enter a verified detail or explicitly mark None known.'}),True
        db.execute('''UPDATE users SET verified_allergies=?,verified_conditions=?,verified_medications=?,
          approved_emergency_instructions=?,crew_medical_contact=?, emergency_verified_at=?,emergency_verified_by=? WHERE id=?''',
          (*vals,utcnow(),user['name'],target['id']))
        return handler.send(200,{'saved':True,'card':format_card(db,db.execute('SELECT * FROM users WHERE id=?',(target['id'],)).fetchone())}),True
    if path=='/api/incidents':
        aid=clean(data.get('astronaut_id'),12);target=user_for(db,aid)
        if not target:return handler.send(404,{'error':'Choose an astronaut.'}),True
        location=clean(data.get('location'),130);description=clean(data.get('description'),1200)
        urgency=clean(data.get('urgency'),15)
        if not location or not description:return handler.send(400,{'error':'Enter a location and short description.'}),True
        if urgency not in ('low','moderate','high','critical'):return handler.send(400,{'error':'Choose an urgency.'}),True
        image_pending=bool(data.get('photo_expected'))
        cur=db.execute('''INSERT INTO incidents (astronaut_id,reported_by,reported_by_name,created_at,location,description,urgency,photo_status)
          VALUES (?,?,?,?,?,?,?,?)''',(aid,user['id'],user['name'],utcnow(),location,description,urgency,
          'pending' if image_pending else 'none'))
        return handler.send(201,{'saved':True,'incident_id':cur.lastrowid,'photo_status':'pending' if image_pending else 'none'}),True
    if path=='/api/incident-status':
        if not medical(user):return handler.send(403,{'error':'Medical staff permission required.'}),True
        try: incident_id=int(data.get('id'))
        except (ValueError,TypeError):return handler.send(400,{'error':'Invalid incident ID.'}),True
        status=clean(data.get('status'))
        if status not in ('active','resolved'):return handler.send(400,{'error':'Invalid incident status.'}),True
        result=db.execute('''UPDATE incidents SET status=?, closed_at=?, closed_by=? WHERE id=?''',
          (status,utcnow() if status=='resolved' else '',user['name'] if status=='resolved' else '',incident_id))
        return handler.send(200 if result.rowcount else 404,{'saved':bool(result.rowcount)}),True
    if path=='/api/cortisol':
        if not medical(user):return handler.send(403,{'error':'Only authorized medical users can enter cortisol results.'}),True
        target=user_for(db,data.get('astronaut_id',''))
        if not target:return handler.send(404,{'error':'Astronaut not found.'}),True
        source=data.get('source','lab')
        if source not in ('lab','simulation'):return handler.send(400,{'error':'Device results must use the authenticated device connector.'}),True
        try:add_cortisol(db,target,data,source,user['name'])
        except ValueError as e:return handler.send(400,{'error':str(e)}),True
        return handler.send(201,{'saved':True}),True
    return None,False


def sniff_image(data):
    if data[:3]==b'\xff\xd8\xff':return 'jpg','image/jpeg'
    if data[:8]==b'\x89PNG\r\n\x1a\n':return 'png','image/png'
    if data[:4]==b'RIFF' and data[8:12]==b'WEBP':return 'webp','image/webp'
    return None,None

def send_image(handler,path,category):
    try: content=path.read_bytes()
    except OSError:return handler.send(404,{'error':'Image missing.'})
    ext=path.suffix.lstrip('.')
    mime={'jpg':'image/jpeg','png':'image/png','webp':'image/webp'}.get(ext,'application/octet-stream')
    handler.send_response(200)
    handler.send_header('Content-Type',mime)
    handler.send_header('Content-Length',str(len(content)))
    handler.send_header('Cache-Control','no-store' if category=='incident' else 'private, max-age=600')
    handler.send_header('X-Content-Type-Options','nosniff')
    handler.send_header('Content-Security-Policy',"default-src 'none'; sandbox")
    handler.end_headers();handler.wfile.write(content)


def binary(handler,path,db,user):
    if path != '/api/profile-avatar' and not path.startswith('/api/incident-photo/'):
        return False
    if not user:return handler.send(401,{'error':'Sign in first.'}) or True
    try:length=int(handler.headers.get('Content-Length','0'))
    except ValueError:length=0
    if length<100 or length>IMAGE_LIMIT:return handler.send(413,{'error':'Upload must be an image smaller than 5 MB.'}) or True
    data=handler.rfile.read(length)
    ext,mime=sniff_image(data)
    if not ext:return handler.send(400,{'error':'Upload a JPEG, PNG or WebP image.'}) or True
    if path=='/api/profile-avatar':
        AVATAR_DIR.mkdir(exist_ok=True)
        name=f"{user['astronaut_id']}.{ext}"
        temp=AVATAR_DIR/(name+'.tmp')
        temp.write_bytes(data);os.replace(temp,AVATAR_DIR/name)
        for suffix in ('jpg','png','webp'):
            if suffix!=ext:(AVATAR_DIR/f"{user['astronaut_id']}.{suffix}").unlink(missing_ok=True)
        db.execute('UPDATE users SET avatar_file=? WHERE id=?',(name,user['id']))
        db.commit()
        return handler.send(200,{'saved':True,'avatar_url':'/avatars/'+name+'?v='+secrets.token_hex(4)}) or True
    try:inc_id=int(path.rsplit('/',1)[-1])
    except ValueError:return handler.send(404,{'error':'Incident not found.'}) or True
    incident=db.execute('SELECT * FROM incidents WHERE id=?',(inc_id,)).fetchone()
    if not incident:return handler.send(404,{'error':'Incident not found.'}) or True
    if user['id']!=incident['reported_by'] and not medical(user):return handler.send(403,{'error':'Only the reporter or medical crew may attach this photo.'}) or True
    INCIDENT_DIR.mkdir(exist_ok=True)
    name=secrets.token_hex(16)+'.'+ext
    temp=INCIDENT_DIR/(name+'.tmp')
    temp.write_bytes(data);os.replace(temp,INCIDENT_DIR/name)
    previous=incident['photo_file']
    db.execute("UPDATE incidents SET photo_file=?,photo_status='uploaded',photo_added_at=? WHERE id=?",(name,utcnow(),inc_id))
    db.commit()
    if previous and re.fullmatch(r'[0-9a-f]{32}\.(?:jpg|png|webp)',previous):(INCIDENT_DIR/previous).unlink(missing_ok=True)
    return handler.send(200,{'saved':True,'photo_status':'uploaded','photo_url':'/api/incident-photo/'+str(inc_id)}) or True
