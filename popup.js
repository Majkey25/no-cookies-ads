const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeButtons = document.querySelectorAll('[data-theme-value]');

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

  renderTheme();
  for (const button of themeButtons) {
    button.addEventListener('click', saveTheme);
  }
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
    renderTheme();
    window.PopupAdguard.renderSettings();
  });
}

async function saveTheme(event) {
  settings = ProtectionSettings.sanitizeSettings({
    ...settings,
    theme: event.currentTarget.dataset.themeValue
  });
  renderTheme();
  await chrome.storage.local.set({ settings });
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

function renderTheme() {
  for (const button of themeButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.themeValue === settings.theme));
  }
  applyTheme(settings.theme);
}
