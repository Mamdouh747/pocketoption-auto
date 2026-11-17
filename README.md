# PO Auto Signals — biquote API update

- Arabic PWA interface.
- Uses the public biquote REST API at `https://biquote.io/api`.
- Loads closed 1-minute OHLC bars to seed EMA 5/13 and RSI 7, then checks latest quote every 5 seconds.
- Rejects stale/closed-market quotes for live signal calculation.
- No Pocket Option login, no trade execution, and no API key required for public read endpoints.
- Some index symbols vary by provider. If a symbol returns 404, check the provider's symbol catalogue and choose its exact ticker.
- Market data is third-party and may differ from a broker's OTC feed. Test only in demo first.
