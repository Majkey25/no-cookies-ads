(function initBraveRules(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.BraveRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBraveRules() {
  const MAX_RULES = 10_000;

  function parseRules(text) {
    if (typeof text !== 'string') {
      return [];
    }
    return [...new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(isAdditiveRule)
    )];
  }

  function validateRules(rules) {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new Error('Brave additions list is empty');
    }
    if (rules.length > MAX_RULES) {
      throw new Error(`Brave additions list exceeds ${MAX_RULES.toLocaleString('en-US')} rules`);
    }
    return rules;
  }

  function isAdditiveRule(rule) {
    return Boolean(rule)
      && !rule.startsWith('!')
      && !rule.startsWith('[')
      && !rule.startsWith('@@')
      && !rule.includes('#@')
      && !rule.includes('$badfilter')
      && !rule.includes('##+js(')
      && !rule.includes('#%#');
  }

  return { MAX_RULES, parseRules, validateRules };
});
