"""USB-only serial link for the OrbitLife RC522 + encoder terminal.
Paired physical RFID scans can authorize one-time sessions in this local DEMO.
No Wi-Fi or LAN listener.
"""
from __future__ import annotations
import json, re, threading, time
from pathlib import Path
import orbit_terminal_bridge as terminal

ROOT=Path(__file__).resolve().parent
SETTINGS=ROOT/'developer_settings.json'
DEFAULT={'accent':'#20c6d8','radius':14,'density':'comfortable','serial_port':'','serial_enabled':False,'demo_rfid_elias':False}
lock=threading.RLock()
state={'connected':False,'port':'','message':'Serial disabled','last_event':'','last_seen':'','received':0}
_worker=None
_stop=threading.Event()
_write_lock=threading.RLock()
_current_port=None
_last_uid=''
_last_card_time=0
_CREW_NAMES={'AST-001':'Bodan','AST-002':'Alexandar','AST-003':'Petar','AST-004':'Timi',
             'AST-005':'Ana','AST-006':'Emilija','AST-007':'Mile','AST-008':'Filip'}

def config():
    try:
        saved=json.loads(SETTINGS.read_text(encoding='utf-8'))
        return {**DEFAULT, **{k:saved[k] for k in DEFAULT if k in saved}}
    except (OSError,ValueError,TypeError):return dict(DEFAULT)

def save_config(data):
    cfg=config()
    for k in DEFAULT:
        if k in data:cfg[k]=data[k]
    if not re.fullmatch(r'#[0-9a-fA-F]{6}',str(cfg['accent'])):raise ValueError('Accent must be a 6 digit hex color.')
    if type(cfg['radius']) is not int or not (6<=cfg['radius']<=26):raise ValueError('Corner radius must be 6–26.')
    if cfg['density'] not in ('comfortable','compact'):raise ValueError('Invalid density.')
    if type(cfg['serial_enabled']) is not bool:raise ValueError('Invalid serial setting.')
    if type(cfg['demo_rfid_elias']) is not bool:raise ValueError('Invalid demo RFID setting.')
    port=str(cfg['serial_port']).strip()
    if len(port)>100 or not re.fullmatch(r'(?:COM\d{1,3}|/dev/[\w./-]{1,80}|)',port,re.I) or '..' in port:
        raise ValueError('Enter a COM port such as COM4, or a serial device path.')
    cfg['serial_port']=port
    temp=SETTINGS.with_suffix('.tmp')
    temp.write_text(json.dumps(cfg,indent=2)+'\n',encoding='utf-8')
    temp.replace(SETTINGS)
    return cfg

def ports():
    try:
        from serial.tools import list_ports
        return [{'device':p.device,'description':p.description[:140]} for p in list_ports.comports()]
    except ImportError:return []

def status():
    with lock:return {**state, 'available_ports':ports(),'pyserial_installed':_pyserial_installed(), 'config':config()}

def _pyserial_installed():
    try:import serial;return True
    except ImportError:return False

def ingest(line):
    """Accept short JSON events from the microcontroller, never medical data."""
    global _last_uid,_last_card_time
    if len(line)>256:return
    try:event=json.loads(line)
    except (ValueError,TypeError):return
    if not isinstance(event,dict):return
    kind=event.get('type')
    if kind=='card':
        uid=str(event.get('uid','')).upper().strip()
        if not re.fullmatch('[0-9A-F]{8,20}',uid):return
        with lock:
            if uid==_last_uid and time.monotonic()-_last_card_time<3:return
            _last_uid,_last_card_time=uid,time.monotonic()
            with terminal.lock:
                terminal.last_card=uid
                terminal.last_scan_at=time.monotonic()
                mapped=terminal.cards().get(uid)
                if mapped not in {f'AST-{i:03d}' for i in range(1,9)}:mapped=None
                # A real paired card always takes priority. The optional legacy
                # Bodan demo selection never issues a login grant.
                demo_selection=not mapped and config().get('demo_rfid_elias',False)
                astronaut=mapped or ('AST-001' if demo_selection else None)
                terminal.selected_astronaut=astronaut or ''
            if mapped:
                send_control({'type':'identity','name':_CREW_NAMES.get(mapped,'Astronaut')})
                terminal.paired_card_scan(mapped)
            elif demo_selection:
                terminal.publish('card',astronaut_id='AST-001',demo_selection=True,auto_login=False)
            else:terminal.publish('unknown-card')
    elif kind=='rotate':
        delta=event.get('delta')
        if type(delta) is not int or delta not in (-1,1):return
        terminal.publish('rotate',delta=delta)
    elif kind in ('press','back','logout'):
        terminal.publish(kind)
    elif kind=='action':
        action=event.get('action')
        if action not in terminal.allowed_actions:return
        terminal.publish('action',action=action)
    elif kind=='navigate':
        view=event.get('view')
        if view not in terminal.allowed_views:return
        terminal.publish('navigate',view=view,astronaut_id=terminal.selected_astronaut)
    elif kind not in ('hello','heartbeat'):return
    with lock:
        state['last_event']=str(kind)
        state['last_seen']=time.strftime('%H:%M:%S')
        state['received']+=1

def send_control(command):
    """Write a bounded command to the physical OLED over the existing USB link."""
    if not isinstance(command,dict):return False
    kind=command.get('type')
    if kind=='screen':
        if command.get('mode') not in ('home','card','browse'):return False
        payload={'type':'screen','mode':command['mode']}
    elif kind=='identity':
        value=command.get('name')
        if not isinstance(value,str) or not 1<=len(value)<=24 or not re.fullmatch(r'[A-Za-z ]+',value):return False
        payload={'type':'identity','name':value}
    elif kind=='select':
        index=command.get('index')
        if type(index) is not int or not 0<=index<=15:return False
        payload={'type':'select','index':index}
    elif kind=='language':
        value=command.get('value')
        if value not in ('mk','en','fr','ru'):return False
        payload={'type':'language','value':value}
    elif kind=='clock':
        value=command.get('value')
        if not isinstance(value,str) or not re.fullmatch(r'(?:[01]\d|2[0-3]):[0-5]\d',value):return False
        payload={'type':'clock','value':value}
    else:return False
    wire=(json.dumps(payload,separators=(',',':'),ensure_ascii=False)+'\n').encode('utf-8')
    with _write_lock:
        if _current_port is None:return False
        try:_current_port.write(wire);return True
        except Exception:return False

def _run():
    global _current_port
    try:import serial
    except ImportError:
        with lock:state['message']='Install pyserial: py -3.13 -m pip install pyserial'
        return
    while not _stop.is_set():
        cfg=config()
        if not cfg['serial_enabled'] or not cfg['serial_port']:
            with lock:state.update(connected=False,port='',message='Serial disabled. Choose a COM port in Developer Tools.')
            _stop.wait(.8);continue
        try:
            with serial.Serial(cfg['serial_port'],115200,timeout=.25,write_timeout=.5) as port:
                with _write_lock:_current_port=port
                with lock:state.update(connected=True,port=cfg['serial_port'],message='USB serial connected')
                # Opening COM usually resets ESP32, so give it time to boot.
                start=time.monotonic()
                while not _stop.is_set():
                    active=config()
                    if not active['serial_enabled'] or active['serial_port']!=cfg['serial_port']:break
                    raw=port.readline()
                    if raw:
                        line=raw.decode('utf-8','replace').strip()
                        ingest(line)
        except (OSError,serial.SerialException) as exc:
            with lock:state.update(connected=False,port=cfg['serial_port'],message=f'COM port unavailable: {str(exc)[:100]}')
            _stop.wait(1.5)
        finally:
            with _write_lock:_current_port=None
            with lock:state['connected']=False

def start():
    global _worker
    if _worker and _worker.is_alive():return
    _stop.clear()
    _worker=threading.Thread(target=_run,name='OrbitLifeUSBSerial',daemon=True)
    _worker.start()

def stop():
    _stop.set()
    if _worker:_worker.join(timeout=1.2)
