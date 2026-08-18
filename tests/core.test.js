const test = require('node:test');
const assert = require('node:assert/strict');

const Settings = require('../lib/settings.js');
const PrivacySettings = require('../lib/privacy-settings.js');
const AdblockConfig = require('../lib/adblock-config.js');
const AdguardFilters = require('../lib/adguard-filters.js');
const AdguardUtils = require('../lib/adguard-utils.js');

test('settings default to strict filtering and privacy protection', () => {
  const settings = Settings.sanitizeSettings();

  assert.equal(settings.adguard.enabled, true);
  assert.deepEqual(settings.adguard.filterIds, [2, 3, 17, 18, 19, 20, 21, 22, 105]);
  assert.equal(settings.adguard.braveEnabled, true);
  assert.deepEqual(settings.adguard.allowlist, []);
  assert.deepEqual(settings.adguard.rules, []);
  assert.equal(settings.privacy.blockThirdPartyCookies, true);
  assert.equal(settings.privacy.disableRelatedWebsiteSets, true);
  assert.equal(settings.theme, 'system');
});

test('settings sanitize untrusted values and discard old YouTube state', () => {
  const settings = Settings.sanitizeSettings({
    youtube: { enabled: true },
    adguard: {
      enabled: false,
      braveEnabled: false,
      scope: 'youtube',
      filterIds: [18, 2, 18, -1, '3'],
      allowlist: ['Example.com', 'Example.com', 42],
      rules: ['example.org##.ad', '', 42]
    },
    privacy: {
      blockThirdPartyCookies: false,
      disableRelatedWebsiteSets: true
    },
    theme: 'neon'
  });

  assert.deepEqual(settings.adguard.filterIds, [2, 18]);
  assert.equal(settings.adguard.braveEnabled, false);
  assert.deepEqual(settings.adguard.allowlist, ['Example.com']);
  assert.deepEqual(settings.adguard.rules, ['example.org##.ad']);
  assert.equal(settings.adguard.scope, undefined);
  assert.equal(settings.youtube, undefined);
  assert.equal(settings.privacy.blockThirdPartyCookies, false);
  assert.equal(settings.theme, 'system');
  assert.deepEqual(Settings.sanitizeSettings(settings), settings);
});

test('AdGuard configuration is global and preserves all public fields', () => {
  const configuration = AdblockConfig.createAdguardConfiguration({
    enabled: true,
    filterIds: [2, 3, 17],
    allowlist: ['example.com'],
    rules: ['example.org##.ad']
  }, {
    documentBlockingPageUrl: 'chrome-extension://id/blocking-page.html',
    additionalRules: ['brave.example##.ad']
  });

  assert.deepEqual(configuration.filters, [2, 3, 17]);
  assert.equal(configuration.filteringEnabled, true);
  assert.equal(configuration.assetsPath, 'filters');
  assert.deepEqual(configuration.allowlist, ['example.com']);
  assert.deepEqual(configuration.rules, [
    'autosimpach.cz##.PKCKS',
    'tickets.nfctron.com##[data-testid="cookie-banner-root"]',
    'brave.example##.ad',
    'example.org##.ad'
  ]);
  assert.equal(configuration.documentBlockingPageUrl, 'chrome-extension://id/blocking-page.html');
  assert.equal(configuration.blocklist, undefined);
});

test('strict is the catalog-aware default filter preset', () => {
  const catalog = [2, 3, 17, 18, 19, 20, 21, 22, 105].map((id) => ({ id }));

  assert.deepEqual(AdguardFilters.defaultFilterIds(catalog), [2, 3, 17, 18, 19, 20, 21, 22, 105]);
  assert.equal(AdguardFilters.presetForFilterIds([105, 22, 21, 20, 19, 18, 17, 3, 2]), 'strict');
  assert.deepEqual(AdguardFilters.sanitizeFilterIds([18, 2, 999], catalog), [2, 18]);
});

test('domain helpers normalize lists and reject unsafe schemes', () => {
  assert.equal(AdguardUtils.normalizeHostname('HTTPS://Example.COM:443/path'), 'example.com');
  assert.equal(AdguardUtils.normalizeHostname('javascript:alert(1)'), null);
  assert.equal(AdguardUtils.normalizeHostname('bad host'), null);
  assert.deepEqual(
    AdguardUtils.parseDomainList('Example.com\nhttps://example.com/x\nsub.example.com\n'),
    ['example.com', 'sub.example.com']
  );
});

test('request log deduplicates request IDs and stays bounded', () => {
  let log = [];
  log = AdguardUtils.mergeBlockedRequest(log, {
    requestId: 'a',
    requestUrl: 'https://ads.example/a.js',
    assumedFilterId: 2
  }, 2);
  log = AdguardUtils.mergeBlockedRequest(log, {
    requestId: 'a',
    requestUrl: 'https://ads.example/a.js',
    companyCategoryName: 'Advertising'
  }, 2);
  log = AdguardUtils.mergeBlockedRequest(log, { requestId: 'b' }, 2);
  log = AdguardUtils.mergeBlockedRequest(log, { requestId: 'c' }, 2);

  assert.deepEqual(log.map((entry) => entry.requestId), ['b', 'c']);
});

test('privacy adapter blocks third-party cookies and related website sets', async () => {
  const thirdPartyCookiesAllowed = fakeChromeSetting(true);
  const relatedWebsiteSetsEnabled = fakeChromeSetting(true);

  const status = await PrivacySettings.applyPrivacySettings({
    websites: { thirdPartyCookiesAllowed, relatedWebsiteSetsEnabled }
  }, PrivacySettings.DEFAULT_PRIVACY_SETTINGS);

  assert.equal(thirdPartyCookiesAllowed.value, false);
  assert.equal(relatedWebsiteSetsEnabled.value, false);
  assert.equal(status.thirdPartyCookies.applied, true);
  assert.equal(status.relatedWebsiteSets.applied, true);
});

test('privacy adapter reports policy control without claiming success', async () => {
  const thirdPartyCookiesAllowed = fakeChromeSetting(true, 'controlled_by_other_extensions');

  const status = await PrivacySettings.applyPrivacySettings({
    websites: { thirdPartyCookiesAllowed }
  }, PrivacySettings.DEFAULT_PRIVACY_SETTINGS);

  assert.equal(thirdPartyCookiesAllowed.setCalls, 0);
  assert.equal(status.thirdPartyCookies.applied, false);
  assert.equal(status.thirdPartyCookies.levelOfControl, 'controlled_by_other_extensions');
  assert.equal(status.relatedWebsiteSets.available, false);
});

test('privacy adapter clears only overrides owned by this extension', async () => {
  const thirdPartyCookiesAllowed = fakeChromeSetting(false, 'controlled_by_this_extension');

  const status = await PrivacySettings.applyPrivacySettings({
    websites: { thirdPartyCookiesAllowed }
  }, {
    blockThirdPartyCookies: false,
    disableRelatedWebsiteSets: false
  });

  assert.equal(thirdPartyCookiesAllowed.clearCalls, 1);
  assert.equal(status.thirdPartyCookies.applied, true);
});

test('privacy adapter contains API failures', async () => {
  const failingSetting = {
    async get() {
      throw new Error('managed policy failure');
    }
  };

  const status = await PrivacySettings.applyPrivacySettings({
    websites: { thirdPartyCookiesAllowed: failingSetting }
  }, PrivacySettings.DEFAULT_PRIVACY_SETTINGS);

  assert.equal(status.thirdPartyCookies.applied, false);
  assert.equal(status.thirdPartyCookies.error, 'managed policy failure');
});

test('YAML compatibility layer keeps AdGuard Scriptlets on the patched parser', async () => {
  const { default: yaml } = await import('../vendor/js-yaml-compat/index.js');
  assert.deepEqual(yaml.safeLoad('name: redirect\nenabled: true\n'), {
    name: 'redirect',
    enabled: true
  });
});

function fakeChromeSetting(value, levelOfControl = 'controllable_by_this_extension') {
  return {
    value,
    levelOfControl,
    setCalls: 0,
    clearCalls: 0,
    async get() {
      return { value: this.value, levelOfControl: this.levelOfControl };
    },
    async set(details) {
      this.setCalls += 1;
      this.value = details.value;
      this.levelOfControl = 'controlled_by_this_extension';
    },
    async clear() {
      this.clearCalls += 1;
      this.levelOfControl = 'controllable_by_this_extension';
    }
  };
}
