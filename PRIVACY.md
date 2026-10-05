# Privacy and use of No Cookies & Ads

Updated 5 October 2026. Developer: Matěj Teplý, publishing as Majkey / Majkey25. Contact: [majkeylab@gmail.com](mailto:majkeylab@gmail.com).

## Data processed on your device

The bundled AdGuard filtering engine inspects browser requests, visited URLs, page elements, and cookie information to block requests, remove cookies, and hide page elements. Its built-in stealth configuration also enables first-party and third-party cookie expiration controls, which can affect sign-in persistence. Broad website access is needed because you can filter any visited site. Current-tab information supports the site allowlist and element blocker. This information is processed inside the browser; the extension has no developer analytics or telemetry service.

Filter choices, theme, privacy controls, allowlisted domains, and custom rules stay in `chrome.storage.local` and engine-managed browser storage without account sync. The request log holds at most 200 recent blocked-request records in worker memory, including URLs and matching-rule information. It is not uploaded automatically. Copy diagnostics or Copy actions put the selected data on your clipboard; inspect it before sharing because URLs or rules can disclose private browsing details.

AdGuard and Brave rule assets are packaged at build time. Runtime asset loading reads bundled extension files. The extension does not download executable updates or send browsing logs to AdGuard, Brave, or the developer. It uses data only for filtering and the controls described above, never for advertising, sale, or profiling. See [NOTICE.md](NOTICE.md) for the bundled components and licenses.

## Cookies and consent

The extension sets no tracking cookies. Hiding a website's cookie banner does not accept or reject its consent choices, erase existing consent, or guarantee that the site stops tracking. To review a site's choices, turn off Protect current site, reload it, and use its privacy controls. Blocking cookies or requests can break sign-in and other features; allowlist the site or change filtering as needed. Privacy overrides restore the browser's underlying setting when disabled or the extension is removed.

## Retention and deletion

Use Clear log to empty request-log memory; the worker ending also clears it. Edit the Allowlist, reset User rules, or remove the extension to delete its browser-managed settings and filtering data. Removing the extension does not erase websites' cookies, previous consent, clipboard history, or saved diagnostic copies. Clear these separately using browser/system/site controls. The developer has no server copy of your filtering data to delete.

## Support and use

Opening repository, attribution, or privacy links contacts the linked service, including normal connection information such as your IP address. GitHub is governed by [its privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Email support receives the address and content you send. Do not publish private diagnostics in issues. Contact the email above about support-message access or deletion; messages are kept only as needed to handle the request or meet legal obligations.

This release is free, with no purchases, subscriptions, hidden fees, or marketing emails; there is no payment to refund. The [GPL-3.0-only license](LICENSE) and third-party notices govern use and redistribution without limiting mandatory consumer rights. This independent project is not endorsed by Google, AdGuard, or Brave. Filtering cannot guarantee every ad or tracker is blocked. No children's account or age/profile data is requested. Privacy changes will be recorded in this repository.
