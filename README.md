# PO Auto Signals — biquote API update

- Arabic PWA interface.
- Uses the public biquote REST API at `https://biquote.io/api`.
- Loads closed 1-minute OHLC bars to seed EMA 5/13 and RSI 7, then checks latest quote every 5 seconds.
- Rejects stale/closed-market quotes for live signal calculation.
- No Pocket Option login, no trade execution, and no API key required for public read endpoints.
- Some index symbols vary by provider. If a symbol returns 404, check the provider's symbol catalogue and choose its exact ticker.
- Market data is third-party and may differ from a broker's OTC feed. Test only in demo first.


## Unified PRO dashboard
- Combines the SignalR-enabled single-market analysis, multi-asset scanner, and responsive dashboard panel.
- Uses Wilder RSI 7, EMA 5/13 and a 30-closed-candle warmup for directional signals.
- The CALL/PUT panel is manual-only and opens Pocket Option for the user to verify and place orders. It does not authenticate to the broker, read account balance, or submit trades.
- Broker account control is not enabled: no public, documented Quick Trading API was verified, and Pocket Option terms reserve the right to cancel results involving unauthorized bot software.
- Automated execution can be explored separately through an officially supported MT5 Expert Advisor workflow, subject to account availability and demo testing.


## Quick Trading journal and risk controls
- Adds a local manual trade journal for Quick Trading: asset, CALL/PUT, stake, duration, entry price, payout, and manually recorded outcome.
- Tracks manually entered reference balance, estimated balance, daily P/L, per-trade stake cap, and daily loss threshold.
- Trade records are stored locally in the browser and can be exported as CSV; no broker credentials or session tokens are requested.
- This is not a live account connection: balance and trade status are user-entered, and no orders are sent to Pocket Option.
- A manual trade must be confirmed by the user before it is added to the journal. Risk limits are app-side warnings/guards only and cannot stop trades inside the broker terminal.


## Auto Engine demo simulator
- Adds an opt-in local paper-trading engine driven by fresh multi-asset scanner snapshots.
- Opens simulated CALL/PUT positions, uses a configurable virtual stake, expiry duration, and daily loss stop, then records simulated outcomes from the next fresh quote after expiry.
- Enforces a per-asset cooldown and rejects stale scanner snapshots.
- This is a directional paper-trading approximation, not Pocket Option settlement logic; it does not connect to a broker or place real orders.
