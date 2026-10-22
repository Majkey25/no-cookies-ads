const test = require('node:test');
const assert = require('node:assert/strict');

const BraveRules = require('../lib/brave-rules.js');

test('Brave layer keeps only unique additive rules', () => {
  const rules = BraveRules.parseRules(`
! comment
[Adblock Plus 2.0]
||ads.example^
example.com##.cookie-banner
||ads.example^
@@||allowed.example^
example.com#@#.content
example.com#@$#.banner { display: none; }
example.com#@?#div:has(.ad)
||old.example^$badfilter
example.com##+js(trusted-click-element, button.accept)
example.com#%#window.acceptCookies()
  `);

  assert.deepEqual(rules, [
    '||ads.example^',
    'example.com##.cookie-banner'
  ]);
});

test('Brave layer rejects missing and oversized packaged data', () => {
  assert.throws(() => BraveRules.validateRules([]), /empty/i);
  assert.throws(
    () => BraveRules.validateRules(Array.from({ length: 10_001 }, (_, index) => `||ads${index}.example^`)),
    /10,000/
  );
});

test('Brave additions reject badfilter modifiers accepted by the runtime parser', async () => {
  const { RuleParser } = await import('@adguard/agtree-runtime');
  for (const suffix of ['$badfilter', '$ badfilter', '$\tbadfilter', '$image,badfilter', '$image, badfilter']) {
    const rule = `||ads.example^${suffix}`;
    assert.ok(RuleParser.parse(rule).modifiers.children.some(modifier => modifier.name.value === 'badfilter'));
    assert.deepEqual(BraveRules.parseRules(rule), [], rule);
  }
  assert.deepEqual(BraveRules.parseRules('||ads.example^$ BADFILTER'), []);
  assert.deepEqual(BraveRules.parseRules('||ads.example^$image,third-party'), ['||ads.example^$image,third-party']);
});
