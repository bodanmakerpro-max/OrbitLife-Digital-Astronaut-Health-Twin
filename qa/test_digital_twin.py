#!/usr/bin/env python3
"""Version 20 regression checks for private Digital Twin and mood survey."""
import datetime as dt
import http.cookiejar
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import urllib.error
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
passes=[]
def ok(name, condition):
    if not condition:raise AssertionError(name)
    passes.append(name)

with tempfile.TemporaryDirectory(prefix='orbitlife_twin_test_') as base:
    site=Path(base)/'app'
    shutil.copytree(ROOT,site,ignore=shutil.ignore_patterns('qa','*.sqlite3*','__pycache__','private_*','OrbitLife_API_Key.txt','DEMO_CREW_LOGINS.json','DEMO_CREW_LOGINS.txt','DEMO_LOGINS_PRIVATE.txt'))
    sys.path.insert(0,str(site))
    spec=importlib.util.spec_from_file_location('orbitlife_twin_server',site/'server.py')
    app=importlib.util.module_from_spec(spec);sys.modules[spec.name]=app;spec.loader.exec_module(app)
    app.setup_db()
    # Migration runs again without dropping previously stored content.
    app.setup_db()
    server=app.ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    baseurl=f'http://127.0.0.1:{server.server_port}'
    def req(path,method='GET',body=None,opener=None):
        data=json.dumps(body).encode() if body is not None else None
        r=urllib.request.Request(baseurl+path,data=data,method=method,headers={'Content-Type':'application/json'} if data else {})
        try:
            with (opener or urllib.request.build_opener()).open(r,timeout=8) as response:
                raw=response.read();return response.status,json.loads(raw) if 'json' in response.headers.get('Content-Type','') else raw
        except urllib.error.HTTPError as e:
            return e.code,json.loads(e.read())
    def auth(username,password):
        opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        status,data=req('/api/login','POST',{'username':username,'password':password},opener)
        ok(f'login {username}', status==200)
        return opener
    try:
        for static in ['/digital-twin.js','/digital-twin.css']:
            status,body=req(static)
            ok('static '+static,status==200 and len(body)>1000)
        status,body=req('/api/twin')
        ok('anonymous twin access blocked',status==401)
        status,body=req('/api/twin/mood','POST',{'responses':{}})
        ok('anonymous mood write blocked',status in (401,403))
        admin=auth('astro01','Bodan1');crew=auth('astro02','Alexandar2')
        status,body=req('/api/twin?astronaut_id=AST-002',opener=crew)
        ok('own twin available',status==200 and body['identity']['astronaut_id']=='AST-002')
        ok('baseline exists for seeded demo history',body['metrics']['sleep']['baseline'] is not None)
        ok('12 research risk topics present',len(body['risks'])==12)
        ok('wearables clearly labelled synthetic', 'synthetic' in (body['metrics']['wearable_stress']['source'] or ''))
        ok('no mood score before survey',body['metrics']['mood']['latest'] is None)
        ok('no invented bone density metric','bone_density' not in body['metrics'])
        ok('other crew twin blocked',req('/api/twin?astronaut_id=AST-001',opener=crew)[0]==403)
        ok('admin can read crew twin',req('/api/twin?astronaut_id=AST-002',opener=admin)[0]==200)
        quick={key:value for key,value in [('sleep_quality',2),('sleepiness',3),('unhappy',1),('mental_fatigue',4),('stress',3)]}
        good={'mode':'quick','date':dt.date.today().isoformat(),'responses':quick,'notes':'Mission shift was busy.'}
        status,res=req('/api/twin/mood','POST',good,crew)
        ok('quick survey saves',status==200 and res['index']==74)
        status,record=req('/api/twin',opener=crew)
        ok('saved mood persists in own twin',status==200 and record['mood_history'][0]['self_report_index']==74)
        ok('private survey note persists',record['mood_history'][0]['notes']=='Mission shift was busy.')
        ok('source count increments',record['sources']['mood']==1)
        ok('admin can review saved survey',req('/api/twin?astronaut_id=AST-002',opener=admin)[1]['sources']['mood']==1)
        # Required core questions, strict input type and range validation.
        for label,change in [
            ('missing answer',{'responses':{'sleep_quality':2}}),
            ('negative rating',{'responses':dict(quick,stress=-1)}),
            ('fractional rating',{'responses':dict(quick,stress=2.5)}),
            ('extra field',{'responses':dict(quick,rfid_uid=4)}),
            ('string rating',{'responses':dict(quick,stress='2')}),
            ('oversized note',{'notes':'x'*1000}),
            ('invalid time',{'sleep_start':'28:11'}),
            ('future date',{'date':'2030-01-01'}),
            ('wrong mode',{'mode':'official_NASA_AMS'}),
        ]:
            submitted=dict(good,**change)
            ok('invalid '+label,req('/api/twin/mood','POST',submitted,crew)[0]==400)
        extended_keys=list(app.twin.FIELDS)
        extended=dict(good, mode='extended', responses={k:(10 if k=='crew_conflict' else 4) for k in extended_keys})
        status,res=req('/api/twin/mood','POST',extended,crew)
        ok('14-question survey saves',status==200 and res['mode']=='extended')
        bad=dict(extended,responses=dict(extended['responses'],crew_conflict=6))
        ok('binary crew conflict validated',req('/api/twin/mood','POST',bad,crew)[0]==400)
        status,res=req('/api/twin/mood','POST',dict(good,astronaut_id='AST-001'),crew)
        ok('normal crew cannot submit another member mood',status==403)
        status,res=req('/api/twin/mood','POST',dict(good,astronaut_id='AST-002'),admin)
        ok('authorized commander may enter a crew demo survey',status==200)
        with app.sql() as db:
            original=db.execute('SELECT COUNT(*) FROM twin_mood WHERE user_id=(SELECT id FROM users WHERE astronaut_id=?)',('AST-002',)).fetchone()[0]
            app.setup_db()
            updated=db.execute('SELECT COUNT(*) FROM twin_mood WHERE user_id=(SELECT id FROM users WHERE astronaut_id=?)',('AST-002',)).fetchone()[0]
            ok(f'migration does not erase mood history ({original}, {updated})',original==updated==3)
        print('PASS:',len(passes),'Digital Twin checks.')
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
