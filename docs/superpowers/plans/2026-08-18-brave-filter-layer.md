# Brave Filter Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a default-enabled Brave-maintained rule layer beside the existing default-enabled AdGuard protection.

**Architecture:** Build one local rule snapshot from pinned Brave sources, sanitize it to additive non-consenting rules, and feed it into the existing AdGuard API configuration. Add one persisted boolean and one popup switch; do not add another engine.

**Tech Stack:** Chrome Manifest V3, Node.js, `@adguard/api-mv3`, existing Node test runner, existing Webpack/build scripts.

**Spec:** `docs/superpowers/specs/2026-08-18-brave-filter-layer-design.md`

## Global Constraints

- AdGuard and Brave additions both default to enabled.
- Brave source commit is `bfb339cbc456ea471e58c8c392d571bc326133fb`.
- Maximum packaged Brave rules: 10,000.
- No new dependency, runtime network download, auto-consent scriptlet, native helper, DNS claim, or device-wide claim.
- Release version: `1.1.0`.

---

### Task 1: Additive Brave rule parser

**Files:**
- Create: `lib/brave-rules.js`
- Test: `tests/core.test.js`

**Interfaces:**
- Produces: `BraveRules.MAX_RULES`, `BraveRules.parseRules(text: string): string[]`.

- [ ] **Step 1: Write the failing parser test**

Use a literal fixture containing a blocking network rule, cosmetic rule, duplicate, comment, `@@` exception, multiple `#@` cosmetic exceptions, `$badfilter`, `##+js(...)`, and `#%#`. Expect only the two unique additive rules.

- [ ] **Step 2: Run RED**

Run: `node --test tests/core.test.js`

Expected: FAIL because `../lib/brave-rules.js` does not exist.

- [ ] **Step 3: Implement the minimum parser**

```js
const MAX_RULES = 10_000;

function parseRules(text) {
  if (typeof text !== 'string') return [];
  return [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter(isAdditiveRule))];
}

function isAdditiveRule(rule) {
  return rule
    && !rule.startsWith('!')
    && !rule.startsWith('[')
    && !rule.startsWith('@@')
    && !rule.includes('#@')
    && !rule.includes('$badfilter')
    && !rule.includes('##+js(')
    && !rule.includes('#%#');
}
```

Export through the repository's existing UMD/CommonJS pattern.

- [ ] **Step 4: Run GREEN**

Run: `node --test tests/core.test.js`

Expected: all core tests pass.

---

### Task 2: Package pinned Brave sources

**Files:**
- Modify: `scripts/build.mjs`
- Modify: `tests/project.test.js`

**Interfaces:**
- Consumes: `BraveRules.parseRules()` and `BraveRules.MAX_RULES`.
- Produces: `dist/extension/filters/brave-additions.txt` with a pinned-source header and sanitized rules.

- [ ] **Step 1: Write the failing project test**

Assert that the build exposes `BRAVE_SOURCE_COMMIT`, calls `buildBraveAdditions`, and packages `brave-additions.txt`.

- [ ] **Step 2: Run RED**

Run: `node --test tests/project.test.js`

Expected: FAIL because the pinned Brave build step is absent.

- [ ] **Step 3: Add the build step**

Fetch these exact paths from `https://raw.githubusercontent.com/brave/adblock-lists/bfb339cbc456ea471e58c8c392d571bc326133fb/`:

```text
brave-lists/brave-specific.txt
brave-lists/brave-firstparty.txt
brave-lists/brave-firstparty-regional.txt
brave-lists/brave-cookie-specific.txt
```

Check every response, combine text, call `parseRules`, enforce `1..10_000`, and write `filters/brave-additions.txt` before filters are copied to the extension output.

- [ ] **Step 4: Run GREEN and build**

Run: `node --test tests/project.test.js`

Run: `npm run build`

Expected: tests pass; build output contains a non-empty Brave list with no excluded rule patterns.

---

### Task 3: Default-enabled runtime layer and popup control

**Files:**
- Modify: `lib/settings.js`
- Modify: `lib/adblock-config.js`
- Modify: `src/background.js`
- Modify: `popup.html`
- Modify: `popup-adguard.js`
- Test: `tests/core.test.js`
- Test: `tests/project.test.js`

**Interfaces:**
- Settings field: `adguard.braveEnabled: boolean`.
- Config option: `additionalRules: string[]`.
- Runtime loader: `loadBraveRules(): Promise<string[]>`.

- [ ] **Step 1: Write failing settings/config/UI tests**

Assert `braveEnabled === true` by default, explicit `false` survives sanitization, additional rules are merged only when supplied, and popup markup contains `id="braveEnabled"`.

- [ ] **Step 2: Run RED**

Run: `npm test`

Expected: FAIL on missing setting, config merge, and popup control.

- [ ] **Step 3: Implement the minimum integration**

- Add `braveEnabled: true` to default AdGuard settings and sanitize it with `booleanValue`.
- Extend configuration rules with `options.additionalRules` before saved user rules.
- Load `filters/brave-additions.txt` once during service-worker initialization.
- Pass the rules only when `adguard.braveEnabled` is true.
- Preserve `braveEnabled` in `cloneAdguardSettings`.
- Add and wire one existing-style switch row in the popup.

- [ ] **Step 4: Run GREEN**

Run: `npm test`

Expected: all tests pass.

---

### Task 4: Documentation, release, and verification

**Files:**
- Modify: `README.md`
- Modify: `NOTICE.md`
- Modify: `RELEASE_NOTES.md`
- Modify: `manifest.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/project.test.js`

**Interfaces:**
- Release version: `1.1.0`.

- [ ] **Step 1: Update release assertions first**

Change project tests to require `1.1.0`, Brave attribution, browser-only wording, and stable/versioned ZIP names.

- [ ] **Step 2: Run RED**

Run: `node --test tests/project.test.js`

Expected: FAIL until metadata and documentation match `1.1.0`.

- [ ] **Step 3: Update metadata and documentation**

Document that the layer uses Brave-maintained lists through the AdGuard engine, both layers default on, scriptlet auto-consent is excluded, and the exact native Brave engine is outside Chrome MV3.

- [ ] **Step 4: Run all gates**

Run: `npm test`

Run: `npm run build`

Run: `npm run package`

Run: `git diff --check`

Expected: 0 test failures; build/package exit 0; release ZIP contains version `1.1.0`, existing 48 AdGuard rulesets, and `filters/brave-additions.txt`.

- [ ] **Step 5: Live verify**

Load `dist/extension` in a clean Chrome for Testing profile. Verify both switches are on by default, Brave rules are loaded, disabling only Brave removes those rules, Auto Šimpach and NFCtron cookie banners stay hidden, and ordinary page content remains visible.

- [ ] **Step 6: Review and publish**

Review the staged diff for correctness, scope, security, and bloat. Commit as `feat: add Brave filter layer`, push the already-authorized `main`, wait for CI/release success, and inspect the public `v1.1.0` ZIP.
