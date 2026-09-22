// One-off: captures real screenshots of the running app (mock-authed local dev server, same
// code as lawfilings.in) for the "fly-in/fly-out" page shots composited into the explainer
// video slides. Run with the dev server up: `npm run dev` (or preview_start) on :5173.
//   node tools/video/capture.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const OUT = new URL('./screens/', import.meta.url).pathname.split('/').map(decodeURIComponent).join('/');
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  localStorage.setItem(
    'legalassist:auth',
    JSON.stringify({
      user: { id: 'u1', fullName: 'Test Advocate', email: 't@example.com', role: 'advocate', verificationStatus: 'verified' },
      token: 'mock',
    })
  );
  localStorage.setItem('legalassist:language', 'en');
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function click(pred) {
  const ok = await page.evaluate((predSrc) => {
    // eslint-disable-next-line no-eval
    const fn = eval(predSrc);
    const b = [...document.querySelectorAll('button, a')].find(fn);
    if (!b) return false;
    b.click();
    return true;
  }, pred.toString());
  await sleep(500);
  return ok;
}

async function shoot(name) {
  await sleep(600);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log('shot', name);
}

// The step rail only allows going BACK to a visited step or staying put — `disabled={i > currentStep}`
// in WizardShell.tsx — so advancing has to go through the real Continue button, one step at a time.
async function continueSteps(n) {
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => document.querySelector('.step-nav-btn.primary')?.click());
    await sleep(350);
  }
}

async function fresh() {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await sleep(1200);
}

// --- NI Act Cheque Dishonour Complaint wizard: upload step, plain-language step, preview ---
await fresh();
await click((b) => b.textContent.trim().startsWith('Start a filing'));
await click((b) => b.classList.contains('forum-tab') && b.textContent.trim() === 'District Court');
await click((b) => b.classList.contains('top-category-tab') && b.textContent.trim().startsWith('Criminal'));
await click((b) => b.classList.contains('subcategory-tab') && b.textContent.trim().startsWith('Trial Stage'));
await page.evaluate(() => {
  const c = [...document.querySelectorAll('.case-type-card')].find((c) => /Cheque Dishonour/.test(c.textContent));
  c?.click();
});
await sleep(1200);
await shoot('upload-step'); // step 0 — has the "Fill from the bank's cheque return memo (PDF)" button
await continueSteps(2); // -> step 2, Parties
await shoot('parties-step');
await continueSteps(3); // -> step 5, Preview
await shoot('draft-preview');

// --- DRT Written Statement wizard: Deadline step ---
await fresh();
await click((b) => b.textContent.trim().startsWith('Start a filing'));
await click((b) => b.classList.contains('forum-tab') && b.textContent.trim() === 'DRT/DRAT');
await page.evaluate(() => {
  const c = [...document.querySelectorAll('.case-type-card')].find((c) => /Written Statement/.test(c.textContent));
  c?.click();
});
await sleep(1200);
await continueSteps(2); // -> step 2, Deadline
await shoot('deadline');

// --- Home picker (court/forum buttons) ---
await fresh();
await click((b) => b.textContent.trim().startsWith('Start a filing'));
await shoot('home-picker');

// --- My Cases --- (stub the cases fetch: no local backend running for this capture, and the
// real error toast it produces isn't representative of the product for a demo screenshot)
await page.evaluateOnNewDocument(() => {
  const real = window.fetch;
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('/api/cases')) {
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return real(input, init);
  };
});
await fresh();
await click((b) => b.textContent.trim() === 'My Cases');
await shoot('my-cases');

// --- Law Library / Central Acts ---
await fresh();
await click((b) => b.textContent.trim() === '☰');
await sleep(300);
await page.evaluate(() => {
  [...document.querySelectorAll('.app-sidebar-expand-btn')].find((b) => b.textContent.includes('Constitution'))?.click();
});
await sleep(300);
await page.evaluate(() => {
  [...document.querySelectorAll('.app-sidebar-submenu .app-sidebar-sublink')].find((b) => b.textContent.trim() === 'Central Acts')?.click();
});
await sleep(500); // lets the drawer's own slide-closed transition finish before the shot
await shoot('law-library');

await browser.close();
console.log('done');
