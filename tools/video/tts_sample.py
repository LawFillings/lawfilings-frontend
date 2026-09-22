# -*- coding: utf-8 -*-
"""One-off: generate a short sample clip in an alternate (male) neural voice per language, to
compare against the female voices currently used for the explainer video (see VOICES in
tts_azure.py — Neerja/en-IN, Swara/hi-IN). Reads the same opening line so the comparison is
apples-to-apples.

Usage:
  AZURE_SPEECH_KEY='...' AZURE_SPEECH_REGION='centralindia' python3 tools/video/tts_sample.py en hi

Writes samples/<lang>-male.wav next to this script.
"""
import os, sys, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
from script import LINES

MALE_VOICES = {
    'en': ('en-IN', 'en-IN-PrabhatNeural'),
    'hi': ('hi-IN', 'hi-IN-MadhurNeural'),
}


def ssml(lang, voice, text):
    text = text.replace('&', '&amp;').replace('<', '&lt;')
    return (f"<speak version='1.0' xml:lang='{lang}' xmlns='http://www.w3.org/2001/10/synthesis'>"
            f"<voice name='{voice}'>{text}</voice></speak>")


def main():
    key = os.environ.get('AZURE_SPEECH_KEY')
    region = os.environ.get('AZURE_SPEECH_REGION')
    if not key or not region:
        sys.exit('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first.')
    langs = sys.argv[1:] or ['en', 'hi']
    out_dir = os.path.join(os.path.dirname(__file__), 'samples')
    os.makedirs(out_dir, exist_ok=True)
    for lang in langs:
        tag, voice = MALE_VOICES[lang]
        text = LINES[lang][0]  # the welcome line — same text as the current female-voice sample
        req = urllib.request.Request(
            f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
            data=ssml(tag, voice, text).encode('utf-8'),
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
            sys.exit(f'Azure said {e.code} {e.reason} for {lang}: check the key and region.')
        path = os.path.join(out_dir, f'{lang}-male.wav')
        with open(path, 'wb') as f:
            f.write(audio)
        print(lang, voice, len(audio), 'bytes ->', path)
    print('done')


if __name__ == '__main__':
    main()
