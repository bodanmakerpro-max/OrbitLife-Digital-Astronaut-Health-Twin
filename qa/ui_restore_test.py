#!/usr/bin/env python3
"""Offline regressions for visible Quick AI and the restored module directories."""
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class Elements(HTMLParser):
    def __init__(self):
        super().__init__();self.ids={};self.actions={};self.scripts=[];self.open=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids[a['id']]=dict(a,tag=tag)
        for attr in ('data-launch-action','data-ol-open'):
            if a.get(attr):self.actions[(attr,a[attr])]=self.actions.get((attr,a[attr]),0)+1
        if tag=='script' and a.get('src'):self.scripts.append(a['src'])

h=Elements();h.feed((ROOT/'index.html').read_text(encoding='utf-8'))
css='\n'.join((ROOT/s).read_text(encoding='utf-8') for s in ['app.css','command-ui.css','refined-ui.css','launch-ui.css'])
command=(ROOT/'command-ui.js').read_text(encoding='utf-8')
launch=(ROOT/'launch-ui.js').read_text(encoding='utf-8')
server=(ROOT/'server.py').read_text(encoding='utf-8')
checks={
 'Quick AI floating button exists': 'olQuickAiFab' in h.ids and h.ids['olQuickAiFab']['tag']=='button',
 'Quick AI chat overlay exists': 'olQuickAiOverlay' in h.ids and 'hidden' in h.ids['olQuickAiOverlay'].get('class',''),
 'Quick AI can be opened from Welcome': ('data-launch-action','quickai') in h.actions,
 'Quick AI button is anchored to viewport bottom': '.ol-quickai-fab{position:fixed;left:18px;bottom:' in css,
 'No rule hides AI bubble and modal permanently': '#olQuickAiFab,#olQuickAiOverlay{display:none!important}' not in css,
 'Global hidden utility still works': '.hidden{display:none!important}' in css,
 'Quick AI stays enabled after sign in': "$('olQuickAiFab').classList.remove('hidden')" in command,
 'Quick AI wired to server': "'/api/quick-ai'" in command and "'/api/quick-ai'" in server,
 'Quick AI exposed to Welcome shortcuts': 'window.OrbitLifeQuickAI={open:showAi' in command,
 'Welcome complete menu has 12 tools': sum(h.actions.get(('data-launch-action',view),0)>0 for view in ['personal','daily','wearables','radiation','cortisol','body','medications','nutrition','records','assistant','emergency','quickai'])==12,
 'Main mission tools directory exists': 'olHomeTools' in h.ids and '.ol-home-tools{' in (ROOT/'refined-ui.css').read_text(encoding='utf-8'),
 'Main signed-in quick strip not forcibly hidden': '#quickActions{display:none!important}' not in css,
 'ESP32 Welcome connection preserved': 'olEspForm' in h.ids and 'welcome-esp.js' in h.scripts,
 'Back to Welcome preserved': 'olSidebarWelcome' in h.ids and 'olReturnMonitor' in h.ids,
 'RFID login remains': "'/api/terminal/rfid-login'" in server,
 'OLED home still has three encoder choices': "home:['dashboard','food','login']" in launch,
 'Original medical AI still exists': 'view-assistant' in h.ids and 'chatForm' in h.ids,
 'Core feature sections remain': all('view-'+x in h.ids for x in ['daily','radiation','cortisol','body','medications','nutrition','wearables','records','emergency','menu','personal']),
}
for label,ok in checks.items():
    print(('PASS' if ok else 'FAIL')+': '+label)
assert all(checks.values()), 'UI restoration regression test failed'
print('PASS:',len(checks),'UI restoration checks')
