(function initPrivacySettings(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.PrivacySettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createPrivacySettings() {
  const DEFAULT_PRIVACY_SETTINGS = Object.freeze({
    blockThirdPartyCookies: true,
    disableRelatedWebsiteSets: true
  });
  const CONTROLLABLE_LEVELS = new Set([
    'controllable_by_this_extension',
    'controlled_by_this_extension'
  ]);

  async function applyPrivacySettings(privacyApi, input) {
    const settings = sanitizePrivacySettings(input);
    const websites = privacyApi?.websites;

    return {
      thirdPartyCookies: await applyBlockedSetting(
        websites?.thirdPartyCookiesAllowed,
        settings.blockThirdPartyCookies
      ),
      relatedWebsiteSets: await applyBlockedSetting(
        websites?.relatedWebsiteSetsEnabled,
        settings.disableRelatedWebsiteSets
      )
    };
  }

  function sanitizePrivacySettings(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      blockThirdPartyCookies: booleanValue(
        source.blockThirdPartyCookies,
        DEFAULT_PRIVACY_SETTINGS.blockThirdPartyCookies
      ),
      disableRelatedWebsiteSets: booleanValue(
        source.disableRelatedWebsiteSets,
        DEFAULT_PRIVACY_SETTINGS.disableRelatedWebsiteSets
      )
    };
  }

  async function applyBlockedSetting(setting, shouldBlock) {
    if (!setting || typeof setting.get !== 'function') {
      return unavailableStatus(shouldBlock);
    }

    try {
      const before = await setting.get({});
      if (shouldBlock && CONTROLLABLE_LEVELS.has(before.levelOfControl)) {
        await setting.set({ value: false });
      } else if (
        !shouldBlock
        && before.levelOfControl === 'controlled_by_this_extension'
        && typeof setting.clear === 'function'
      ) {
        await setting.clear({});
      }

      const after = await setting.get({});
      return {
        available: true,
        desiredBlocked: shouldBlock,
        value: Boolean(after.value),
        levelOfControl: after.levelOfControl || 'unknown',
        applied: shouldBlock
          ? after.value === false && after.levelOfControl === 'controlled_by_this_extension'
          : after.levelOfControl !== 'controlled_by_this_extension',
        error: null
      };
    } catch (error) {
      return {
        ...unavailableStatus(shouldBlock),
        available: true,
        error: errorMessage(error)
      };
    }
  }

  function unavailableStatus(desiredBlocked) {
    return {
      available: false,
      desiredBlocked,
      value: null,
      levelOfControl: 'unavailable',
      applied: false,
      error: null
    };
  }

  function booleanValue(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function errorMessage(error) {
    const message = error?.message || String(error || 'Unknown error');
    return message.slice(0, 200);
  }

  return {
    DEFAULT_PRIVACY_SETTINGS,
    sanitizePrivacySettings,
    applyPrivacySettings
  };
});
