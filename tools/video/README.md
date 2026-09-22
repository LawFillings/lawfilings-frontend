# Landing-page explainer video

Rebuilds the two videos behind `src/components/LandingVideo.tsx`
(`public/videos/explainer-{en,hi}.mp4`) whenever the landing copy, artwork, or narration changes.
The frames are the real site slides — `src/video/Storyboard.tsx`, a dev-only page (`?storyboard`)
that isn't part of the shipped app — screenshotted one by one, so the video always matches the
live slideshow art. Nothing here runs on the site; these are one-off build scripts.

## One-time setup

```
npm i puppeteer-core   # in this folder — not a project dependency, kept out of package.json
```

Also needs `ffmpeg` on PATH (or point FF at a downloaded binary, e.g. via `pip3 install --user
imageio-ffmpeg` and `python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())"`).

## Steps

1. **Narration.** Either:
   - Quick placeholder, no account needed: `python3 audio.py en` / `python3 audio.py hi` (macOS
     `say`, obviously synthetic — fine for a first pass, not for shipping).
   - Real voice: get an Azure AI Speech key (free tier) and run
     `AZURE_SPEECH_KEY='...' AZURE_SPEECH_REGION='<region>' python3 tts_azure.py en hi`, then
     `python3 audio.py en --neural` / `python3 audio.py hi --neural`.
   - Or record your own per-language file and adapt `audio.py` to read it instead of synthesizing.
   Each writes `narration_<lang>.wav` and `scenes_<lang>.json` (per-scene start/end/caption times).

2. **Captions.** `python3 vtt.py en` / `python3 vtt.py hi` → `captions_<lang>.vtt`. Copy into
   `captions/captions-<lang>.vtt` if publishing them (not currently attached to the `<video>`).

3. **Frames.** With the project's dev server running (`npm run dev` from the repo root — if port
   5173 is taken by another session, run `PORT=<free-port> npm run dev` and edit the URL in
   `render.mjs` to match before running it):
   `node render.mjs en 24` / `node render.mjs hi 24` → `frames_<lang>/f*.jpg` (960×540, 24fps).

4. **Encode.**
   ```
   ffmpeg -y -framerate 24 -i frames_en/f%05d.jpg -i narration_en.wav \
     -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -c:a aac -b:a 128k -shortest \
     -movflags +faststart lawfilings-explainer-en.mp4
   ffmpeg -ss 4 -i lawfilings-explainer-en.mp4 -frames:v 1 -q:v 3 poster-en.jpg
   ```
   Repeat for `hi`.

5. **Publish.** Copy the two `.mp4`s to `public/videos/explainer-{en,hi}.mp4` and the two posters
   to `public/videos/poster-{en,hi}.jpg`. `LandingVideo.tsx`'s `VIDEO_LANGUAGES` list decides which
   site languages get their own video; every other language falls back to English.

The narration script/lines live in `script.py` (`LINES`) — edit there when the landing copy
changes, alongside the actual translated strings in `src/lib/translations/*.ts`.

Everything this folder generates (`frames_*/`, `a_*/`, `narration_*.wav`, `scenes_*.json`,
`node_modules/`, the built `.mp4`/`.jpg` files, `package.json`) is scratch output — regenerate it,
don't commit it. Only the scripts and the two published `.vtt` files are checked in.
