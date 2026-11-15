# Digital Twin 20.0: sources, design and limits

## Source notes

*Space Health App.pdf* outlines a crewed lunar South Pole health scenario, aiming for roughly a month of crew wellbeing monitoring and identifying twelve health topics, including immune change, vestibular adaptation, cardiovascular adaptation, decompression sickness, infection, hypoxia, nutrition, EVA, reduced fitness, urinary/reproductive health, radiation and bone loss. Its references include NASA Human Research Program risks and wearables. The PDF is a brainstorming document; its environmental temperature figures and proposed miniature MRI are **not validated device specifications** and are not embedded in the app as facts.

NASA Human Research Program documents five spaceflight hazards and many related physiological and behavioral risks: <https://www.nasa.gov/hrp/risks/>.

Pundyavana, Gilad, Stahn and Basner (2023), *Cognition Test Battery Survey: Development of a Single Alertness and Mood Score for Short- and Long-Duration Spaceflight*, *Applied Sciences* 13(4), 2364, DOI: <https://doi.org/10.3390/app13042364>. The paper describes an 18-item survey and develops **two weighted scores** using expert pairwise comparisons of 14 ratings. It does not establish that any homemade unweighted score is clinically valid.

## What is implemented

1. Each astronaut gets a private view of **existing** SQLite data from daily check-ins, wearable-style reports, radiation logs, nutrition, cortisol, symptom logs, medications and self-reported mood.
2. Charts show stored observations only, with sample count and source label. The reference baseline is the median of at least three earlier readings (up to seven). It is a descriptive comparison, not a medical safe range.
3. Quick mood check-in asks five questions. The extended check-in adds nine, covering workload, sickness, exhaustion, tiredness, low mood, boredom, loneliness, monotony and crew conflicts. Ratings are framed so 0 means low difficulty and 10 means high difficulty. The optional crew conflict item has 0 or 10 only.
4. **OrbitLife prototype index = 100 − 10 × arithmetic mean(answered questions)**, rounded to one decimal. Every item in a selected mode must be answered. This is *not* a weighted AMS score and is *not comparable* between Quick and Detailed modes without additional validation. Its display is limited to describing the user's self-report.
5. The offline personal assistant can summarize saved check-ins on request. Connected AI includes the new records only after the user explicitly selects Connected AI.

## What is not implemented

No bone-density measurement, ultrasound scan, fracture detector, miniature MRI, true physiological digital twin simulation, validated illness forecast, clinical decision support, EVA safety clearance, medical treatment recommendation or NASA-approved weighted Cognition AMS-SD/AMS-LD model. The real NASA Cognition battery's objective tests are not present. Hardware integration must be verified on the actual ESP32 and RFID equipment. All displayed synthetic wearable information remains marked as synthetic.

## Privacy

The `/api/twin` and `/api/twin/mood` endpoints enforce the same authenticated user and commander selection rules as the existing personal medical record. User mood notes are kept in the local SQLite database. The app has no remote-hosted production accounts and should never be deployed publicly in its demo configuration.
