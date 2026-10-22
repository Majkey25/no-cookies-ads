# No Cookies & Ads v1.3.4

## Fixed

- Use separate normal and incognito workers so their in-memory request logs are not shared.
- Reject Assistant-generated exception, disabling, executable, and multiline rules while preserving intentional custom rules.
- Reject imported Brave `badfilter` modifiers with whitespace or preceding modifiers.
- Pin GitHub Actions and separate the read-only build from release publication.
- Update six dependency packages to compatible security fixes without changing AdGuard versions.

Banner hiding does not accept or reject consent. Disable protection for a site and reload to review its privacy choices.

## Validation and remaining limits

The security changes passed 36 unit tests and 20 Chromium fixture checks, including Assistant rule rejection, valid rule application, cookie hiding, scrolling, and allowlisting.

Incognito isolation was checked against Chrome's documented split-worker behavior but was not verified live: the test browser did not start an extension worker within 30 seconds after enabling incognito access.

The npm audit reports 14 affected packages (4 low, 6 moderate, 4 high), down from 20. These trace to three remaining advisories with no forward patched leaf version: `sprintf-js` (GHSA-hp3w-g68c-fv3c), `braces` (GHSA-vfj7-8cjw-p6xm), and `elliptic` (GHSA-848j-6mx2-7j84). Reviewed runtime formatting uses fixed format strings; build globs are fixed local patterns; the elliptic fallback was not found in runtime bundles. These advisories remain unresolved.

## Install

Download `no-cookies-ads.zip`, extract it, open `chrome://extensions`, enable Developer mode, and load the extracted folder.

Use the release asset rather than GitHub's generated source archive. The release contains generated AdGuard rules and browser bundles.
