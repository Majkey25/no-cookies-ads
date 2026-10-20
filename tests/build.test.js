const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const strictFilterIds = [2, 3, 17, 18, 19, 20, 21, 22, 105];

test('catalog reads names and descriptions from the locked AdGuard metadata', async () => {
  const build = await fs.readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
  const filtersDir = path.join(root, 'node_modules/@adguard/dnr-rulesets/dist/filters/chromium-mv3');
  const context = vm.createContext({ fs, path, filtersDir, strictFilterIds, MAX_STATIC_RULESETS: 100, console });
  vm.runInContext(build.slice(build.indexOf('async function discoverFilterCatalog()'), build.indexOf('async function copyStaticFiles()')), context);
  const catalog = await vm.runInContext('discoverFilterCatalog()', context);
  const metadata = JSON.parse(await fs.readFile(path.join(filtersDir, 'filters_i18n.json'), 'utf8'));
  assert.ok(catalog.filters.length > strictFilterIds.length);
  for (const filter of catalog.filters) {
    assert.equal(filter.name, metadata.filters[filter.id].en.name.trim(), `Filter ${filter.id}`);
    assert.equal(filter.description, metadata.filters[filter.id].en.description.trim());
  }
  assert.equal(catalog.filters.find(filter => filter.id === 18).group, 'Cookie notices');
  assert.equal(catalog.filters.find(filter => filter.id === 105).group, 'Language-specific');
});

test('manifest patch enables only the packaged strict defaults', async () => {
  const { ManifestPatcher } = await import('@adguard/dnr-rulesets');
  const build = await fs.readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
  const scratch = path.join(root, '.reference/tmp');
  await fs.mkdir(scratch, { recursive: true });
  const outputDir = await fs.mkdtemp(path.join(scratch, 'manifest-'));
  try {
    await fs.writeFile(path.join(outputDir, 'manifest.json'), '{}');
    for (const id of [2, 3, 4]) {
      const dir = path.join(outputDir, 'filters/declarative', `ruleset_${id}`);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, `ruleset_${id}.json`), '[]');
    }
    const context = vm.createContext({
      path, outputDir, strictFilterIds, ManifestPatcher,
      catalog: { filters: [2, 3, 4].map(id => ({ id })) }
    });
    vm.runInContext(build.slice(build.indexOf('const discoveredIds ='), build.indexOf('await normalizeManifestRulePaths()')), context);
    const manifest = JSON.parse(await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf8'));
    assert.deepEqual(manifest.declarative_net_request.rule_resources.filter(rule => rule.enabled).map(rule => rule.id).sort(), ['ruleset_2', 'ruleset_3']);
    assert.equal(manifest.declarative_net_request.rule_resources.length, 3);
  } finally {
    await fs.rm(outputDir, { recursive: true, force: true });
  }
});
