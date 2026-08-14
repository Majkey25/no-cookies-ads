(function initAdblockConfig(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AdblockConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdblockConfig() {
  function createAdguardConfiguration(adguardSettings, options = {}) {
    const settings = adguardSettings && typeof adguardSettings === 'object' ? adguardSettings : {};
    const configuration = {
      filters: Array.isArray(settings.filterIds) ? [...settings.filterIds] : [],
      filteringEnabled: Boolean(settings.enabled),
      assetsPath: 'filters',
      allowlist: Array.isArray(settings.allowlist) ? [...settings.allowlist] : [],
      rules: Array.isArray(settings.rules) ? [...settings.rules] : []
    };

    if (typeof options.documentBlockingPageUrl === 'string' && options.documentBlockingPageUrl) {
      configuration.documentBlockingPageUrl = options.documentBlockingPageUrl;
    }

    return configuration;
  }

  return { createAdguardConfiguration };
});
