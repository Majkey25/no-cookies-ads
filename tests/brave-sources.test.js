const test = require('node:test');
const assert = require('node:assert/strict');

test('Brave sources stay pinned and produce a packaged additive list', async () => {
  const BraveSources = await import('../scripts/brave-sources.mjs');
  const requested = [];
  const fetchSource = async (url) => {
    requested.push(url);
    return {
      ok: true,
      status: 200,
      async text() {
        return '! source\n||ads.example^\n@@||allowed.example^\nexample.com##.cookie\n';
      }
    };
  };

  const output = await BraveSources.downloadBraveAdditions(fetchSource);

  assert.equal(requested.length, 4);
  assert.ok(requested.every((url) => url.includes(BraveSources.BRAVE_SOURCE_COMMIT)));
  assert.match(output, new RegExp(BraveSources.BRAVE_SOURCE_COMMIT));
  assert.match(output, /\|\|ads\.example\^/);
  assert.match(output, /example\.com##\.cookie/);
  assert.doesNotMatch(output, /allowed\.example/);
});

test('Brave source download fails closed', async () => {
  const BraveSources = await import('../scripts/brave-sources.mjs');

  await assert.rejects(
    BraveSources.downloadBraveAdditions(async () => ({ ok: false, status: 503 })),
    /HTTP 503/
  );
});
