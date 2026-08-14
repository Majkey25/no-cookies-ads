# No Cookies & Ads v1.0.0

Initial production release.

## Protection

- Blocks browser requests with the AdGuard Manifest V3 engine and packaged rules.
- Enables a strict default filter set for ads, trackers, URL tracking, Cookie Notices, popups, banners, widgets, and other annoyances.
- Blocks third-party cookies through Chrome's privacy API.
- Disables Related Website Sets when Chrome allows the extension to control that setting.
- Hides cookie-consent overlays without clicking **Accept**.

## Controls

- Filtering and privacy switches with real applied/policy/unsupported status.
- Minimal, Recommended, Strict, and custom filter selection.
- Current-site protection, allowlist, custom rules, and element blocker.
- In-memory request log capped at 200 entries.
- Diagnostics for filter, engine, ruleset, and privacy state.

## Privacy

No analytics. No telemetry. No accounts. No remote executable code. No unsolicited tabs or windows.

## Install

Download `no-cookies-ads.zip`, extract it, open `chrome://extensions`, enable Developer mode, and load the extracted folder.

Use the release asset rather than GitHub's generated source archive. The release contains generated AdGuard rules and browser bundles.
