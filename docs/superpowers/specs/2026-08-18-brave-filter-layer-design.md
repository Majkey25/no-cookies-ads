# Brave Filter Additions Design

## Goal

Add a second, default-enabled filtering layer sourced from Brave-maintained ad and cookie lists while preserving the existing AdGuard MV3 engine and Chrome privacy controls.

## Platform boundary

Brave Shields uses `adblock-rust` inside Brave's Chromium build. A normal Chrome Manifest V3 extension cannot install that native request hook and must use `declarativeNetRequest` plus packaged content filtering. The extension will therefore be described as using **Brave list additions**, not the Brave Shields engine.

## Architecture

- Keep AdGuard as the only filtering engine.
- At build time, download pinned text lists from `brave/adblock-lists` commit `bfb339cbc456ea471e58c8c392d571bc326133fb`.
- Sources: `brave-specific.txt`, `brave-firstparty.txt`, `brave-firstparty-regional.txt`, and `brave-cookie-specific.txt`.
- Convert the sources into one deduplicated packaged file: `filters/brave-additions.txt`.
- Load that local file once in the service worker and append its rules to the existing AdGuard configuration when the Brave layer is enabled.
- Add `adguard.braveEnabled`, default `true`, with a popup switch. The existing `adguard.enabled` master switch remains default `true`; both layers therefore start enabled.

## Rule policy

The Brave layer must only add blocking or hiding. It must not weaken AdGuard or consent on the user's behalf.

- Exclude comments, headers, empty lines, allow rules beginning with `@@`, cosmetic exceptions containing `#@`, `$badfilter` rules, and scriptlet rules containing `##+js(` or `#%#`.
- This intentionally excludes Brave trusted click and cookie-setting scriptlets, so the extension never clicks **Accept** or writes consent cookies.
- Deduplicate rules and reject a packaged file with zero rules or more than 10,000 rules.
- No runtime downloads, remote executable code, native helper, DNS claim, or device-wide protection claim.

## Failure behavior

- Build fails if any pinned Brave source cannot be downloaded.
- Runtime initialization fails explicitly if the packaged Brave list is missing, empty, or above the rule limit while the layer is enabled.
- Disabling the Brave layer removes only Brave additions; saved AdGuard filter selection and user rules remain unchanged.
- Existing rollback behavior keeps the last working configuration if a settings update fails.

## UI and documentation

- Add one square-switch row: **Brave list additions**.
- Help text: **Adds packaged Brave-maintained ad and cookie rules. Uses the AdGuard engine.**
- README and NOTICE must identify the pinned Brave source commit, MPL-2.0 license, Chrome MV3 boundary, and no-auto-consent policy.

## Verification

- TDD for rule sanitization, default settings, disabling the Brave layer, and configuration merging.
- `npm test`, `npm run build`, `npm run package`, archive inspection, and diff review.
- Clean-profile Chrome verification with both layers enabled, Brave disabled, and the existing Auto Šimpach and NFCtron regressions.
- Publish `v1.1.0` to the already-authorized `main` branch after CI and release verification.
