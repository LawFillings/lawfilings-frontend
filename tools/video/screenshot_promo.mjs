// One-off utility: captures screenshots for the litigant + advocate promo video script (see
// tools/video/promo_script.txt), scene by scene. Not part of the shipped app. Requires the dev
// server on :5173. Output: tools/video/screenshots_promo/
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const outDir = 'tools/video/screenshots_promo';
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const click = (sel, text, exact = false) =>
  page.evaluate(
    (sel, text, exact) => {
      const el = [...document.querySelectorAll(sel)]
        .filter((e) => (exact ? e.textContent.trim() === text : e.textContent.trim().includes(text)))
        .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
      if (el) { el.click(); return true; }
      return false;
    },
    sel, text, exact,
  );
const setInput = (selector, index, value) =>
  page.evaluate((selector, index, value) => {
    const el = document.querySelectorAll(selector)[index];
    if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, selector, index, value);
const shoot = async (name) => { await page.screenshot({ path: `${outDir}/${name}.png` }); console.log('captured', name); };
const next = async () => { const ok = await click('button', 'Continue'); await wait(700); return ok; };
const miss = (what) => console.log('MISS:', what);

async function login(role) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await page.evaluate((role) => {
    localStorage.clear();
    const advocate = role === 'advocate';
    localStorage.setItem('legalassist:auth', JSON.stringify({
      user: { id: 'promo-' + role, fullName: advocate ? 'Rohit Sharma' : 'Asha Verma', email: advocate ? 'rohit@example.com' : 'asha@example.com', role, verificationStatus: advocate ? 'verified' : 'not_applicable', ...(advocate ? { barCouncilNo: 'D/1234/2015', barState: 'Delhi' } : {}) },
      token: 'promo-fake-token',
    }));
    if (advocate) localStorage.setItem('lawfilings:advocate-details:promo-advocate', JSON.stringify({ address: 'Chamber 12, Tis Hazari Courts, Delhi - 110054', phone: '9810012345' }));
  }, role);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);
}

async function openCase(forum, categories, caseTitle) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(400);
  await click('button', 'Start a filing'); await wait(800);
  if (!(await click('button', forum))) miss('forum ' + forum);
  await wait(700);
  for (const category of categories) { if (!(await click('button', category))) miss('category ' + category); await wait(700); }
  const picked = await page.evaluate((title) => {
    const card = [...document.querySelectorAll('.case-type-card')].find((c) => c.innerText.includes(title));
    if (card) { card.click(); return true; }
    return false;
  }, caseTitle);
  if (!picked) miss('case ' + caseTitle);
  await wait(900);
}

async function run() {
  // ===== LITIGANT =====
  await login('justice_seeker');
  await shoot('01-hook-landing-hero');

  // Consumer forum case list ("have you been cheated...")
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('button', 'Start a filing'); await wait(800);
  await click('button', 'Consumer Forum'); await wait(900);
  await shoot('02-consumer-forum-case-list');

  // Consumer Complaint wizard, plain-language mode
  await openCase('Consumer Forum', [], 'Consumer Complaint');
  await click('button', 'filing for myself'); await wait(400);
  await shoot('03-wizard-dispute-type');
  await page.evaluate(() => document.querySelector('.ground-card')?.click()); await wait(300);
  await next();                                   // -> where to file
  await next();                                   // -> which state
  await click('button, li, div', 'Delhi', true); await wait(400);
  await shoot('04-wizard-which-state');
  await next();                                   // -> facts
  await setInput('textarea.facts-textarea', 0, 'I bought a washing machine from a showroom on 5 March for Rs 38,000. It stopped working within two months. The seller refused to repair or replace it despite repeated requests and a written complaint.');
  await wait(400);
  await shoot('05-wizard-tell-us-what-happened');
  await next();                                   // -> relief
  await page.evaluate(() => document.querySelector('.ground-card')?.click()); await wait(300);
  await next();                                   // -> filing details
  const fill = async () => {
    const n = await page.evaluate(() => document.querySelectorAll('.form-grid input[type=text]').length);
    const vals = ['Asha Verma', '34', '12 MG Road, New Delhi', '', '', '', '', 'New Delhi', '2026-10-03', 'New Delhi'];
    for (let i = 0; i < n; i++) if (vals[i]) await setInput('.form-grid input[type=text]', i, vals[i]);
  };
  await fill();
  await next();                                   // -> documents
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Add document'))?.click(); });
  await wait(300);
  await setInput('.form-grid input[type=text]', 0, 'Purchase invoice dated 5 March');
  await setInput('.form-grid input[type=text]', 1, '1');
  await next();                                   // -> preview
  await wait(1200);
  await shoot('06-draft-preview');
  await page.evaluate(() => { const el = [...document.querySelectorAll('*')].find((e) => e.children.length < 6 && /Next: filing this/i.test(e.textContent) && e.textContent.length < 300); el?.scrollIntoView({ block: 'center' }); });
  await wait(500);
  await shoot('07-next-filing-this-guidance');

  // Find an Advocate: capture the page then crop to the left-panel copy (directory has no real listings locally)
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('button', 'Find an Advocate', true); await wait(600);
  try { await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 8000 }); } catch {}
  await wait(400);
  await shoot('08-find-an-advocate');

  // ===== ADVOCATE =====
  await login('advocate');
  // wizard catalogue breadth
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('button', 'Start a filing'); await wait(800);
  await click('button', 'District Court'); await wait(700);
  await click('button', 'Civil Matters'); await wait(700);
  await click('button', 'Money, Contract'); await wait(900);
  await shoot('09-advocate-wizard-catalogue');

  // PDF upload autofill + prefilled advocate details, in Money Recovery Suit
  await openCase('District Court', ['Civil Matters', 'Money, Contract'], 'Money Recovery Suit');
  await click('button, li, div', 'Delhi', true); await wait(400); await next();
  await click('button, li, div', 'Central', true); await wait(400); await next();
  await shoot('10-advocate-autofill-upload-and-parties');   // pecuniary step; autofill panel is on next
  await next();
  await page.evaluate(() => { window.scrollTo(0, 0); [...document.querySelectorAll('*')].find((e) => e.children.length < 8 && /Upload|PDF/i.test(e.textContent) && e.textContent.length < 400)?.scrollIntoView({ block: 'center' }); });
  await wait(500);
  await shoot('11-advocate-pdf-autofill-panel');
  await page.evaluate(() => window.scrollTo(0, 0));
  await setInput('.form-grid input[type=text]', 0, 'A. Kumar');
  await setInput('.form-grid input[type=text]', 1, 'B. Traders Pvt Ltd');
  await setInput('.form-grid input[type=text]', 2, 'Karol Bagh, New Delhi');
  await click('button', 'Unpaid loan'); await wait(200);
  await click('button', 'Yes — commercial'); await wait(200);
  await setInput('textarea', 0, 'Loan advanced on 1 April and not repaid despite notice.');
  await next(); await next();                    // -> filing details
  await wait(600);
  await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('.form-grid')?.scrollIntoView({ block: 'start' }); window.scrollBy(0, -230); });
  await wait(400);
  await shoot('12-advocate-details-prefilled');

  // Law Library
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('.top-nav-dropdown-item, button', 'Central Acts', true); await wait(900);
  await setInput('.ll-search', 0, 'written statement'); await wait(900);
  await shoot('13-law-library-search');

  // Cause list
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('button', 'Cause List'); await wait(600);
  const clicked = await page.evaluate(() => { const i = [...document.querySelectorAll('.top-nav-dropdown-item')].find((e) => /cause list|search/i.test(e.textContent)); i?.click(); return !!i; });
  await wait(900);
  if (!clicked) miss('cause list item');
  await shoot('14-cause-list');

  // Court Fee Calculator
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await click('.top-nav-dropdown-item, button', 'Court Fee Calculator', true); await wait(900);
  const feeInput = await page.evaluate(() => !!document.querySelector('input[type=text], input[type=number]'));
  if (feeInput) {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('input')].find((i) => i.type === 'text' || i.type === 'number');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, '500000');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(500);
  }
  await shoot('15-court-fee-calculator');

  // Close: landing hero again for the logo/URL card
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(400);
  let found = false;
  for (let y = 600; y <= 4000 && !found; y += 600) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await wait(300);
    found = await page.evaluate(() => document.body.innerText.includes('actually files court cases'));
  }
  if (found) {
    await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3')].find((el) => el.textContent.includes('actually files court cases'))?.scrollIntoView({ block: 'center' }));
    await wait(400);
  } else miss('who-its-for section');
  await shoot('16-advocate-pivot-who-its-for');

  await browser.close();
  console.log('ALL DONE');
}

run().catch((e) => { console.error(e); process.exit(1); });
