# No Cookies & Ads v1.3.2

## Fixed

- Preserve unsaved Allowlist and User rules text during refreshes, failed saves, and unrelated setting changes.
- Keep newer edits when an earlier save finishes; ignore obsolete poll replies and errors.
- Fetch the request log when opened and retain unchanged rows during later refreshes. First-open loading is deferred work.
- In matched lab checks, drafts survived all 20 idle windows and added DOM nodes fell from 209 to 7 per refresh. CPU ranges overlapped, so no general CPU speedup is claimed.

## Install

Download `no-cookies-ads.zip`, extract it, open `chrome://extensions`, enable Developer mode, and load the extracted folder.

Use the release asset rather than GitHub's generated source archive. The release contains generated AdGuard rules and browser bundles.
