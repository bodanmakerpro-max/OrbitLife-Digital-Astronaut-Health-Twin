"""OrbitLife Digital Twin v20: transparent, educational trends and AMS-inspired check-ins.

No clinical scores, diagnoses, predictive risk estimates or approved NASA AMS-SD/LD
weights are claimed. Data stays in the user's local SQLite store.
"""
import datetime as dt
import json
import statistics

# We use original wording and ideas, not claim to implement NASA's weighted AMS score.
# Every value is a user-reported *difficulty* on a 0 (none) to 10 (maximum) scale.
QUESTIONS = [
    ('sleep_quality', 'Poor sleep quality', '0 = excellent · 10 = very poor', 'quick'),
    ('sleepiness', 'Feeling sleepy now', '0 = fully awake · 10 = extremely sleepy', 'quick'),
    ('unhappy', 'Low or unhappy mood', '0 = happy · 10 = very unhappy', 'quick'),
    ('mental_fatigue', 'Mental fatigue', '0 = mentally sharp · 10 = mentally exhausted', 'quick'),
    ('stress', 'Feeling stressed', '0 = calm · 10 = very stressed', 'quick'),
    ('workload', 'High workload today', '0 = very light · 10 = very high', 'extended'),
    ('sick', 'Feeling unwell', '0 = healthy · 10 = very unwell', 'extended'),
    ('physical_exhaustion', 'Physical exhaustion', '0 = energetic · 10 = exhausted', 'extended'),
    ('tired', 'General tiredness', '0 = fresh · 10 = tired', 'extended'),
    ('low_mood', 'Feeling down', '0 = not at all · 10 = extremely', 'extended'),
    ('boredom', 'Feeling bored', '0 = engaged · 10 = very bored', 'extended'),
    ('loneliness', 'Feeling lonely', '0 = connected · 10 = very lonely', 'extended'),
    ('monotony', 'Monotony of daily life', '0 = varied · 10 = very monotonous', 'extended'),
    ('crew_conflict', 'Crew conflict in the last week', '0 = none · 10 = present', 'extended'),
]
FIELDS = tuple(q[0] for q in QUESTIONS)
CORE = tuple(q[0] for q in QUESTIONS if q[3] == 'quick')
RISK_LIBRARY = [
    {'name':'Immune system changes', 'signals':'Symptoms, self-reported wellbeing, stress', 'note':'Some spaceflight stressors can alter immune response.'},
    {'name':'Sensorimotor and vestibular changes', 'signals':'Dizziness and balance symptoms', 'note':'Changes in gravity can affect balance and orientation.'},
    {'name':'Cardiovascular adaptation', 'signals':'Heart rate, blood pressure, exercise history', 'note':'Track trends without treating this overview as a diagnosis.'},
    {'name':'Decompression sickness', 'signals':'Spacewalk context and symptoms', 'note':'Potentially urgent. Follow trained mission emergency procedures.'},
    {'name':'Microorganism and infection risks', 'signals':'Symptoms, temperature and medical reports', 'note':'The app has no direct microbiome measurement.'},
    {'name':'Hypoxia', 'signals':'SpO2 and reported breathing symptoms', 'note':'The app is not an emergency oxygen monitor.'},
    {'name':'Nutrition deficiencies', 'signals':'Meals, calories, water, nutrition notes', 'note':'Nutrient adequacy requires validated nutritional assessment.'},
    {'name':'Spacewalk exposure', 'signals':'EVA events, symptoms, environmental reports', 'note':'No suit gas or pressure sensors are connected by default.'},
    {'name':'Reduced physical fitness', 'signals':'Exercise and wearable activity trends', 'note':'Activity is not a measure of fitness on its own.'},
    {'name':'Urinary and reproductive health', 'signals':'Symptoms and private medical notes', 'note':'No dedicated automatic monitoring is claimed.'},
    {'name':'Radiation exposure', 'signals':'Dosimeter entries and cumulative dose', 'note':'Only imported or entered readings are displayed.'},
    {'name':'Bone-density loss', 'signals':'Exercise and externally provided bone measurements', 'note':'OrbitLife cannot infer bone density or fractures from these inputs.'},
]


def setup(db):
    db.executescript('''
      CREATE TABLE IF NOT EXISTS twin_mood (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recorded_at TEXT NOT NULL,
        mission_date TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('quick','extended')),
        responses_json TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        sleep_start TEXT DEFAULT '', sleep_end TEXT DEFAULT '',
        self_report_index REAL NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      CREATE INDEX IF NOT EXISTS idx_twin_mood_user_time ON twin_mood(user_id,recorded_at);
    ''')


def validate_mood(data):
    if not isinstance(data, dict):
        raise ValueError('Invalid mood check-in.')
    mode = data.get('mode', 'quick')
    if mode not in ('quick', 'extended'):
        raise ValueError('Choose Quick or Detailed check-in.')
    raw = data.get('responses')
    if not isinstance(raw, dict) or set(raw) - set(FIELDS):
        raise ValueError('Unexpected mood responses.')
    mandatory = set(FIELDS if mode == 'extended' else CORE)
    if set(raw) != mandatory:
        raise ValueError('Complete all questions in the selected check-in.')
    answers = {}
    for key, value in raw.items():
        if isinstance(value, bool) or not isinstance(value, (int, float)) or int(value) != value or not 0 <= value <= 10:
            raise ValueError('Responses must be whole numbers from 0 to 10.')
        if key == 'crew_conflict' and value not in (0, 10):
            raise ValueError('Crew conflict is a Yes/No response.')
        answers[key] = int(value)
    note = data.get('notes', '')
    if not isinstance(note, str) or len(note) > 800:
        raise ValueError('Notes must be 800 characters or fewer.')
    times = []
    for field in ('sleep_start', 'sleep_end'):
        value = data.get(field, '')
        if not isinstance(value, str) or (value and (len(value) != 5 or value[2] != ':')):
            raise ValueError('Enter time as HH:MM.')
        if value:
            try:
                dt.time.fromisoformat(value)
            except ValueError as exc:
                raise ValueError('Invalid sleep time.') from exc
        times.append(value)
    date = data.get('date') or dt.date.today().isoformat()
    try:
        date_obj = dt.date.fromisoformat(date)
    except (TypeError, ValueError) as exc:
        raise ValueError('Invalid date.') from exc
    if abs((date_obj - dt.date.today()).days) > 365:
        raise ValueError('Check-in date must be within one year of today.')
    # This is NOT the research article's weighted AMS-SD/LD score.
    # 100 means low self-reported difficulty; 0 means high difficulty.
    index = round(100 - 10 * statistics.mean(answers.values()), 1)
    return mode, answers, note.strip(), times, date, index


def save_mood(db, user_id, data, now):
    mode, answers, note, times, date, index = validate_mood(data)
    db.execute('''INSERT INTO twin_mood(user_id,recorded_at,mission_date,mode,responses_json,notes,sleep_start,sleep_end,self_report_index)
       VALUES(?,?,?,?,?,?,?,?,?)''', (user_id, now, date, mode, json.dumps(answers, separators=(',', ':')),note,*times,index))
    return {'ok':True,'index':index,'mode':mode,'recorded_at':now,
            'disclaimer':'Experimental OrbitLife self-report index. Not the published weighted NASA Cognition AMS score or a medical assessment.'}


def values_for(db, query, uid, *params):
    return [dict(r) for r in db.execute(query, (uid, *params)).fetchall()]


def _point(row, key):
    value = row.get(key)
    return float(value) if isinstance(value, (int, float)) else None


def _metric(label, unit, data, key, precision=1):
    points = [(r['date'], _point(r, key), r.get('source', 'daily check-in')) for r in data]
    actual = [(day, value, source) for day, value, source in points if value is not None]
    if not actual:
        return {'label':label,'unit':unit,'latest':None,'baseline':None,'difference':None,'days':0,'points':[],'source':None,'note':'No readings yet.'}
    # Use the 7 earlier readings; never use today's reading to calculate the baseline.
    recent = actual[-1]
    earlier = [v for d, v, _ in actual[:-1]][-7:]
    baseline = round(statistics.median(earlier),precision) if len(earlier) >= 3 else None
    difference = round(recent[1]-baseline,precision) if baseline is not None else None
    return {'label':label,'unit':unit,'latest':round(recent[1],precision),'baseline':baseline,
            'difference':difference,'days':len(actual), 'as_of':recent[0],
            'points':[{'date':d,'value':round(v,precision)} for d,v,_ in actual[-30:]],
            'source':recent[2], 'note':'Baseline = median of up to 7 prior readings (minimum 3). Not a clinical range.'}


def get_twin(db, user_id):
    person = db.execute('SELECT astronaut_id,name,role,mission_day FROM users WHERE id=? AND active=1',(user_id,)).fetchone()
    if not person:
        raise ValueError('Astronaut not found.')
    # Only use existing records; do not manufacture any health observations here.
    daily = values_for(db,'''SELECT date,sleep,hr,spo2,mass,water,exercise,stress,fatigue,mood,notes
          FROM daily WHERE user_id=? ORDER BY date DESC LIMIT 45''',user_id)[::-1]
    for d in daily:d['source']='daily check-in' if 'Fictional initial' not in (d.get('notes') or '') else 'fictional demo'
    wear = values_for(db,'''SELECT date,source,resting_hr,stress_score,steps,active_minutes,body_battery,sleep_hours
          FROM wearable WHERE user_id=? ORDER BY date DESC,id DESC LIMIT 100''',user_id)
    wear = list({r['date']:r for r in wear}.values())[::-1]
    for w in wear:
        w['source']=('synthetic wearable' if w.get('source')=='synthetic' else 'imported / device claim: '+str(w.get('source')))
    raw_mood=values_for(db,'''SELECT id,recorded_at,mission_date,mode,responses_json,notes,self_report_index
        FROM twin_mood WHERE user_id=? ORDER BY recorded_at DESC,id DESC LIMIT 90''',user_id)
    mood=[]
    for row in raw_mood:
        try:responses=json.loads(row.pop('responses_json'))
        except (ValueError,TypeError):responses={}
        row['responses']=responses
        mood.append(row)
    radiation = db.execute('SELECT COUNT(*) n, MAX(measured_at) last_time FROM radiation WHERE user_id=?',(user_id,)).fetchone()
    symptoms=values_for(db,'SELECT created_at,region,severity FROM symptoms WHERE user_id=? ORDER BY created_at DESC LIMIT 5',user_id)
    dietary=db.execute('SELECT COUNT(*) n,MAX(date) last_date FROM diet WHERE user_id=?',(user_id,)).fetchone()
    meds=db.execute('SELECT COUNT(*) n FROM medications WHERE user_id=?',(user_id,)).fetchone()
    cortisol=db.execute('SELECT COUNT(*) n,MAX(collected_at) last_time FROM cortisol WHERE user_id=?',(user_id,)).fetchone()
    metrics = {
      'sleep':_metric('Sleep','h',daily,'sleep'),
      'heart_rate':_metric('Resting heart rate','bpm',daily,'hr',0),
      'oxygen':_metric('SpO₂','%',daily,'spo2'),
      'activity':_metric('Exercise','min',daily,'exercise',0),
      'water':_metric('Water intake','L',daily,'water'),
      'wearable_stress':_metric('Wearable stress (device scale)','index',wear,'stress_score',0),
      'mood':_metric('Self-report comfort index','/100',
          [{'date':r['mission_date'],'score':r['self_report_index'],'source':'self-report'} for r in reversed(mood)],'score'),
    }
    observations=[]
    for key in ('sleep','heart_rate','oxygen','activity','water'):
        m=metrics[key]
        if m['difference'] is not None:
            observations.append({'metric':m['label'], 'text':f"{m['latest']} {m['unit']} vs own earlier median {m['baseline']} {m['unit']}",
                'delta':m['difference'],'source':m['source']})
    # No algorithm predicts a health condition or flags emergencies from these observations.
    history=[{'date':r['date'],'sleep':r['sleep'],'hr':r['hr'],'spo2':r['spo2'],
              'stress':r['stress'],'fatigue':r['fatigue'],'source':r['source']} for r in daily[-30:]]
    def count_rows(table):
        # Constant table names only; never accept a table name from HTTP input.
        return db.execute(f'SELECT COUNT(*) FROM {table} WHERE user_id=?',(user_id,)).fetchone()[0]
    counts={'daily':count_rows('daily'),'wearable':count_rows('wearable'),
            'mood':count_rows('twin_mood'),'radiation':radiation['n'],
            'symptoms':count_rows('symptoms'),'diet':dietary['n'],
            'medications':meds['n'],'cortisol':cortisol['n']}
    return {'identity':dict(person),'model':'OrbitLife Personal Digital Twin 20.0',
        'mission':{'scenario':'Lunar South Pole research scenario','duration_days':30,'mode':'Educational demonstration'},
        'updated_at':dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
        'metrics':metrics,'daily_history':history,'mood_history':mood,'observations':observations,
        'sources':counts,'recent_symptoms':symptoms,'risks':RISK_LIBRARY,
        'notes':['A linked view of stored records, not a physiological simulation or clinically validated prediction.',
                 'Measurements may be fictional, self-reported, simulated or imported. Always inspect the source.',
                 'No automatic bone density, infection diagnosis, EVA safety rating or radiation risk calculation.',
                 'OrbitLife comfort score is an unweighted prototype index, not the research team’s AMS-SD/AMS-LD.']}
