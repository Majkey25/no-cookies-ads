import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fc = '<div class="fc-consent-root notice"><div class="fc-dialog" role="dialog">Consent</div></div>';
const toyo = '<div class="fixed inset-0 z-50 notice"><svg aria-label="TOYO TIRES"></svg><button>Necessary only</button><button>Accept all</button></div>';
const pneu = '<div class="bs-dialog-overlay notice" data-for-id="CookiesConfirmation"></div><div id="CookiesConfirmation" class="notice">Cookies</div>';
const fixtures = [
  ['www.zlin.charita.cz', '<div id="cmp-banner" class="notice"><div id="cmp-banner-main">Privacy</div></div>'],
  ['vw-parts.cz', '<div id="privacypolicies-com---nb" class="notice" role="dialog" aria-modal="true">Privacy</div>'],
  ...['www.mazdaclub.cz', 'www.volkswagenclub.net', 'zpravyzmoravy.cz', 'www.vag-coding.net'].map(host => [host, fc]),
  ['www.pneufloryk.cz', pneu],
  ['toyotires.eu', toyo],
  ['edalnice.gov.cz', '<div class="fixed bottom-0 notice"><a href="/cs/cookies">Cookies</a><button>Settings</button></div>']
];

test('packaged extension hides cookie layers without breaking page controls', { timeout: 180000 }, async t => {
  const scratch = path.join(root, '.reference/tmp');
  await fs.mkdir(scratch, { recursive: true });
  const profile = await fs.mkdtemp(path.join(scratch, 'cookie-browser-'));
  const extension = path.join(root, 'dist/extension');
  let fixtureHtml = '';
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html' });
    response.end(fixtureHtml);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  const port = server.address().port;
  const hosts = [...fixtures.map(([host]) => host), 'example.org'];
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`,
      `--host-resolver-rules=${hosts.map(host => `MAP ${host} 127.0.0.1`).join(',')}`]
  });
  t.after(async () => {
    await context.close();
    assert.equal(path.dirname(profile), scratch);
    await fs.rm(profile, { recursive: true, force: true });
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
  const state = await popup.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_ADGUARD_STATE' }));
  assert.equal(state.engineRunning, true, state.lastConfigurationError);

  async function openFixture(host, markup, locked = true) {
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    fixtureHtml = `<!doctype html>
      <style>html{overflow-y:${host === 'www.pneufloryk.cz' && locked ? 'hidden' : 'auto'}}
      body{margin:0;height:2400px;overflow-y:${locked ? 'hidden' : 'auto'}}
      .notice{position:fixed;inset:0;z-index:99;background:#ddd}</style>
      <div id="cookie-sentinel" style="position:fixed">Filter sentinel</div>
      <button id="content" onclick="this.textContent='Clicked'">Page control</button>${markup}`;
    await page.goto(`http://${host}:${port}/extension-regression`);
    await page.locator('#cookie-sentinel').waitFor({ state: 'hidden' });
    return page;
  }

  for (const [host, markup] of fixtures) {
    await t.test(host, async () => {
      const locked = markup === fc || markup === toyo || markup === pneu;
      const page = await openFixture(host, markup, locked);
      try {
        await page.waitForFunction(() => [...document.querySelectorAll('.notice')].every(e => getComputedStyle(e).display === 'none'));
        await page.locator('#content').click();
        assert.equal(await page.locator('#content').innerText(), 'Clicked');
        await page.mouse.move(300, 300);
        await page.mouse.wheel(0, 500);
        await page.waitForFunction(() => window.scrollY > 0);
      } finally {
        await page.close();
      }
    });
  }

  for (const [host, markup] of [['www.mazdaclub.cz', fc], ['toyotires.eu', toyo]]) {
    await t.test(`${host} hides late banners and keeps ordinary dialogs locked`, async () => {
      const page = await openFixture(host, markup + '<dialog open aria-modal="true">Checkout</dialog>');
      try {
        await page.locator('.notice').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('dialog').isVisible(), true);
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
        await page.evaluate(() => {
          document.querySelector('dialog').remove();
          document.querySelector('.notice').remove();
          document.body.insertAdjacentHTML('beforeend', '<div id="cmp-banner" class="notice"><div id="cmp-banner-main">Late banner</div></div>');
        });
        await page.locator('#cmp-banner').waitFor({ state: 'hidden' });
      } finally {
        await page.close();
      }
    });
  }

  await t.test('site-specific rules do not hide a similar dialog on another domain', async () => {
    const page = await openFixture('example.org', toyo + '<div id="cmp-banner"><div id="cmp-banner-main">Sentinel</div></div>');
    try {
      await page.locator('#cmp-banner').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.notice').isVisible(), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
    } finally {
      await page.close();
    }
  });

  for (const [name, extra, locked] of [
    ['open native dialog', '<dialog open>Checkout</dialog>', true],
    ['open custom dialog', '<div aria-modal="true">Checkout</div>', true],
    ['active backdrop', '<div class="bs-dialog-overlay" data-for-id="Checkout">Checkout</div>', true],
    ['inactive backdrop', '<div class="bs-dialog-overlay" data-for-id="Checkout" style="display:none">Checkout</div>', false]
  ]) {
    await t.test(`Pneufloryk preserves ${name}`, async () => {
      const page = await openFixture('www.pneufloryk.cz', pneu + extra);
      try {
        await page.waitForFunction(() => [...document.querySelectorAll('.notice')].every(e => getComputedStyle(e).display === 'none'));
        await page.waitForFunction(expected => [document.documentElement, document.body].every(e => getComputedStyle(e).overflowY === expected), locked ? 'hidden' : 'auto');
        if (locked) assert.equal(await page.getByText('Checkout').isVisible(), true);
      } finally {
        await page.close();
      }
    });
  }

  await t.test('a branded Toyo dialog without consent controls stays locked and visible', async () => {
    const page = await openFixture('toyotires.eu', '<div class="fixed inset-0 z-50 notice"><svg aria-label="TOYO TIRES"></svg>Dealer</div><div id="cmp-banner"><div id="cmp-banner-main">Sentinel</div></div>');
    try {
      await page.locator('#cmp-banner').waitFor({ state: 'hidden' });
      assert.equal(await page.locator('.notice').isVisible(), true);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'hidden');
    } finally {
      await page.close();
    }
  });

  await t.test('allowlisting restores the banner and protecting the site hides it again', async () => {
    const page = await openFixture('toyotires.eu', toyo);
    try {
      await page.locator('.notice').waitFor({ state: 'hidden' });
      await popup.locator('details').filter({ has: popup.locator('#allowlistEditor') }).locator('summary').click();
      for (const allowed of [true, false]) {
        await popup.locator('#allowlistEditor').fill(allowed ? 'toyotires.eu' : '');
        await popup.locator('#allowlistApply').click();
        await popup.locator('#adguardStatus').filter({ hasText: 'Allowlist applied' }).waitFor();
        await popup.waitForFunction(async expected => {
          const result = await chrome.runtime.sendMessage({ type: 'GET_ADGUARD_STATE' });
          return result.settings.adguard.allowlist.includes('toyotires.eu') === expected;
        }, allowed);
        await page.reload();
        await page.locator('.notice').waitFor({ state: allowed ? 'visible' : 'hidden' });
      }
    } finally {
      await page.close();
    }
  });
});
