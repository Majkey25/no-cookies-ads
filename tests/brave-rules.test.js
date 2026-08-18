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
