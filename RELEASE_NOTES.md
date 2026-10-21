# No Cookies & Ads v1.3.3

## Fixed

- Hide the reported VIZUS, PrivacyPolicies, Toyo Tires, and eDalnice cookie banners.
- Restore scrolling behind hidden Google consent dialogs on Mazda Club, Volkswagen Club, Zpravy z Moravy, and VAG Coding.
- Remove Pneufloryk's separate cookie backdrop and restore scrolling while preserving other dialog overlays.
- Include the filter-selection and packaged-default fixes merged after v1.3.2.
- Run browser regressions against the built extension before CI and release packaging.

Banner hiding does not accept or reject consent. Disable protection for a site and reload to review its privacy choices.

## Install

Download `no-cookies-ads.zip`, extract it, open `chrome://extensions`, enable Developer mode, and load the extracted folder.

Use the release asset rather than GitHub's generated source archive. The release contains generated AdGuard rules and browser bundles.
