import { AdguardApi, MESSAGE_HANDLER_NAME } from '@adguard/api-mv3';
import { localScriptRules as localScriptRulesJs } from '../.build/filters/local_script_rules.js';
import '../lib/settings.js';
import '../lib/privacy-settings.js';
import '../lib/adblock-config.js';
import '../lib/adguard-utils.js';

const MAX_BLOCKED_REQUESTS = 200;
const DASHBOARD_MESSAGES = new Set([
  'GET_ADGUARD_STATE',
  'APPLY_ADGUARD_SETTINGS',
  'APPLY_PRIVACY_SETTINGS',
  'START_ADGUARD',
  'STOP_ADGUARD',
  'OPEN_ADGUARD_ASSISTANT',
  'CLOSE_ADGUARD_ASSISTANT',
  'GET_ADGUARD_LOG',
  'CLEAR_ADGUARD_LOG',
  'SET_CURRENT_SITE_PROTECTION'
]);

let adguardApi = null;
let adguardMessageHandler = null;
let adguardRunning = false;
let lastAppliedSettings = null;
let lastAppliedPrivacy = null;
let lastConfiguredAt = null;
let lastConfigurationError = null;
let privacyStatus = null;
let blockedRequests = [];

const protectionReady = initializeProtection().catch((error) => {
  lastConfigurationError = errorMessage(error);
  console.error('[No Cookies & Ads] Protection failed to initialize', error);
  return null;
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.settings) {
    return;
  }

  const next = ProtectionSettings.sanitizeSettings(changes.settings.newValue);
  if (adguardApi && !sameSettings(next.adguard, lastAppliedSettings)) {
    void applyAdguardConfiguration(next.adguard, false).catch(async (error) => {
      console.error('[No Cookies & Ads] Failed to apply stored filter settings', error);
      if (!lastAppliedSettings) {
        return;
      }
      const stored = await chrome.storage.local.get('settings');
      const settings = ProtectionSettings.sanitizeSettings(stored.settings);
      settings.adguard = cloneAdguardSettings(lastAppliedSettings);
      await chrome.storage.local.set({ settings });
    });
  }

  if (!sameSettings(next.privacy, lastAppliedPrivacy)) {
    void applyPrivacyConfiguration(next.privacy, false);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.handlerName === MESSAGE_HANDLER_NAME) {
    protectionReady
      .then(() => adguardMessageHandler?.(message, sender))
      .then(sendResponse)
      .catch((error) => {
        console.error('[No Cookies & Ads] AdGuard message failed', error);
        sendResponse(undefined);
      });
    return true;
  }

  if (message?.type && DASHBOARD_MESSAGES.has(message.type)) {
    handleDashboardMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: errorMessage(error) }));
    return true;
  }

  return undefined;
});

async function initializeProtection() {
  const stored = await chrome.storage.local.get('settings');
  const settings = ProtectionSettings.sanitizeSettings(stored.settings);

  adguardApi = await AdguardApi.create({ localScriptRulesJs });
  adguardMessageHandler = adguardApi.getMessageHandler();
  adguardApi.onAssistantCreateRule.subscribe(handleAssistantRule);
  adguardApi.onRequestBlocked.addListener(handleBlockedRequest);

  const applied = await adguardApi.start(createConfiguration(settings.adguard));
  adguardRunning = true;
  lastAppliedSettings = cloneAdguardSettings(settings.adguard);
  lastConfiguredAt = new Date().toISOString();
  lastConfigurationError = null;

  if (applied?.filters) {
    lastAppliedSettings.filterIds = [...applied.filters].sort((a, b) => a - b);
    settings.adguard.filterIds = [...lastAppliedSettings.filterIds];
  }

  await applyPrivacyConfiguration(settings.privacy, false);
  if (JSON.stringify(stored.settings) !== JSON.stringify(settings)) {
    await chrome.storage.local.set({ settings });
  }

  return adguardApi;
}

async function handleDashboardMessage(message) {
  await protectionReady;

  switch (message.type) {
    case 'GET_ADGUARD_STATE':
      return getAdguardState();
    case 'APPLY_ADGUARD_SETTINGS':
      return applyDashboardSettings(message.adguard);
    case 'APPLY_PRIVACY_SETTINGS':
      return applyDashboardPrivacy(message.privacy);
    case 'START_ADGUARD':
      return startAdguard();
    case 'STOP_ADGUARD':
      return stopAdguard();
    case 'OPEN_ADGUARD_ASSISTANT':
      return openAssistant();
    case 'CLOSE_ADGUARD_ASSISTANT':
      return closeAssistant();
    case 'GET_ADGUARD_LOG':
      return getBlockedRequestLog();
    case 'CLEAR_ADGUARD_LOG':
      blockedRequests = [];
      return { ok: true };
    case 'SET_CURRENT_SITE_PROTECTION':
      return setCurrentSiteProtection(message.protected, message.hostname);
    default:
      return { ok: false, error: 'Unsupported protection command' };
  }
}

async function getAdguardState() {
  const stored = await chrome.storage.local.get('settings');
  const settings = ProtectionSettings.sanitizeSettings(stored.settings);
  const tab = await getActiveTab();
  const hostname = hostnameFromTab(tab);
  const enabledRulesets = await safeEnabledRulesets();
  const availableStaticRuleCount = await safeAvailableStaticRuleCount();

  return {
    ok: true,
    settings,
    privacyStatus,
    engineRunning: adguardRunning,
    rulesCount: adguardApi?.getRulesCount?.() ?? 0,
    blockedRequestCount: blockedRequests.length,
    lastConfiguredAt,
    lastConfigurationError,
    currentTabId: tab?.id ?? null,
    currentHostname: hostname,
    currentSiteProtected: currentSiteProtected(settings.adguard, hostname),
    enabledRulesetIds: enabledRulesets,
    availableStaticRuleCount,
    maxEnabledStaticRulesets:
      chrome.declarativeNetRequest.MAX_NUMBER_OF_ENABLED_STATIC_RULESETS ?? null,
    maxStaticRulesets: chrome.declarativeNetRequest.MAX_NUMBER_OF_STATIC_RULESETS ?? null
  };
}

async function applyDashboardSettings(adguardInput) {
  const stored = await chrome.storage.local.get('settings');
  const current = ProtectionSettings.sanitizeSettings(stored.settings);
  const candidate = ProtectionSettings.sanitizeSettings({ ...current, adguard: adguardInput });

  await applyAdguardConfiguration(candidate.adguard, true);
  return getAdguardState();
}

async function applyDashboardPrivacy(privacyInput) {
  const stored = await chrome.storage.local.get('settings');
  const current = ProtectionSettings.sanitizeSettings(stored.settings);
  const candidate = ProtectionSettings.sanitizeSettings({ ...current, privacy: privacyInput });

  await applyPrivacyConfiguration(candidate.privacy, true);
  return getAdguardState();
}

async function applyAdguardConfiguration(adguardSettings, persist) {
  if (!adguardApi) {
    throw new Error('Filtering engine is unavailable');
  }

  const safe = ProtectionSettings.sanitizeSettings({ adguard: adguardSettings }).adguard;
  const previous = lastAppliedSettings ? cloneAdguardSettings(lastAppliedSettings) : null;

  try {
    if (adguardRunning) {
      const applied = await adguardApi.configure(createConfiguration(safe));
      if (applied?.filters) {
        safe.filterIds = [...applied.filters].sort((a, b) => a - b);
      }
    }

    lastAppliedSettings = cloneAdguardSettings(safe);
    lastConfiguredAt = new Date().toISOString();
    lastConfigurationError = null;

    if (persist) {
      const stored = await chrome.storage.local.get('settings');
      const settings = ProtectionSettings.sanitizeSettings(stored.settings);
      settings.adguard = cloneAdguardSettings(safe);
      await chrome.storage.local.set({ settings });
    }
    return safe;
  } catch (error) {
    lastAppliedSettings = previous;
    lastConfigurationError = errorMessage(error);
    throw error;
  }
}

async function applyPrivacyConfiguration(privacyInput, persist) {
  const safe = PrivacySettings.sanitizePrivacySettings(privacyInput);
  privacyStatus = await PrivacySettings.applyPrivacySettings(chrome.privacy, safe);
  lastAppliedPrivacy = { ...safe };

  if (persist) {
    const stored = await chrome.storage.local.get('settings');
    const settings = ProtectionSettings.sanitizeSettings(stored.settings);
    settings.privacy = { ...safe };
    await chrome.storage.local.set({ settings });
  }
  return privacyStatus;
}

async function startAdguard() {
  if (!adguardApi) {
    throw new Error('Filtering engine is unavailable');
  }
  if (adguardRunning) {
    return getAdguardState();
  }

  const stored = await chrome.storage.local.get('settings');
  const settings = ProtectionSettings.sanitizeSettings(stored.settings);
  await adguardApi.start(createConfiguration(settings.adguard));
  adguardRunning = true;
  lastAppliedSettings = cloneAdguardSettings(settings.adguard);
  lastConfiguredAt = new Date().toISOString();
  lastConfigurationError = null;
  return getAdguardState();
}

async function stopAdguard() {
  if (!adguardApi) {
    throw new Error('Filtering engine is unavailable');
  }
  if (adguardRunning) {
    await adguardApi.stop();
    adguardRunning = false;
  }
  return getAdguardState();
}

async function openAssistant() {
  const tab = await requireSupportedActiveTab();
  await adguardApi.openAssistant(tab.id);
  return { ok: true };
}

async function closeAssistant() {
  const tab = await requireSupportedActiveTab();
  await adguardApi.closeAssistant(tab.id);
  return { ok: true };
}

async function setCurrentSiteProtection(protectedState, explicitHostname) {
  const stored = await chrome.storage.local.get('settings');
  const settings = ProtectionSettings.sanitizeSettings(stored.settings);
  const hostname = AdguardUtils.normalizeHostname(explicitHostname) || hostnameFromTab(await getActiveTab());
  if (!hostname) {
    return { ok: false, error: 'This page does not have a supported hostname' };
  }

  const allowlist = new Set(
    settings.adguard.allowlist.map(AdguardUtils.normalizeHostname).filter(Boolean)
  );
  if (protectedState === false) {
    allowlist.add(hostname);
  } else {
    allowlist.delete(hostname);
  }

  settings.adguard.allowlist = [...allowlist].sort();
  await applyAdguardConfiguration(settings.adguard, true);
  return getAdguardState();
}

async function handleAssistantRule(rule) {
  if (typeof rule !== 'string' || !rule.trim()) {
    return;
  }

  try {
    const stored = await chrome.storage.local.get('settings');
    const settings = ProtectionSettings.sanitizeSettings(stored.settings);
    const nextRule = rule.trim();
    if (settings.adguard.rules.includes(nextRule)) {
      return;
    }
    settings.adguard.rules = [...settings.adguard.rules, nextRule];
    await applyAdguardConfiguration(settings.adguard, true);
  } catch (error) {
    console.error('[No Cookies & Ads] Failed to apply Assistant rule', error);
  }
}

function handleBlockedRequest(event) {
  blockedRequests = AdguardUtils.mergeBlockedRequest(blockedRequests, event, MAX_BLOCKED_REQUESTS);
}

async function getBlockedRequestLog() {
  const tab = await getActiveTab();
  return {
    ok: true,
    currentTabId: tab?.id ?? null,
    log: blockedRequests.map((entry) => ({ ...entry }))
  };
}

function createConfiguration(adguardSettings) {
  return AdblockConfig.createAdguardConfiguration(adguardSettings, {
    documentBlockingPageUrl: chrome.runtime.getURL('blocking-page.html')
  });
}

async function safeEnabledRulesets() {
  try {
    const ids = await chrome.declarativeNetRequest.getEnabledRulesets();
    return ids
      .map((id) => Number(String(id).replace(/^ruleset_/, '')))
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

async function safeAvailableStaticRuleCount() {
  try {
    if (typeof chrome.declarativeNetRequest.getAvailableStaticRuleCount !== 'function') {
      return null;
    }
    return await chrome.declarativeNetRequest.getAvailableStaticRuleCount();
  } catch {
    return null;
  }
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function requireSupportedActiveTab() {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) {
    throw new Error('No active browser tab is available');
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    throw new Error('The active page URL is invalid');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Element blocking works only on HTTP and HTTPS pages');
  }
  return tab;
}

function hostnameFromTab(tab) {
  return AdguardUtils.normalizeHostname(tab?.url || '');
}

function currentSiteProtected(adguardSettings, hostname) {
  if (!hostname || !adguardSettings.enabled) {
    return false;
  }
  return !adguardSettings.allowlist
    .map(AdguardUtils.normalizeHostname)
    .filter(Boolean)
    .includes(hostname);
}

function sameSettings(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

function cloneAdguardSettings(settings) {
  return {
    enabled: Boolean(settings.enabled),
    filterIds: [...settings.filterIds],
    allowlist: [...settings.allowlist],
    rules: [...settings.rules]
  };
}

function errorMessage(error) {
  const message = error?.message || String(error || 'Unknown error');
  return message.slice(0, 200);
}
