#!/usr/bin/env python3
"""OrbitLife 19 isolated integration checks: synthetic accounts and temporary database only.
Run from any directory: py -3.13 qa/smoke_test.py
"""
import contextlib
import datetime as dt
import http.cookiejar
import importlib.util
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import threading
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PASS = []


def check(label, passed):
    if not passed:
        raise AssertionError(label)
    PASS.append(label)


def run():
    with tempfile.TemporaryDirectory(prefix='orbitlife_release_test_') as tmp:
        temp = Path(tmp) / 'site'
        shutil.copytree(ROOT, temp, ignore=shutil.ignore_patterns('qa','__pycache__','*.sqlite3*','DEMO_LOGINS_PRIVATE.txt','developer_settings.json','terminal_cards.json','uploaded_*','developer_backups'))
        sys.path.insert(0, str(temp))
        spec = importlib.util.spec_from_file_location('orbitlife_release_server', temp / 'server.py')
        app = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = app
        spec.loader.exec_module(app)
        app.setup_db()
        srv = app.ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        url = f'http://127.0.0.1:{srv.server_port}'
        thread = threading.Thread(target=srv.serve_forever, daemon=True)
        thread.start()
        def request(path, method='GET', body=None, opener=None, binary=None):
            opener = opener or urllib.request.build_opener()
            if binary is None:
                data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
                headers = {'Content-Type': 'application/json'} if body is not None else {}
            else:
                data = binary
                headers = {'Content-Type': 'image/png'}
            req = urllib.request.Request(url + path, data=data, headers=headers, method=method)
            try:
                with opener.open(req, timeout=10) as res:
                    payload=res.read()
                    content_type=res.headers.get('Content-Type','')
                    if 'application/json' in content_type:
                        return res.status,json.loads(payload)
                    return res.status,payload
            except urllib.error.HTTPError as err:
                payload=err.read()
                try: return err.code,json.loads(payload)
                except json.JSONDecodeError: return err.code,payload
        def login(username, password):
            jar = http.cookiejar.CookieJar()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
            status, data = request('/api/login','POST', {'username':username, 'password':password},opener)
            check(f'најава {username}',status==200 and data['user']['username']==username)
            return opener
        try:
            status, crew = request('/api/crew')
            check('8 профили и имиња',status==200 and len(crew['crew'])==8 and crew['crew'][0]['name']=='Bodan' and crew['crew'][2]['name']=='Petar')
            status, homepage = request('/')
            check('почетна страница',status==200 and b'OrbitLife' in homepage)
            for js in ['app.js','localization.js','launch-ui.js','alerts-ui.js','enhancements.js','terminal-ui.js','developer-ui.js','welcome-esp.js']:
                check('ресурс '+js, request('/'+js)[0]==200)
            status, alerts = request('/api/public-alerts')
            check('јавни известувања пред пријава',status==200 and alerts['count']==0)
            admin = login('astro01','Bodan1')
            officer = login('astro03','Petar3')
            normal = login('astro02','Alexandar2')
            for i in range(4,9):
                username=f'astro{i:02d}'
                passwords=['Timi4','Ana5','Emilija6','Mile7','Filip8']
                login(username,passwords[i-4])
            check('дополнителни привремени профили не постојат',request('/api/login','POST',{'username':'astro09','password':'Nikola9'})[0]==401)
            check('неправилна лозинка е одбиена',request('/api/login','POST',{'username':'astro01','password':'wrong'})[0]==401)
            check('непријавен корисник нема приватен профил',request('/api/profile')[0]==401)
            check('личен профил се отвора',request('/api/profile',opener=normal)[0]==200)
            check('туѓ профил е заштитен',request('/api/profile?astronaut_id=AST-003',opener=normal)[0]==403)
            check('администратор има дозволен пристап',request('/api/profile?astronaut_id=AST-002',opener=admin)[0]==200)
            check('картички за итна помош се достапни на екипажот',request('/api/emergency-card?astronaut_id=AST-003',opener=normal)[0]==200)
            card=request('/api/emergency-card?astronaut_id=AST-003',opener=normal)[1]['card']
            check('сценариото е јасно означено', card['source']=='scenario' and card['last_verified'] is None)
            check('нема право на медицинско потврдување',request('/api/emergency-verify','POST',{'astronaut_id':'AST-003','verified_allergies':'None known'},normal)[0]==403)
            check('кортизолот е ограничен',request('/api/cortisol?astronaut_id=AST-001',opener=normal)[0]==403)
            check('свој кортизол може да се гледа',request('/api/cortisol?astronaut_id=AST-002',opener=normal)[0]==200)
            now=(dt.datetime.now(dt.timezone.utc)-dt.timedelta(hours=3)).isoformat(timespec='seconds')
            cortisol={'astronaut_id':'AST-002','collected_at':now,'since_waking_min':50,'result':10.2,'units':'nmol/L','source':'lab','source_detail':'QA LAB-001','reference_low':3.0,'reference_high':20.0}
            check('медицински офицер внесува лабораториски резултат',request('/api/cortisol','POST',cortisol,officer)[0]==201)
            check('друг член не внесува кортизол',request('/api/cortisol','POST',cortisol,normal)[0]==403)
            prefs={'language':'mk','theme':'light','accent':'#13C8E7','status_text':'Сѐ е во ред','status_visible':True}
            check('кориснички поставки се зачувуваат',request('/api/personal-preferences','POST',prefs,normal)[0]==200)
            check('одбраниот јазик се зачувува',request('/api/me',opener=normal)[1]['user']['language']=='mk')
            q=request('/api/quick-ai','POST',{'question':'Здраво','mode':'offline','language':'mk'})[1]['answer']
            check('општ помошник на македонски', 'Здраво' in q)
            answer=request('/api/chat','POST',{'question':'Здраво','mode':'offline'},normal)
            check('личен помошник на избраниот јазик',answer[0]==200 and ('Здраво' in answer[1]['answer'] or 'мерењ' in answer[1]['answer']))
            incident={'astronaut_id':'AST-003','location':'Модул Кибо','description':'Пробен медицински настан','urgency':'high','photo_expected':True}
            code,created=request('/api/incidents','POST',incident,normal)
            check('нов итен настан е зачуван',code==201 and created['saved'] and created['photo_status']=='pending')
            inc=created['incident_id']
            alerts=request('/api/public-alerts')[1]
            check('итен настан се гледа на главниот екран',alerts['count']==1 and alerts['alerts'][0]['astronaut_name']=='Petar')
            check('јавниот приказ не открива медицински опис',all('description' not in x and 'location' not in x for x in alerts['alerts']))
            check('пријавувачот може повторно да ја отвори сопствената пријава',request('/api/incidents?astronaut_id=AST-003',opener=normal)[1]['incidents'][0]['id']==inc)
            third=login('astro04','Timi4')
            check('трето лице не ги гледа туѓите пријави',request('/api/incidents?astronaut_id=AST-003',opener=third)[1]['incidents']==[])
            check('пријавувачот гледа само пријави за себе или испратени од него',len(request('/api/incidents',opener=normal)[1]['incidents'])==1)
            full=request('/api/incidents?astronaut_id=AST-003',opener=officer)[1]
            check('медицински офицер ја гледа целата пријава',full['incidents'][0]['id']==inc and full['incidents'][0]['description']==incident['description'])
            # Produce a valid PNG image with standard-library chunks, no extra packages.
            import struct,zlib
            def png_chunk(kind,payload):
                return struct.pack('>I',len(payload))+kind+payload+struct.pack('>I',zlib.crc32(kind+payload)&0xffffffff)
            png=(b'\x89PNG\r\n\x1a\n'
                 +png_chunk(b'IHDR',struct.pack('>IIBBBBB',2,2,8,6,0,0,0))
                 +png_chunk(b'tEXt',b'Comment\x00OrbitLife release test image')
                 +png_chunk(b'IDAT',zlib.compress(b'\x00'+b'\x00\xB0\xF0\xFF'*2+b'\x00'+b'\x00\xB0\xF0\xFF'*2))
                 +png_chunk(b'IEND',b''))
            assert len(png)>100 and png.endswith(b'\xaeB`\x82')
            code,uploaded=request(f'/api/incident-photo/{inc}','POST',opener=normal,binary=png)
            check('слика се додава на веќе зачуван настан',code==200 and uploaded['photo_status']=='uploaded')
            check('друг член нема пристап до сликата',request(f'/api/incident-photo/{inc}',opener=third)[0]==403)
            check('репортерот може да ја прочита сликата',request(f'/api/incident-photo/{inc}',opener=normal)[0]==200)
            check('медицинскиот офицер го затвора настанот',request('/api/incident-status','POST',{'id':inc,'status':'resolved'},officer)[0]==200)
            check('разрешениот настан не стои како активен',request('/api/public-alerts')[1]['count']==0)
            today=dt.date.today().isoformat()
            mm=request('/api/public-menu?date='+today)
            check('денешното мени е јавно',mm[0]==200)
            check('осум активни профили и во исхраната',len(mm[1]['crew'])==8)
            report=request('/api/nutrition-report?date='+today,opener=normal)
            check('извештај за исхрана',report[0]==200 and len(report[1]['meals'])==4)
            n_before=report[1]['confirmed']['calories']
            payload={'date':today,'slot':'Breakfast','status':'eaten'}
            check('потврдување оброк',request('/api/meal-confirm','POST',payload,normal)[0]==200)
            request('/api/meal-confirm','POST',payload,normal)
            after=request('/api/nutrition-report?date='+today,opener=normal)[1]
            with app.sql() as sql_db:
                count=sql_db.execute("SELECT COUNT(*) FROM diet WHERE user_id=(SELECT id FROM users WHERE astronaut_id='AST-002') AND date=? AND notes LIKE 'Auto-generated confirmed intake%'",(today,)).fetchone()[0]
            check('повторна потврда не дуплира оброк',count==1 and after['confirmed']['calories']>n_before)
            check('мерења на дневен преглед',request('/api/daily','POST',{'date':today,'sleep':7.5,'hr':63,'spo2':98,'mass':69.3,'mass_method':'SLAMMD','water':2.1,'exercise':45,'temperature_c':36.8},normal)[0]==200)
            check('дневни записи може да се пребаруваат',request('/api/records-search?topic=daily&from='+today+'&to='+today,opener=normal)[1]['records']!=[])
            measured_at=(dt.datetime.now()-dt.timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M')
            rad={'measured_at':measured_at,'dose_msv':0.032,'rate_usvh':2.0,'source':'Manual dosimeter reading'}
            fake=dict(rad,source='Training / simulated data',dose_msv=99.0)
            check('внесување радијација',request('/api/radiation','POST',rad,normal)[0]==200)
            check('внесување симулирана радијација',request('/api/radiation','POST',fake,normal)[0]==200)
            dose=request('/api/profile',opener=normal)[1]['radiation']['dose_total_msv']
            check('симулација е исклучена од вистинска доза',abs(dose-0.032)<0.000001)
            check('само командирот ги отвора алатките за развој',request('/api/developer/status',opener=normal)[0]==403 and request('/api/developer/status',opener=admin)[0]==200)
            # USB display and touch controls are safe even without a connected board.
            check('синхронизација со OLED не бара најава',request('/api/terminal/control','POST',{'type':'screen','mode':'home'})[0]==200)
            check('невалидна OLED команда е одбиена',request('/api/terminal/control','POST',{'type':'screen','mode':'danger'})[1]['ok'] is False)
            check('USB режим без активна опрема не го блокира серверот',request('/api/developer/status',opener=admin)[0]==200)
            # The USB connection can be configured without signing in, from the Welcome Page.
            code,usb_status=request('/api/terminal/status')
            check('пред најава се гледа USB статус',code==200 and 'available_ports' in usb_status)
            code,result=request('/api/terminal/connect','POST',{'enabled':True,'port':'COM4'})
            check('врска со ESP32 се поставува пред најава',code==200 and result['settings']['serial_port']=='COM4')
            check('USB поставката е зачувана',request('/api/terminal/status')[1]['config']['serial_enabled'] is True)
            check('празна порта не се прифаќа',request('/api/terminal/connect','POST',{'enabled':True,'port':''})[0]==400)
            check('други поставки остануваат администраторски',request('/api/developer/settings','POST',{'settings':{'accent':'#ffffff'}})[0]==401)
            check('исклучување без најава',request('/api/terminal/connect','POST',{'enabled':False,'port':'COM4'})[0]==200)
            # An event ID without a physical paired card must never create a session.
            check('случаен RFID ID не најавува',request('/api/terminal/rfid-login','POST',{'event_id':999999})[0]==401)
            usb=app.usb_serial
            terminal=app.terminal
            usb.ingest('{"type":"card","uid":"AABBCC01"}')
            events=request('/api/terminal/events')[1]['events']
            check('непозната RFID картичка е одбиена',events[-1]['type']=='unknown-card')
            check('непозната RFID картичка не создава сесија',request('/api/terminal/rfid-login','POST',{'event_id':events[-1]['id']})[0]==401)
            # The existing admin pairing endpoint assigns a card to a specific crew member.
            paired=request('/api/terminal/pair','POST',{'astronaut_id':'AST-002'},admin)
            check('админ спарува картичка',paired[0]==200)
            usb._last_card_time=0  # bypass 3-second physical debouncing in isolated test
            usb.ingest('{"type":"card","uid":"AABBCC01"}')
            scanned=request('/api/terminal/events')[1]['events'][-1]
            check('спарена картичка дава времен RFID настан',scanned['type']=='card' and scanned['astronaut_id']=='AST-002' and scanned['auto_login'] is True)
            check('RFID настанот не содржи лозинка или UID', 'password' not in scanned and 'uid' not in scanned)
            rfid_cookie=http.cookiejar.CookieJar()
            rfid_client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(rfid_cookie))
            code,rfid_user=request('/api/terminal/rfid-login','POST',{'event_id':scanned['id']},rfid_client)
            check('RFID најавува точен астронаут',code==200 and rfid_user['user']['astronaut_id']=='AST-002')
            check('RFID сесија отвора личен здравствен профил',request('/api/profile',opener=rfid_client)[0]==200)
            check('RFID сесија не отвора туѓ профил',request('/api/profile?astronaut_id=AST-001',opener=rfid_client)[0]==403)
            check('еднократниот RFID настан не може повторно',request('/api/terminal/rfid-login','POST',{'event_id':scanned['id']})[0]==401)
            usb.ingest('{"type":"card","uid":"EEFF0011"}')
            check('неспарена втора картичка не најавува',request('/api/terminal/events')[1]['events'][-1]['type']=='unknown-card')
            # Legacy demo selection must never bypass authentication.
            usb.save_config({'demo_rfid_elias':True})
            usb._last_card_time=0
            usb.ingest('{"type":"card","uid":"EEFF0011"}')
            demo=request('/api/terminal/events')[1]['events'][-1]
            check('тестно избирање Bodan не е RFID најава',demo['type']=='card' and demo['auto_login'] is False)
            check('тестно избирање не отклучува медицински податоци',request('/api/terminal/rfid-login','POST',{'event_id':demo['id']})[0]==401)
            usb.save_config({'demo_rfid_elias':False})
            # Paired card mapping takes precedence even if legacy mode was enabled.
            terminal.pair('DDCCBBAA','AST-001')
            usb.ingest('{"type":"card","uid":"DDCCBBAA"}')
            command=request('/api/terminal/events')[1]['events'][-1]
            check('командирска картичка се врзува со Bodan',command['astronaut_id']=='AST-001' and command['auto_login'])
            code,_=request('/api/terminal/rfid-login','POST',{'event_id':command['id']},rfid_client)
            check('скенирање друга картичка го менува профилот',code==200 and request('/api/me',opener=rfid_client)[1]['user']['astronaut_id']=='AST-001')
            check('преостанатите RFID настани не се достапни преку повторно користење',request('/api/terminal/rfid-login','POST',{'event_id':command['id']})[0]==401)
            # An expired scan is invalid even if the browser has not claimed it.
            usb.ingest('{"type":"card","uid":"C0FFEE00"}')
            check('неспарени проби не даваат сесија',request('/api/terminal/events')[1]['events'][-1]['type']=='unknown-card')
            import time
            old=terminal.paired_card_scan('AST-002')
            with terminal.lock:
                astronaut,_=terminal._card_grants[old]
                terminal._card_grants[old]=(astronaut,time.monotonic()-terminal.CARD_GRANT_SECONDS-1)
            check('истечен RFID настан е одбиен',request('/api/terminal/rfid-login','POST',{'event_id':old})[0]==401)

            status, detail=request('/api/profile?astronaut_id=AST-002',opener=admin)
            check('профилот е ажуриран по внесените записи',status==200 and detail['daily'][0]['hr']==63)
            print(f'PASS: {len(PASS)} integrated checks. Temp database deleted after test.')
            return len(PASS)
        finally:
            srv.shutdown()
            srv.server_close()
            thread.join(timeout=3)

if __name__ == '__main__':
    try: run()
    except Exception as error:
        print('FAILED after',len(PASS),'checks:',type(error).__name__,str(error))
        raise
