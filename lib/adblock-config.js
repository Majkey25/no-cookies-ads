(function initAdblockConfig(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AdblockConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdblockConfig() {
  const BUILT_IN_RULES = Object.freeze([
    'autosimpach.cz##.PKCKS',
    'tickets.nfctron.com##[data-testid="cookie-banner-root"]'
  ]);

  function createAdguardConfiguration(adguardSettings, options = {}) {
    const settings = adguardSettings && typeof adguardSettings === 'object' ? adguardSettings : {};
    const additionalRules = Array.isArray(options.additionalRules) ? options.additionalRules : [];
    const userRules = Array.isArray(settings.rules) ? settings.rules : [];
    const configuration = {
      filters: Array.isArray(settings.filterIds) ? [...settings.filterIds] : [],
      filteringEnabled: Boolean(settings.enabled),
      assetsPath: 'filters',
      allowlist: Array.isArray(settings.allowlist) ? [...settings.allowlist] : [],
      rules: [...new Set([...BUILT_IN_RULES, ...additionalRules, ...userRules])]
    };

    if (typeof options.documentBlockingPageUrl === 'string' && options.documentBlockingPageUrl) {
      configuration.documentBlockingPageUrl = options.documentBlockingPageUrl;
    }

    return configuration;
  }

  return { createAdguardConfiguration };
});
