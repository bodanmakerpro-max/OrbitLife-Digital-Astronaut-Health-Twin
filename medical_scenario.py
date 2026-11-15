"""Fictional sample emergency cards, never represented as clinician-verified data.
Populate only untouched/unverified crew records; do not override actual user edits.
"""
from datetime import datetime, timezone
SCENARIO = [
  ('None known','Previous shoulder strain, resolved','None currently recorded','Notify crew medical officer; review shoulder history if pain occurs.','Medical officer AST-003; ground flight surgeon'),
  ('Peanuts (scenario)','Intermittent tension headaches','None currently recorded','Check packaged-food ingredient list; report allergic symptoms promptly to crew medical.','Medical officer AST-003; ground flight surgeon'),
  ('None known','Seasonal allergic rhinitis history','None currently recorded','If symptoms or readings change, contact commander and ground medical officer.','Commander AST-001; ground flight surgeon'),
  ('Milk protein (scenario)','Motion sickness sensitivity','None currently recorded','Avoid dairy in meal allocation; report vomiting or unusual dizziness to crew medical.','Medical officer AST-003; ground flight surgeon'),
  ('None known','Old ankle sprain, recovered','None currently recorded','Report joint pain or injury before physical work and review with medical officer.','Medical officer AST-003; ground flight surgeon'),
  ('None known','No long-term conditions listed','None currently recorded','Check nutrition and hydration logs; report new symptoms to crew medical.','Medical officer AST-003; ground flight surgeon'),
  ('Soy (scenario)','Sleep disruption history','None currently recorded','Avoid soy-containing assigned meals; review persistent fatigue with medical officer.','Medical officer AST-003; ground flight surgeon'),
  ('None known','Mild exercise-associated knee discomfort','None currently recorded','Report knee injury or acute pain and consult mission medical before heavy exercise.','Medical officer AST-003; ground flight surgeon'),
  ('Fish (scenario)','Occasional acid reflux','None currently recorded','Avoid fish in assigned meals; discuss persistent gastrointestinal symptoms with crew medical.','Medical officer AST-003; ground flight surgeon'),
  ('None known','No long-term conditions listed','None currently recorded','Record symptoms and contact crew medical if any urgent concern arises.','Medical officer AST-003; ground flight surgeon'),
]
SCENARIO_BY='FICTIONAL SCENARIO - NOT CLINICALLY VERIFIED'

def seed_scenario_cards(db):
    users=db.execute('SELECT * FROM users WHERE active=1 ORDER BY id').fetchall()
    for idx,row in enumerate(users):
        if idx>=len(SCENARIO):break
        # Never overwrite any verified record or any existing emergency card fields.
        if (row['emergency_verified_at'] or '').strip():continue
        existing=[row[col] for col in ('verified_allergies','verified_conditions','verified_medications','approved_emergency_instructions','crew_medical_contact')]
        if any((str(x or '')).strip() for x in existing):continue
        stamp=datetime.now(timezone.utc).isoformat(timespec='seconds')
        db.execute('''UPDATE users SET verified_allergies=?,verified_conditions=?,verified_medications=?,
          approved_emergency_instructions=?,crew_medical_contact=?,emergency_verified_at=?,emergency_verified_by=? WHERE id=?''',
          (*SCENARIO[idx],stamp,SCENARIO_BY,row['id']))
