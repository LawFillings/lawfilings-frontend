# -*- coding: utf-8 -*-
"""Generate the per-scene narration with Azure AI Speech neural voices.

Usage (key stays in your own Terminal, never in a file or chat):
  AZURE_SPEECH_KEY='...' AZURE_SPEECH_REGION='centralindia' python3 tools/video/tts_azure.py en hi

Writes a_<lang>_neural/NN.wav (24 kHz mono) next to this script; audio.py --neural then builds the
timeline and narration track from those files. Voices can be changed in VOICES below (preview them
at https://speech.microsoft.com/portal/voicegallery).
"""
import os, sys, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
from script import LINES

VOICES = {
    'en': ('en-IN', 'en-IN-NeerjaNeural'),
    'hi': ('hi-IN', 'hi-IN-SwaraNeural'),
}
RATE = '-4%'  # slightly slower than default reads more clearly over the animations


def ssml(lang, voice, text):
    text = text.replace('&', '&amp;').replace('<', '&lt;')
    return (f"<speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>"
            f"<voice name='{voice}'><prosody rate='{RATE}'>{text}</prosody></voice></speak>")


def main():
    key = os.environ.get('AZURE_SPEECH_KEY')
    region = os.environ.get('AZURE_SPEECH_REGION')
    if not key or not region:
        sys.exit('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first (see the docstring).')
    langs = sys.argv[1:] or ['en', 'hi']
    for lang in langs:
        tag, voice = VOICES[lang]
        out = os.path.join(os.path.dirname(__file__), f'a_{lang}_neural')
        os.makedirs(out, exist_ok=True)
        for i, line in enumerate(LINES[lang]):
            req = urllib.request.Request(
                f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
                data=ssml(tag, voice, line).encode('utf-8'),
                headers={
                    'Ocp-Apim-Subscription-Key': key,
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
                    'User-Agent': 'lawfilings-video',
                },
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    audio = r.read()
            except urllib.error.HTTPError as e:
                sys.exit(f'Azure said {e.code} {e.reason} for {lang} scene {i}: check the key and region.')
            with open(os.path.join(out, f'{i:02d}.wav'), 'wb') as f:
                f.write(audio)
            print(lang, i, len(audio), 'bytes')
    print('done')


if __name__ == '__main__':
    main()
