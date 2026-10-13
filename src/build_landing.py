import base64, json, os
def b(p,m): return 'data:%s;base64,%s'%(m,base64.b64encode(open(p,'rb').read()).decode())
c='/tmp/lt/test/clips/'
t=open('/tmp/lt/landing/landing.tpl.html').read()
UF=os.environ.get('URLS','/tmp/lt/build/urls.json'); urls=json.load(open(UF)) if os.path.exists(UF) else {}
rep={'%%LOGO%%':b('/tmp/lt/zip/svg/ouhsd-logo-stacked-white.svg','image/svg+xml'),
 '%%VIDEO_URL%%':urls.get('video','#'),'%%LIVE_URL%%':urls.get('live','#'),
 '%%VIDEO_ATTR%%':'' if urls.get('video') else 'aria-disabled="true"','%%LIVE_ATTR%%':'' if urls.get('live') else 'aria-disabled="true"',
 '%%VIDEO_POSTER%%':b(c+'video_poster.jpg','image/jpeg'),'%%LIVE_POSTER%%':b(c+'live_poster.jpg','image/jpeg'),
 '%%VIDEO_MP4%%':b(c+'video.mp4','video/mp4'),'%%VIDEO_WEBM%%':b(c+'video.webm','video/webm'),
 '%%LIVE_MP4%%':b(c+'live.mp4','video/mp4'),'%%LIVE_WEBM%%':b(c+'live.webm','video/webm')}
for k,v in rep.items(): t=t.replace(k,v)
open(os.environ.get('LANDING_OUT','/home/claude/lower-thirds-tools.html'),'w').write(t); print(len(t))
