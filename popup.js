const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeInput = document.getElementById('theme');

let settings = ProtectionSettings.sanitizeSettings();

window.PopupApp = {
  getSettings: () => settings,
  setSettings(next) {
    settings = ProtectionSettings.sanitizeSettings(next);
  },
  setStatus,
  applyTheme
};

window.addEventListener('DOMContentLoaded', init);

async function init() {
  const stored = await chrome.storage.local.get('settings');
  settings = ProtectionSettings.sanitizeSettings(stored.settings);
  await chrome.storage.local.set({ settings });

  themeInput.value = settings.theme;
  applyTheme(settings.theme);
  themeInput.addEventListener('change', saveTheme);
  systemTheme.addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });

  await window.PopupAdguard.init();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.settings) {
      return;
    }
    settings = ProtectionSettings.sanitizeSettings(changes.settings.newValue);
    themeInput.value = settings.theme;
    applyTheme(settings.theme);
    window.PopupAdguard.renderSettings();
  });
}

async function saveTheme() {
  settings = ProtectionSettings.sanitizeSettings({ ...settings, theme: themeInput.value });
  await chrome.storage.local.set({ settings });
  applyTheme(settings.theme);
}

function setStatus(message, type = 'info') {
  const status = document.getElementById('adguardStatus');
  status.textContent = message || '';
  status.dataset.type = type;
}

function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (systemTheme.matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolved;
}
