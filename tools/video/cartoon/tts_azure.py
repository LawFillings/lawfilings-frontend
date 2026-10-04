# -*- coding: utf-8 -*-
"""Per-line narration for the cartoon promo with an Azure AI Speech neural voice.
Run in your own Terminal so the key never goes into a file or chat:
  AZURE_SPEECH_KEY='...' AZURE_SPEECH_REGION='centralindia' python3 tts_azure.py en
Writes _azure_<lang>/NN.wav (24 kHz mono); then: python3 make_audio.py en --azure"""
import json, os, sys, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
lang = sys.argv[1] if len(sys.argv) > 1 else 'en'
cfg = json.load(open(os.path.join(HERE, 'lines.json')))[lang]
az = cfg['azure']
import re, getpass
key = os.environ.get('AZURE_SPEECH_KEY') or getpass.getpass('Paste Azure KEY 1 (input is hidden), then press Enter: ').strip()
region = (os.environ.get('AZURE_SPEECH_REGION') or input('Region from the portal, one lowercase word, e.g. centralindia: ')).strip().lower().replace(' ', '')
if len(key) < 30 or 'YOUR' in key.upper() or 'PASTE' in key.upper():
    sys.exit('That does not look like a real Azure key (they are 32+ characters). Copy KEY 1 from the lawfilings-speech resource > Keys and Endpoint.')
if not re.fullmatch(r'[a-z0-9]+', region) or region in ('yourregion', 'region'):
    sys.exit('That does not look like a real region. Use the Location from Keys and Endpoint, e.g. centralindia.')
out = os.path.join(HERE, f'_azure_{lang}'); os.makedirs(out, exist_ok=True)
ONLY = next((set(int(x) for x in a.split('=')[1].split(',')) for a in sys.argv if a.startswith('--only=')), None)
n = 0
for lines in cfg['scenes']:
    for text in lines:
        if ONLY is not None and n not in ONLY:
            n += 1; continue
        t = text.replace('&', '&amp;').replace('<', '&lt;')
        ssml = (f"<speak version='1.0' xml:lang='{az['locale']}' xmlns='http://www.w3.org/2001/10/synthesis'>"
                f"<voice name='{az['voice']}'><prosody rate='{az['rate']}'>{t}</prosody></voice></speak>")
        req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode('utf-8'),
            headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                     'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', 'User-Agent': 'lawfilings-video'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r: audio = r.read()
        except urllib.error.HTTPError as e:
            sys.exit(f'Azure said {e.code} {e.reason} on line {n}: check the key and region.')
        open(os.path.join(out, f'{n:02d}.wav'), 'wb').write(audio); print(n, len(audio), 'bytes'); n += 1
print('done - now run: python3 make_audio.py', lang, '--azure')
