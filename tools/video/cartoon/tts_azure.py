# -*- coding: utf-8 -*-
"""Per-line narration for the cartoon videos with Azure AI Speech neural voices.
Run in your own Terminal so the key never goes into a file or chat; it asks for the key once:
  python3 tts_azure.py hi builtfor          # one or more of: en hi builtfor
  python3 tts_azure.py en --only=7          # regenerate just some lines (indexes across the whole script)
Writes _azure_<name>/NN.wav (24 kHz mono); then: python3 make_audio.py <name> --azure --speed=1.2"""
import json, os, re, sys, getpass, urllib.request, urllib.error
HERE = os.path.dirname(os.path.abspath(__file__))
names = [a for a in sys.argv[1:] if not a.startswith('--')] or ['en']
ONLY = next((set(int(x) for x in a.split('=')[1].split(',')) for a in sys.argv if a.startswith('--only=')), None)
all_cfg = json.load(open(os.path.join(HERE, 'lines.json')))

key = os.environ.get('AZURE_SPEECH_KEY') or getpass.getpass('Paste Azure KEY 1 (input is hidden), then press Enter: ').strip()
region = (os.environ.get('AZURE_SPEECH_REGION') or input('Region from the portal, one lowercase word, e.g. centralindia: ')).strip().lower().replace(' ', '')
if len(key) < 30 or 'YOUR' in key.upper() or 'PASTE' in key.upper():
    sys.exit('That does not look like a real Azure key (they are 32+ characters). Copy KEY 1 from the lawfilings-speech resource > Keys and Endpoint.')
if not re.fullmatch(r'[a-z0-9]+', region) or region in ('yourregion', 'region'):
    sys.exit('That does not look like a real region. Use the Location from Keys and Endpoint, e.g. centralindia.')

# Check each configured voice exists in this region first; if not, list what the locale offers.
try:
    req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list', headers={'Ocp-Apim-Subscription-Key': key})
    with urllib.request.urlopen(req, timeout=60) as r: voices = json.loads(r.read().decode('utf-8'))
except Exception as e:
    voices = None; print('(could not fetch the voice list, skipping the voice check:', e, ')')
if voices is not None:
    have = {v['ShortName'] for v in voices}
    bad = False
    for name in names:
        az = all_cfg[name]['azure']
        if az['voice'] not in have:
            bad = True
            options = [f"{v['ShortName']} ({v['Gender']})" for v in voices if v['Locale'] == az['locale']]
            print(f"Voice {az['voice']} for '{name}' is not available in region {region}. {az['locale']} voices there: {', '.join(options) or 'none'}")
    if '--list-voices' in sys.argv or bad: sys.exit('Edit the voice in lines.json (azure.voice) and run again.' if bad else 0)

for name in names:
    cfg = all_cfg[name]; az = cfg['azure']
    out = os.path.join(HERE, f'_azure_{name}'); os.makedirs(out, exist_ok=True)
    n = 0
    for lines in cfg['scenes']:
        for text in lines:
            if ONLY is not None and n not in ONLY:
                n += 1; continue
            t = text.replace('&', '&amp;').replace('<', '&lt;')
            for w in az.get('englishWords', []):  # say these Latin-script words in Indian English, not in the local voice's accent
                t = re.sub(rf'(?<![A-Za-z])({re.escape(w)})(?![A-Za-z])', r'<lang xml:lang="en-IN">\1</lang>', t)
            ssml = (f"<speak version='1.0' xml:lang='{az['locale']}' xmlns='http://www.w3.org/2001/10/synthesis'>"
                    f"<voice name='{az['voice']}'><prosody rate='{az['rate']}'>{t}</prosody></voice></speak>")
            req = urllib.request.Request(f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1', data=ssml.encode('utf-8'),
                headers={'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml',
                         'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm', 'User-Agent': 'lawfilings-video'})
            try:
                with urllib.request.urlopen(req, timeout=60) as r: audio = r.read()
            except urllib.error.HTTPError as e:
                sys.exit(f'Azure said {e.code} {e.reason} on {name} line {n}: check the key, region and that the voice {az["voice"]} is available.')
            open(os.path.join(out, f'{n:02d}.wav'), 'wb').write(audio); print(name, n, len(audio), 'bytes'); n += 1
    print(name, 'done')
print('all done')
