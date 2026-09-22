# -*- coding: utf-8 -*-
import subprocess,wave,json,sys,os
from script import KEYS,LINES,VOICE
lang=sys.argv[1]
NEURAL='--neural' in sys.argv  # use wavs made by tts_azure.py instead of the macOS voice
os.makedirs(f'a_{lang}',exist_ok=True)
segs=[]
for i,(k,line) in enumerate(zip(KEYS,LINES[lang])):
    aiff=f'a_{lang}/{i:02d}.aiff'; wav=f'a_{lang}/{i:02d}.wav'
    if NEURAL:
        wav=f'a_{lang}_neural/{i:02d}.wav'
    else:
        subprocess.run(['say','-v',VOICE[lang],'-r','165','-o',aiff,line],check=True)
        subprocess.run(['afconvert','-f','WAVE','-d','LEI16@22050','-c','1',aiff,wav],check=True)
    w=wave.open(wav); n=w.getnframes(); sr=w.getframerate(); data=w.readframes(n); w.close()
    SR=sr
    segs.append((k,line,data,n/sr))
out=wave.open(f'narration_{lang}.wav','wb'); out.setnchannels(1); out.setsampwidth(2); out.setframerate(SR)
scenes=[];t=0.0
def silence(sec): out.writeframes(b'\x00\x00'*int(SR*sec))
# Short gaps read as one continuous narration cutting from slide to slide; the old 0.9s pause
# after every line was long enough to feel like a new "click" each time, i.e. a PPT read-aloud
# rather than a video voiceover. A brief breath is still needed so words from adjacent lines
# don't run together, and the final line gets a little more room before the video ends.
lead=0.3; silence(lead); t=lead
for i,(k,cap,data,dur) in enumerate(segs):
    tail=1.0 if i==len(segs)-1 else 0.3
    length=max(dur+tail,2.5)
    start=t-(lead if i==0 else 0) if False else (0 if i==0 else t)
    scenes.append({'key':k,'start':(0.0 if i==0 else t),'end':t+length,'caption':cap,'voiceStart':t,'voiceDur':dur})
    out.writeframes(data); silence(length-dur)
    t+=length
out.close()
json.dump({'scenes':scenes,'total':t},open(f'scenes_{lang}.json','w'),ensure_ascii=False,indent=1)
print(lang,'total',round(t,1),'s',[round(s['end']-s['start'],1) for s in scenes])
