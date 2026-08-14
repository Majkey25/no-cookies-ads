# Contributing

Small, focused pull requests are welcome.

## Setup

1. Install Node.js 22 or newer.
2. Run `npm install`.
3. Run `npm test`.
4. Run `npm run build`.
5. Load `dist/extension` as an unpacked Chrome extension.

## Rules

- Keep changes focused.
- Do not add telemetry, analytics, accounts, remote executable code, or unsolicited tabs/windows.
- Keep browser-wide filtering and the documented DNS boundary accurate.
- Preserve last-working-state rollback for filtering changes.
- Add or update tests for behavior changes.
- Do not commit `node_modules`, `.build`, or `dist`.

## Releases

The release workflow installs the locked AdGuard MV3 rules, tests and builds the extension, then publishes stable and versioned ZIP assets.
