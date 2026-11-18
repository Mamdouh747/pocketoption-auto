# PO Auto Signals — biquote API update

- Arabic PWA interface.
- Uses the public biquote REST API at `https://biquote.io/api`.
- Loads closed 1-minute OHLC bars to seed EMA 5/13 and RSI 7, then checks latest quote every 5 seconds.
- Rejects stale/closed-market quotes for live signal calculation.
- No Pocket Option login, no trade execution, and no API key required for public read endpoints.
- Some index symbols vary by provider. If a symbol returns 404, check the provider's symbol catalogue and choose its exact ticker.
- Market data is third-party and may differ from a broker's OTC feed. Test only in demo first.

- Fixed active-symbol parsing to match the documented `/api/active` response (`name`/`symbol`), so valid instruments are not rejected for missing undocumented flags.
- Added optional browser audio alerts for CALL/PUT, with an in-app sound test and a user-controlled setting.
- Signal history is saved locally on the device (up to 500 entries) and remains exportable as CSV.
- Rejects stale quotes and out-of-order timestamps before they can affect the analysis.
- PWA cache version is bumped when the app is updated so installed clients can receive the new files.

Signals are heuristic indicators, not guaranteed trade instructions. Validate each symbol against the provider's live catalogue and test in a demo environment before relying on it.
