# -*- coding: utf-8 -*-
"""Narration for the cartoon promo: macOS `say` per line -> narration_<lang>.wav + timeline_<lang>.json.
Usage: python3 make_audio.py en   (needs ffmpeg; set FF to a binary if it isn't on PATH)"""
import json, os, subprocess, sys, wave
HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.environ.get('FF') or 'ffmpeg'
lang = next((a for a in sys.argv[1:] if not a.startswith('--')), 'en')
USE_AZURE = '--azure' in sys.argv
SPEED = next((float(a.split('=')[1]) for a in sys.argv if a.startswith('--speed=')), 1.0)
cfg = json.load(open(os.path.join(HERE, 'lines.json')))[lang]
tmp = os.path.join(HERE, f'_a_{lang}'); os.makedirs(tmp, exist_ok=True)
RATE = 24000
LEAD, GAP_LINE, GAP_SCENE, TAIL = 0.6, 0.35, 0.8, 1.6

def silence(sec): return b'\x00\x00' * int(RATE * sec)
pcm = silence(LEAD); t = LEAD
scenes_out = []; n = 0
for si, lines in enumerate(cfg['scenes']):
    sc = {'start': t, 'lines': []}
    for li, text in enumerate(lines):
        if USE_AZURE:
            wav = os.path.join(HERE, f'_azure_{lang}', f'{n:02d}.wav')
            if not os.path.exists(wav): sys.exit(f'Missing {wav} - run tts_azure.py first')
            if SPEED != 1.0:
                fast = f'{tmp}/az{n:02d}.wav'
                subprocess.run([FF, '-y', '-loglevel', 'error', '-i', wav, '-filter:a', f'atempo={SPEED}', '-ar', str(RATE), '-ac', '1', '-sample_fmt', 's16', fast], check=True)
                wav = fast
        else:
            aiff, wav = f'{tmp}/{n:02d}.aiff', f'{tmp}/{n:02d}.wav'
            subprocess.run(['say', '-v', cfg['voice'], '-r', '170', '-o', aiff, text], check=True)
            subprocess.run([FF, '-y', '-loglevel', 'error', '-i', aiff, '-ar', str(RATE), '-ac', '1', '-sample_fmt', 's16', wav], check=True)
        w = wave.open(wav); frames = w.readframes(w.getnframes()); dur = w.getnframes() / w.getframerate(); w.close()
        pcm += frames; start = t; t += dur
        sc['lines'].append({'text': text, 'start': start, 'end': t})
        gap = GAP_SCENE if li == len(lines) - 1 and si < len(cfg['scenes']) - 1 else GAP_LINE
        if si == len(cfg['scenes']) - 1 and li == len(lines) - 1: gap = TAIL
        pcm += silence(gap); t += gap; n += 1
    sc['end'] = t
    scenes_out.append(sc)
out = wave.open(os.path.join(HERE, f'narration_{lang}.wav'), 'wb')
out.setnchannels(1); out.setsampwidth(2); out.setframerate(RATE); out.writeframes(pcm); out.close()
json.dump({'total': t, 'scenes': scenes_out}, open(os.path.join(HERE, f'timeline_{lang}.json'), 'w'), ensure_ascii=False, indent=1)
print('total seconds', round(t, 1), 'scenes', [(round(s['start'], 1), round(s['end'], 1)) for s in scenes_out])
