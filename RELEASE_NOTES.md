# No Cookies & Ads v1.3.5

## Fixed

- Publish the current tested extension package under a new patch version.
- Exclude Chromium-generated `_metadata` caches from release ZIPs.
- Include the dependency updates already validated on `main`.

Banner hiding does not accept or reject consent. Disable protection for a site and reload to review its privacy choices.

## Validation and remaining limits

The release checks passed 37 unit tests and 20 Chromium fixture checks, including publication guards, archive cache exclusion, Assistant rule rejection, valid rule application, cookie hiding, scrolling, and allowlisting.

Incognito isolation was checked against Chrome's documented split-worker behavior but was not verified live: the test browser did not start an extension worker within 30 seconds after enabling incognito access.

The unchanged dependency graph reports 12 affected packages in npm audit (4 low, 8 high). The Zod collection-validation advisory (GHSA-mrhx-c7xc-m3w5) and the elliptic advisory (GHSA-848j-6mx2-7j84) remain unresolved in this release.

## Install

Download `no-cookies-ads.zip`, extract it, open `chrome://extensions`, enable Developer mode, and load the extracted folder.

Use the release asset rather than GitHub's generated source archive. The release contains generated AdGuard rules and browser bundles.
