import base64, json, os, sys
z='/tmp/lt/zip/svg/'
names={'sw':'ouhsd-logo-stacked-white','sc':'ouhsd-logo-stacked-color'}
logos='window.LOGO_SRC={'+','.join("%s:'data:image/svg+xml;base64,%s'"%(k,base64.b64encode(open(z+v+'.svg','rb').read()).decode()) for k,v in names.items())+'};'
core=open('/tmp/lt/build/core.js').read()
overlay=open('/tmp/lt/build/overlay.js').read()
ui=open('/tmp/lt/build/ui.js').read()
UF=os.environ.get('URLS','/tmp/lt/build/urls.json'); OD=os.environ.get('OUTDIR','/home/claude')
urls=json.load(open(UF)) if os.path.exists(UF) else {}
assert '</script' not in core and '</script' not in overlay and '</script' not in ui
APPS={
 'video':dict(out=OD+'/'+os.environ.get('VIDEO_NAME','lower-thirds-studio.html'),title='Lower Thirds Studio',eyebrow='For video editors: Final Cut, Premiere, Resolve, CapCut',other='Live tool for OBS',otherurl=urls.get('live','')),
 'live':dict(out=OD+'/'+os.environ.get('LIVE_NAME','lower-thirds-live.html'),title='Lower Thirds Live',eyebrow='For live streams: OBS',other='Video tool',otherurl=urls.get('video','')),
}
for k,a in APPS.items():
    t=open('/tmp/lt/build/template.html').read()
    t=t.replace('%%TITLE%%',a['title']).replace('%%EYEBROW%%',a['eyebrow']).replace('%%LANDING%%',urls.get('landing','#')).replace('%%OTHER%%',a['otherurl'] or '#').replace('%%OTHERNAME%%',a['other'])
    pre='window.LT_APP=%s;window.LT_SELF=%s;'%(json.dumps(k),json.dumps(urls.get(k,'')))
    t=t.replace('/*LOGOS*/',logos+'\n'+pre).replace('/*CORE*/',core).replace('/*OVERLAY*/',overlay).replace('/*UI*/',ui)
    open(a['out'],'w').write(t); print(k,len(t))
