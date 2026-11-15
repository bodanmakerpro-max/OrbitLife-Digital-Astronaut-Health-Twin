#!/usr/bin/env python3
"""Static UI integration tests for new Digital Twin assets and routes."""
from html.parser import HTMLParser
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
class Elements(HTMLParser):
    def __init__(self):super().__init__();self.ids={};self.scripts=[];self.styles=[];self.views=[];self.actions=[]
    def handle_starttag(self,tag,attrs):
        vals=dict(attrs)
        if 'id' in vals:self.ids.setdefault(vals['id'],0);self.ids[vals['id']]+=1
        if vals.get('src'):self.scripts.append(vals['src'])
        if vals.get('href'):self.styles.append(vals['href'])
        if vals.get('data-view'):self.views.append(vals['data-view'])
        if vals.get('data-launch-action'):self.actions.append(vals['data-launch-action'])
html=Elements();html.feed((ROOT/'index.html').read_text(encoding='utf-8'))
server=(ROOT/'server.py').read_text(encoding='utf-8')
js=(ROOT/'digital-twin.js').read_text(encoding='utf-8')
launch=(ROOT/'launch-ui.js').read_text(encoding='utf-8')
checks={
 'one unique twin section':html.ids.get('view-twin')==1,
 'new navigation entry':'twin' in html.views,
 'welcome opens twin':'twin' in html.actions,
 'welcome launch code accepts twin':"'crewprofile','twin'].includes(action)" in launch,
 'JS linked':'digital-twin.js' in html.scripts,
 'CSS linked':'digital-twin.css' in html.styles,
 'seven metric display exists':'twinMetrics' in html.ids,
 'chart elements exist':all(k in html.ids for k in ('twinChart','twinChartMetric','twinChartCaption')),
 'mode controls exist':all(k in html.ids for k in ('twinMoodPanel','twinQuestions','twinMoodForm')),
 'AI link exists':'twinAskAI' in html.ids,
 'research topic library exists':'twinRiskGrid' in html.ids,
 'new files are served':'/digital-twin.js' in server and '/digital-twin.css' in server,
 'private authorization for GET':"self.target(db,user,params)" in server,
 'private authorization for POST':"twin.save_mood(db,target_id,data,utcnow())" in server,
 'personal AI is still present':'view-assistant' in html.ids,
 'quick AI retained':'olQuickAiFab' in html.ids,
 'welcome ESP retained':'olEspForm' in html.ids,
 'RFID retained':"'/api/terminal/rfid-login'" in server,
 'home return retained':'olSidebarWelcome' in html.ids,
 'all HTML ids unique':all(n==1 for n in html.ids.values()),
 '14 survey questions':len(re.findall(r"^    \['[a-z_]+','",js,re.M))==14,
 'added language dictionary entries':all('Digital Twin' in (ROOT/'localization.js').read_text(encoding='utf-8') for _ in range(1)),
}
for name,value in checks.items():print(('PASS' if value else 'FAIL')+': '+name)
assert all(checks.values())
print('PASS:',len(checks),'Digital Twin UI checks')
