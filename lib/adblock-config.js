(function initAdblockConfig(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.AdblockConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdblockConfig() {
  const BUILT_IN_RULES = Object.freeze([
    '###cm[aria-modal="true"]:has(#c-ttl)',
    '#?#[id*="cookie" i]:matches-css(position: fixed)',
    '#?#[class*="cookie" i]:matches-css(position: fixed)',
    '#?#[id*="consent" i]:matches-css(position: fixed)',
    '#?#[class*="consent" i]:matches-css(position: fixed)',
    '#?#[id*="gdpr" i]:matches-css(position: fixed)',
    '#?#[class*="gdpr" i]:matches-css(position: fixed)',
    '#?#[id*="cookie" i]:matches-css(position: sticky)',
    '#?#[class*="cookie" i]:matches-css(position: sticky)',
    '#?#[id*="consent" i]:matches-css(position: sticky)',
    '#?#[class*="consent" i]:matches-css(position: sticky)',
    '#?#[id*="gdpr" i]:matches-css(position: sticky)',
    '#?#[class*="gdpr" i]:matches-css(position: sticky)',
    '#?#[aria-label*="cookie" i]:matches-css(position: fixed)',
    '#?#[data-testid*="cookie" i]:matches-css(position: fixed)',
    '#?#[data-testid*="consent" i]:matches-css(position: fixed)',
    '#?#[data-cookieconsent]:matches-css(position: fixed)',
    '#?#[data-consent]:matches-css(position: fixed)',
    '#$#body.modal-open:has(> [id*="cookie" i][role="dialog"]):not(:has(> .modal.show:not([id*="cookie" i]))) { overflow: auto !important; padding-right: 0 !important; }',
    '###cookie-modal-2022',
    '###cookiesDialog',
    '##.cookies.CA',
    '#$#body:has(> #cookiesDialog.show):not(:has(> .modal.show:not(#cookiesDialog))) > .modal-backdrop { display: none !important; }',
    '#$#body.modal-open:has(> #cookiesDialog.show):not(:has(> .modal.show:not(#cookiesDialog))) { overflow: auto !important; padding-right: 0 !important; }',
    '###cmp-banner:has(#cmp-banner-main)',
    '###privacypolicies-com---nb',
    '##.fc-consent-root',
    'mazdaclub.cz,volkswagenclub.net,zpravyzmoravy.cz,vag-coding.net#$#body:has(> .fc-consent-root):not(:has(dialog[open], [aria-modal="true"]:not(.fc-dialog), .modal.show)) { overflow: auto !important; }',
    'pneufloryk.cz##.bs-dialog-overlay[data-for-id="CookiesConfirmation"]',
    // ExtendedCSS needs separate :has() guards and :upward(1) to style the root without :not() on html.
    'pneufloryk.cz#$?#body:has(.bs-dialog-overlay[data-for-id="CookiesConfirmation"]):not(:has(.bs-dialog-overlay:not([data-for-id="CookiesConfirmation"]):not(:matches-css(display: none)))):not(:has(dialog[open])):not(:has([aria-modal="true"])):not(:has(.modal.show)):upward(1) { overflow-y: auto !important; }',
    'pneufloryk.cz#$?#body:has(.bs-dialog-overlay[data-for-id="CookiesConfirmation"]):not(:has(.bs-dialog-overlay:not([data-for-id="CookiesConfirmation"]):not(:matches-css(display: none)))):not(:has(dialog[open])):not(:has([aria-modal="true"])):not(:has(.modal.show)) { overflow-y: auto !important; }',
    'toyotires.eu##div.fixed.inset-0.z-50:has(svg[aria-label="TOYO TIRES"]):has(button + button)',
    'toyotires.eu#$?#body:has(div.fixed.inset-0.z-50:has(svg[aria-label="TOYO TIRES"]):has(button + button)):not(:has(dialog[open])):not(:has([aria-modal="true"])):not(:has(.modal.show)) { overflow: auto !important; }',
    'edalnice.gov.cz##div.fixed.bottom-0:has(a[href$="/cookies"]):has(button)',
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
