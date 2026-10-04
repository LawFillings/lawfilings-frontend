// Renders cartoon.html frames for a timeline. Usage: node render.mjs en 24 [t1,t2,...]  (comma list = preview frames only)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const [,, lang = 'en', fpsArg = '24', only] = process.argv;   // lang = en | hi | builtfor
const fps = Number(fpsArg);
const tl = JSON.parse(fs.readFileSync(path.join(here, `timeline_${lang}.json`), 'utf8'));
const dir = path.join(here, only ? `preview_${lang}` : `frames_${lang}`);
fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none', '--allow-file-access-from-files', '--disable-gpu', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows', '--disable-frame-rate-limit', '--disable-features=CalculateNativeWinOcclusion'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('page:', m.text()); });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.evaluateOnNewDocument((l) => { window.__LANG = l; }, lang);
await page.goto('file://' + path.join(here, lang.startsWith('builtfor') ? 'builtfor.html' : 'cartoon.html'));
await page.evaluate(() => document.fonts.ready);
await page.evaluate((tl) => window.__setTimeline(tl), tl);
const times = only ? only.split(',').map(Number) : Array.from({ length: Math.ceil(tl.total * fps) }, (_, i) => i / fps);
let n = 0;
for (const t of times) {
  await page.evaluate((t) => window.__seek(t), t);
  await page.screenshot({ path: path.join(dir, only ? `t${String(t).replace('.', '_')}.png` : `f${String(n).padStart(5, '0')}.jpg`), ...(only ? {} : { type: 'jpeg', quality: 90 }) });
  n++;
  if (!only && n % 300 === 0) console.log('frames', n, '/', times.length);
}
await browser.close();
console.log('done', n);
