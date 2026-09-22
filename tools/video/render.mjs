import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [,, lang, fpsArg, only] = process.argv;
const fps = Number(fpsArg || 24);
const data = JSON.parse(fs.readFileSync(`scenes_${lang}.json`, 'utf8'));
const dir = `frames_${lang}`;
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 4 / 3 });
await page.evaluateOnNewDocument((sb, lang) => {
  window.__SB = sb;
  localStorage.setItem('legalassist:language', lang);
}, data, lang);
await page.goto('http://localhost:5173/?storyboard', { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));
const times = only ? only.split(',').map(Number) : Array.from({ length: Math.ceil(data.total * fps) }, (_, i) => i / fps);
let n = 0;
for (const t of times) {
  await page.evaluate((t) => window.__seek(t), t);
  await page.screenshot({ path: `${dir}/f${String(n++).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (n % 200 === 0) console.log('frames', n, '/', times.length);
}
await browser.close();
console.log('done', n);
