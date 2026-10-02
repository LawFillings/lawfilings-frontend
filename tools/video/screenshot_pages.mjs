// One-off utility: captures representative page screenshots for marketing/explainer-video use,
// pairing real product screens with narration scenes. Not part of the shipped app. Re-run any time
// fresh screenshots are needed as the product changes. Requires the dev server running on :5173.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const outDir = 'tools/video/screenshots';
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

async function clickByText(selector, text, { exact = false } = {}) {
  return page.evaluate(
    (selector, text, exact) => {
      const els = [...document.querySelectorAll(selector)];
      const match = els.find((el) => {
        const t = el.textContent.trim();
        return exact ? t === text : t.includes(text);
      });
      if (match) {
        match.click();
        return true;
      }
      return false;
    },
    selector,
    text,
    exact,
  );
}

async function shoot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log('captured', name);
}

async function goHome() {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await wait(500);
}

async function run() {
  // Log in as a disposable test user so wizard steps (which require an account) are reachable.
  await goHome();
  await page.evaluate(() => {
    localStorage.setItem(
      'legalassist:auth',
      JSON.stringify({
        user: { id: 'screenshot-user', fullName: 'Asha Verma', email: 'asha@example.com', role: 'justice_seeker', verificationStatus: 'not_applicable' },
        token: 'screenshot-fake-token',
      }),
    );
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(500);

  // 1. Landing hero
  await shoot('01-hook-landing-hero');

  // 2. "Who it's for" section — scroll down the landing page in steps until it's in view.
  let found = false;
  for (let y = 600; y <= 4000 && !found; y += 600) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await wait(300);
    found = await page.evaluate(() => document.body.innerText.includes('actually files court cases'));
  }
  if (found) {
    await page.evaluate(() => {
      const heading = [...document.querySelectorAll('h1, h2, h3')].find((el) => el.textContent.includes('actually files court cases'));
      if (heading) heading.scrollIntoView({ block: 'center' });
    });
    await wait(400);
    await shoot('07-who-its-for');
  } else {
    console.log('MISS: who-its-for heading not found after scrolling');
  }

  // 3. Start a Filing — forum picker
  await goHome();
  let ok = await clickByText('button', 'Start a filing');
  await wait(900);
  const hasPicker = await page.evaluate(() => !!document.querySelector('.trio-filter-btn, .forum-tab'));
  if (!hasPicker) {
    await clickByText('button', 'Start a filing');
    await wait(900);
  }
  await shoot('03-coverage-forum-picker');

  // 4. A wizard's first step (District Court -> Civil Matters -> first case type)
  ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.trio-filter-btn, .forum-tab')].find((el) => el.textContent.includes('District Court'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(700);
  if (!ok) console.log('MISS: District Court button');

  ok = await clickByText('button', 'Civil Matters');
  await wait(700);
  if (!ok) console.log('MISS: Civil Matters button');

  const hasSubcat = await page.evaluate(() => !!document.querySelector('.subcategory-tabs button, .top-category-tabs button'));
  if (hasSubcat) {
    await page.evaluate(() => {
      const btn = document.querySelector('.subcategory-tabs button, .top-category-tabs button');
      if (btn) btn.click();
    });
    await wait(700);
  }

  ok = await page.evaluate(() => {
    const card = document.querySelector('.case-type-card');
    if (card) { card.click(); return true; }
    return false;
  });
  await wait(1000);
  const onLogin = await page.evaluate(() => document.body.innerText.includes('Access your saved cases'));
  if (onLogin) console.log('STILL ON LOGIN — auth injection did not take, check the localStorage key/shape');
  if (!ok) console.log('MISS: case-type-card');
  await shoot('02-what-it-is-wizard-step');

  // 5. Law Library — real Act section text, via the search box (simpler/more reliable than
  //    driving the Act-picker dropdown: type a query, screenshot the resulting section cards).
  await goHome();
  ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.top-nav-dropdown-item, button')].find((el) => el.textContent.trim() === 'Central Acts');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(900);
  if (!ok) console.log('MISS: Central Acts link');
  const typed = await page.evaluate(() => {
    const input = document.querySelector('.ll-search');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'written statement');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  });
  if (!typed) console.log('MISS: Law Library search input (.ll-search)');
  await wait(900);
  await shoot('05a-sourced-law-act-text');

  // 6. Legal Dictionary
  await goHome();
  ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.top-nav-dropdown-item, button')].find((el) => el.textContent.trim() === 'Legal Dictionary');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(900);
  if (!ok) console.log('MISS: Legal Dictionary link');
  await page.evaluate(() => {
    const row = document.querySelector('.ld-term-row');
    if (row) row.click();
  });
  await wait(400);
  await shoot('05b-sourced-law-dictionary');

  // 7. Court Fee Calculator
  await goHome();
  ok = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.top-nav-dropdown-item, button')].find((el) => el.textContent.trim() === 'Court Fee Calculator');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await wait(900);
  if (!ok) console.log('MISS: Court Fee Calculator link');
  await shoot('06a-beyond-filing-court-fee');

  // 8. Find an Advocate — wait for the directory list request to settle either way (results or
  //    the "no matches" empty state), rather than a fixed guess.
  await goHome();
  ok = await clickByText('button', 'Find an Advocate', { exact: true });
  await wait(600);
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Loading...'), { timeout: 8000 });
  } catch {
    console.log('Find an Advocate: still loading after 8s, capturing anyway');
  }
  await wait(400);
  await shoot('06b-beyond-filing-find-advocate');

  await browser.close();
  console.log('ALL DONE');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
