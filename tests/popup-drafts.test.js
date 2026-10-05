const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function popup() {
  const details = { open: false };
  const elements = new Map();
  const element = () => ({ value: '', dataset: {}, textContent: '', checked: false,
    closest: () => details, replaceChildren() {}, appendChild() {}, append() {} });
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  let state;
  let accept;
  let rejectSave = false;
  const sandbox = {
    URL,
    matchMedia: () => ({ matches: false }),
    addEventListener() {},
    document: { getElementById: getElement, querySelectorAll: () => [], createElement: element },
    chrome: { runtime: { async sendMessage(message) {
      if (message.type === 'GET_ADGUARD_STATE') return structuredClone(state);
      if (message.type === 'APPLY_ADGUARD_SETTINGS') {
        if (rejectSave) throw new Error('Fixture save rejected');
        return new Promise(resolve => {
          accept = () => {
            state.settings.adguard = message.adguard;
            resolve(structuredClone(state));
          };
        });
      }
      throw new Error(`Unexpected request: ${message.type}`);
    } } }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const root = path.resolve(__dirname, '..');
  // Execute shipped state/render/apply code. The DOM plumbing does not test layout.
  for (const file of ['lib/settings.js', 'lib/adguard-utils.js', 'lib/adguard-filters.js', 'popup.js', 'popup-adguard.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  state = { ok: true, settings: structuredClone(context.ProtectionSettings.DEFAULT_SETTINGS),
    engineRunning: true, currentTabId: 1, currentHostname: 'fixture.invalid' };
  state.settings.adguard.allowlist = ['saved.fixture.invalid'];
  state.settings.adguard.rules = ['saved.fixture.invalid##.saved'];
  context.PopupApp.setSettings(state.settings);
  vm.runInContext('renderSettings()', context);
  return {
    elements, context,
    run(source) { return vm.runInContext(source, context); },
    rejectSave(value) { rejectSave = value; },
    acceptSave() { assert.equal(typeof accept, 'function'); accept(); }
  };
}

test('polls and asynchronous saves preserve independent unsubmitted editor text', async () => {
  const fixture = popup();
  const allowlist = fixture.elements.get('allowlistEditor');
  const rules = fixture.elements.get('userRulesEditor');
  allowlist.value = 'draft.fixture.invalid';
  rules.value = 'draft.fixture.invalid##.draft';

  await fixture.run('refreshRuntimeOnly()');
  assert.equal(allowlist.value, 'draft.fixture.invalid');
  assert.equal(rules.value, 'draft.fixture.invalid##.draft');

  fixture.rejectSave(true);
  await fixture.run('applyAllowlist()');
  assert.match(fixture.elements.get('adguardStatus').textContent, /save rejected/);
  assert.equal(allowlist.value, 'draft.fixture.invalid');
  assert.equal(rules.value, 'draft.fixture.invalid##.draft');

  fixture.rejectSave(false);
  allowlist.value = 'submitted.fixture.invalid';
  const pendingSave = fixture.run('applyAllowlist()');
  allowlist.value = 'newer.fixture.invalid';
  fixture.acceptSave();
  await pendingSave;
  assert.equal(allowlist.value, 'newer.fixture.invalid');
  assert.equal(rules.value, 'draft.fixture.invalid##.draft');
  assert.equal(fixture.context.PopupApp.getSettings().adguard.allowlist[0], 'submitted.fixture.invalid');
});
