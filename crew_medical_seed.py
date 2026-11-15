"""Fictional crew medical background for the PulseDeck showcase.
All fields are unverified sample records; verified emergency fields are NEVER set here.
Only fills empty values and never overwrites user-entered clinical data.
"""
CREW_MEDICAL = [
  dict(blood='O+', allergies='None known', conditions='Remote shoulder strain, resolved', notes='Routine endurance training. Previous shoulder injury is historical; confirm current status with medical officer.', diet='No confirmed dietary restrictions', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='A+', allergies='Peanuts (fictional history)', conditions='Occasional tension headaches', notes='Check allergen labels before any packaged-food selection. Review headache pattern with flight medical team.', diet='No peanuts or peanut-containing meals', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='B+', allergies='None known', conditions='Seasonal allergic rhinitis (historical)', notes='Sample medical officer profile. Confirm all records before medical decisions.', diet='No confirmed dietary restrictions', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='AB+', allergies='Milk protein (fictional history)', conditions='Motion sickness sensitivity', notes='Avoid dairy-containing meal assignments until medically checked.', diet='Dairy-free', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='O-', allergies='None known', conditions='Old ankle sprain, recovered', notes='Higher planned training load. Monitor hydration and meal timing.', diet='No confirmed dietary restrictions', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='A-', allergies='None known', conditions='None known', notes='Plant-based diet preference is not a confirmed medical allergy.', diet='Vegetarian; prefers plant-based meals', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='B-', allergies='Soy (fictional history)', conditions='Irregular sleep schedule', notes='Avoid soy-containing foods; review sleep history if symptoms worsen.', diet='Soy-free', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='AB-', allergies='None known', conditions='Recurrent mild knee discomfort after training', notes='Activity-modified day may be needed following medical review.', diet='No confirmed dietary restrictions', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='O+', allergies='Fish (fictional history)', conditions='Occasional acid reflux', notes='Avoid fish and verify ingredient labels on packaged meals.', diet='Fish-free', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule=''),
  dict(blood='A+', allergies='None known', conditions='None known', notes='No known chronic conditions in this fictional scenario.', diet='No confirmed dietary restrictions', contact='Crew Medical Officer / Flight Surgeon (demo routing)', medication='None recorded', med_schedule='')
]

def seed_medical(db):
    users=db.execute('SELECT id,astronaut_id FROM users WHERE active=1 ORDER BY id').fetchall()
    for i,row in enumerate(users):
        if i>=len(CREW_MEDICAL):break
        rec=CREW_MEDICAL[i]
        for col,key in [('blood_type','blood'),('allergies','allergies'),('conditions','conditions'),('emergency_notes','notes'),('dietary_restrictions','diet'),('emergency_contact','contact')]:
            db.execute(f"UPDATE users SET {col}=? WHERE id=? AND (TRIM(COALESCE({col},''))='')",(rec[key],row['id']))
        # Only add a note-style sample medication record for one person when no existing medication list is present.
        if i in (1,3,6) and not db.execute('SELECT 1 FROM medications WHERE user_id=? LIMIT 1',(row['id'],)).fetchone():
            db.execute('INSERT INTO medications(user_id,name,schedule,instructions) VALUES(?,?,?,?)',
                (row['id'],'No active medicine confirmed','Review with flight medical officer','Fictional, unverified record. Do not administer medication based on this entry.'))
