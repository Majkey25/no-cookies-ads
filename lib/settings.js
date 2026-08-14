(function initSettings(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.ProtectionSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSettings() {
  const THEMES = Object.freeze(['system', 'dark', 'light']);
  const STRICT_FILTER_IDS = Object.freeze([2, 3, 17, 18, 19, 20, 21, 22, 105]);

  const DEFAULT_SETTINGS = Object.freeze({
    adguard: Object.freeze({
      enabled: true,
      filterIds: STRICT_FILTER_IDS,
      allowlist: Object.freeze([]),
      rules: Object.freeze([])
    }),
    privacy: Object.freeze({
      blockThirdPartyCookies: true,
      disableRelatedWebsiteSets: true
    }),
    theme: 'system'
  });

  function sanitizeSettings(input) {
    const source = isObject(input) ? input : {};
    const adguardSource = isObject(source.adguard) ? source.adguard : source;
    const privacySource = isObject(source.privacy) ? source.privacy : {};
    const filterIds = Array.isArray(adguardSource.filterIds)
      ? sanitizeIntegerArray(adguardSource.filterIds)
      : [...STRICT_FILTER_IDS];

    return {
      adguard: {
        enabled: booleanValue(adguardSource.enabled, DEFAULT_SETTINGS.adguard.enabled),
        filterIds,
        allowlist: sanitizeStringArray(adguardSource.allowlist),
        rules: sanitizeStringArray(adguardSource.rules)
      },
      privacy: {
        blockThirdPartyCookies: booleanValue(
          privacySource.blockThirdPartyCookies,
          DEFAULT_SETTINGS.privacy.blockThirdPartyCookies
        ),
        disableRelatedWebsiteSets: booleanValue(
          privacySource.disableRelatedWebsiteSets,
          DEFAULT_SETTINGS.privacy.disableRelatedWebsiteSets
        )
      },
      theme: THEMES.includes(source.theme) ? source.theme : DEFAULT_SETTINGS.theme
    };
  }

  function booleanValue(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function sanitizeIntegerArray(value) {
    return [...new Set(value.filter((item) => Number.isInteger(item) && item > 0))]
      .sort((a, b) => a - b);
  }

  function sanitizeStringArray(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return [...new Set(
      value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  return {
    THEMES,
    STRICT_FILTER_IDS,
    DEFAULT_SETTINGS,
    sanitizeSettings
  };
});
