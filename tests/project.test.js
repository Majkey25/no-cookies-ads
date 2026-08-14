const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertProjectFile(relativePath) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
}

test('package and manifest identify No Cookies & Ads v1.0.1', () => {
  const packageJson = readJson('package.json');
  const manifest = readJson('manifest.json');

  assert.equal(packageJson.name, 'no-cookies-ads');
  assert.equal(packageJson.version, '1.0.1');
  assert.equal(manifest.name, 'No Cookies & Ads');
  assert.equal(manifest.version, '1.0.1');
  assert.equal(packageJson.license, 'GPL-3.0-only');
  assert.equal(packageJson.dependencies['js-yaml'], 'file:vendor/js-yaml-compat');
  assert.equal(packageJson.dependencies['js-yaml-modern'], 'npm:js-yaml@5.3.0');
  assert.equal(packageJson.overrides['js-yaml'], '$js-yaml');
});

test('manifest grants filtering and privacy access without YouTube code', () => {
  const manifest = readJson('manifest.json');

  for (const permission of [
    'storage',
    'tabs',
    'webRequest',
    'webNavigation',
    'unlimitedStorage',
    'scripting',
    'declarativeNetRequest',
    'declarativeNetRequestFeedback',
    'privacy'
  ]) {
    assert.ok(manifest.permissions.includes(permission), permission);
  }
  assert.deepEqual(manifest.host_permissions, ['<all_urls>']);
  assert.equal(manifest.background.service_worker, 'background.js');
  assert.equal(manifest.content_scripts.length, 1);
  assert.deepEqual(manifest.content_scripts[0].js, ['adguard-content.js']);
  assert.doesNotMatch(JSON.stringify(manifest), /youtube|sponsorblock/i);
});

test('popup exposes filtering, privacy, and recovery controls', () => {
  const html = readText('popup.html');

  for (const id of [
    'adguardEnabled',
    'blockThirdPartyCookies',
    'disableRelatedWebsiteSets',
    'privacyState',
    'currentSiteProtection',
    'filterPreset',
    'filterList',
    'allowlistEditor',
    'userRulesEditor',
    'assistantOpen',
    'requestLog',
    'adguardDiagnostics',
    'adguardStatus'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  for (const theme of ['light', 'dark', 'system']) {
    assert.match(html, new RegExp(`data-theme-value="${theme}"`));
  }
  assert.match(html, /No Cookies &amp; Ads/);
  assert.match(html, /browser traffic/i);
  assert.doesNotMatch(html, /youtube|sponsorblock/i);
});

test('background exposes atomic filtering and privacy operations', () => {
  const background = readText('src/background.js');

  for (const token of [
    'getRulesCount',
    'onAssistantCreateRule.subscribe',
    'onRequestBlocked.addListener',
    '.configure(',
    'APPLY_ADGUARD_SETTINGS',
    'APPLY_PRIVACY_SETTINGS',
    'applyPrivacySettings',
    'MAX_BLOCKED_REQUESTS = 200',
    'lastAppliedSettings = previous'
  ]) {
    assert.match(background, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(background, /GET_SEGMENTS|SponsorBlock|segmentCache/);
});

test('build discovers packaged rules and enables strict defaults', () => {
  const build = readText('scripts/build.mjs');

  assert.match(build, /discoverFilterCatalog/);
  assert.match(build, /catalog\.json/);
  assert.match(build, /strictFilterIds/);
  assert.match(build, /excludeUnsafeRulesCrossPlatform/);
  assert.match(build, /normalizeManifestRulePaths/);
  assert.match(build, /ManifestPatcher/);
  assert.match(build, /MAX_STATIC_RULESETS = 100/);
  assert.doesNotMatch(build, /youtube|sponsorblock/i);
});

test('blocking page and Assistant use packaged safe code', () => {
  for (const file of ['blocking-page.html', 'blocking-page.css', 'blocking-page.js', 'src/adguard-assistant.js']) {
    assertProjectFile(file);
  }

  const blockingPage = readText('blocking-page.js');
  const assistantEntry = readText('src/adguard-assistant.js');
  assert.match(blockingPage, /textContent/);
  assert.doesNotMatch(blockingPage, /innerHTML/);
  assert.match(assistantEntry, /@adguard\/api-mv3\/assistant/);
});

test('documentation is accurate and includes release assets and boundary', () => {
  const readme = readText('README.md');
  const releaseNotes = readText('RELEASE_NOTES.md');

  assert.match(readme, /Majkey25\/no-cookies-ads/);
  assert.match(readme, /Cookie Notices/);
  assert.match(readme, /third-party cookies/i);
  assert.match(readme, /not.*device-wide DNS/is);
  assert.match(readme, /request log/i);
  assert.match(readme, /no analytics|no telemetry/i);
  assert.doesNotMatch(readme, /youtube|sponsorblock/i);
  assert.match(releaseNotes, /v1\.0\.1/);
  assert.match(releaseNotes, /no-cookies-ads\.zip/);
});

test('release scripts use stable and versioned No Cookies & Ads names', () => {
  const pack = readText('scripts/package.mjs');
  const workflow = readText('.github/workflows/release.yml');

  assert.match(pack, /no-cookies-ads\.zip/);
  assert.match(pack, /no-cookies-ads-v/);
  assert.match(pack, /filters\/catalog\.json/);
  assert.match(workflow, /No Cookies & Ads/);
  assert.doesNotMatch(`${pack}\n${workflow}`, /yt-segments|autoskipper/i);
});
