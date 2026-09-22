import json,sys
lang=sys.argv[1]
d=json.load(open(f'scenes_{lang}.json'))
def ts(t):
    h=int(t//3600);m=int(t%3600//60);s=t%60
    return f"{h:02d}:{m:02d}:{s:06.3f}"
out=['WEBVTT','']
for i,s in enumerate(d['scenes'],1):
    out+= [str(i),f"{ts(s['voiceStart'])} --> {ts(s['voiceStart']+s['voiceDur']+0.3)}",s['caption'],'']
open(f'captions_{lang}.vtt','w',encoding='utf-8').write('\n'.join(out))
print('ok',lang)
