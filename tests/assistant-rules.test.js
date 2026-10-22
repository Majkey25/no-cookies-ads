const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const ProtectionSettings = require('../lib/settings.js');

test('Assistant persists only a single blocking rule and keeps explicit user exceptions', async () => {
  const { RuleParser } = await import('@adguard/agtree-runtime');
  const background = await fs.readFile(path.join(__dirname, '../src/background.js'), 'utf8');
  let settings = ProtectionSettings.sanitizeSettings({ adguard: { rules: ['@@||trusted.example^'] } });
  let writes = 0;
  const context = vm.createContext({
    RuleParser, ProtectionSettings, console: { warn() {}, error() {} },
    chrome: { storage: { local: { async get() { return { settings }; } } } },
    async applyAdguardConfiguration(adguard, persist) {
      assert.equal(persist, true);
      settings = { ...settings, adguard };
      writes += 1;
    }
  });
  vm.runInContext(background.slice(background.indexOf('async function handleAssistantRule('),
    background.indexOf('function handleBlockedRequest(')), context);
  for (const rule of [
    '@@*', '@@*$domain=example.org', '@@||tracker.example^',
    '||ads.example^$ badfilter', '||ads.example^$image,badfilter',
    '@@||example.org^$document', 'example.org#@#.banner',
    '! comment', 'example.org##+js(set-constant, a, true)',
    'example.org#%#window.acceptCookies()', 'example.org#$#body { display: none; }',
    'example.org##body:style(display:block !important)',
    'example.org##.banner\n@@*', 'example.org##.banner\r@@*'
  ]) {
    await context.handleAssistantRule(rule);
    assert.equal(writes, 0, rule);
  }
  for (const rule of ['example.org##.banner', '||ads.example/image.png$domain=example.org', 'https://ads.example/image.png']) {
    await context.handleAssistantRule(rule);
    assert.ok(settings.adguard.rules.includes(rule));
    assert.ok(settings.adguard.rules.includes('@@||trusted.example^'));
  }
  await context.handleAssistantRule('example.org##.banner');
  assert.equal(writes, 3);
});
