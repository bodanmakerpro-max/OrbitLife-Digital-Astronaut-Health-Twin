"""Local USB terminal event bus. No HTTP bridge, socket, Wi-Fi or device token."""
from __future__ import annotations
from collections import deque
from pathlib import Path
import json,re,threading,time

ROOT=Path(__file__).resolve().parent
CARDS_FILE=ROOT/'terminal_cards.json'
lock=threading.RLock()
events=deque(maxlen=200)
sequence=0
last_card=''
last_scan_at=0.0
selected_astronaut=''
# Only physical paired-card events from the local USB reader can create a login grant.
# Grants expire quickly, can be used once, and never contain an account password.
_card_grants={}
CARD_GRANT_SECONDS=15

def paired_card_scan(astronaut_id):
    if not re.fullmatch(r'AST-00[1-8]',astronaut_id):
        raise ValueError('Unknown crew card.')
    with lock:
        event_id=publish('card',astronaut_id=astronaut_id,auto_login=True)
        now=time.monotonic()
        for key,(_,when) in list(_card_grants.items()):
            if now-when>CARD_GRANT_SECONDS:del _card_grants[key]
        _card_grants[event_id]=(astronaut_id,now)
        return event_id

def claim_card_login(event_id):
    if type(event_id) is not int or event_id<1:return None
    with lock:
        grant=_card_grants.pop(event_id,None)
        if not grant:return None
        astronaut_id,seen=grant
        if time.monotonic()-seen>CARD_GRANT_SECONDS:return None
        return astronaut_id
allowed_views={'crew','menu','personal','daily','wearables','radiation','body',
               'medications','nutrition','assistant','emergency','crewprofile','records'}

def cards():
    try:
        obj=json.loads(CARDS_FILE.read_text(encoding='utf-8'))
        return obj if isinstance(obj,dict) else {}
    except (OSError,ValueError):return {}

def pair(uid,astronaut_id):
    if not re.fullmatch(r'[0-9A-F]{8,20}',uid):raise ValueError('Invalid RFID UID.')
    if not re.fullmatch(r'AST-00[1-8]',astronaut_id):raise ValueError('Invalid astronaut ID.')
    with lock:
        mapping=cards();mapping[uid]=astronaut_id
        tmp=CARDS_FILE.with_suffix('.tmp')
        tmp.write_text(json.dumps(mapping,indent=2)+'\n',encoding='utf-8')
        tmp.replace(CARDS_FILE)

def publish(kind,**props):
    global sequence
    with lock:
        sequence+=1
        events.append(dict(id=sequence,time=time.monotonic(),type=kind,**props))
        return sequence

def new_events(after=0):
    with lock:
        now=time.monotonic()
        return [{key:value for key,value in entry.items() if key!='time'} for entry in events
                if entry['id']>after and now-entry['time']<60]

# Same action identifiers are used by the OLED and touchscreen menu.
allowed_actions={'dashboard','food','login','crew','emergency','daily','radiation','body','nutrition','wearables','records','medications','assistant','back'}
