# PO Auto Signals — biquote API update

- Arabic PWA interface.
- Uses the public biquote REST API at `https://biquote.io/api` for initial history/quote validation, then streams live ticks from the SignalR hub at `https://biquote.io/hubs/tick` with automatic reconnect and a 5-second REST polling fallback.
- Loads closed OHLC bars for the selected 1m, 5m, 15m, 30m or 1h timeframe to seed EMA 5/13 and Wilder RSI 7, then refreshes the current timeframe sample from the latest quote every 5 seconds.
- Rejects stale/closed-market quotes for live signal calculation.
- No Pocket Option login, no trade execution, and no API key required for public read endpoints.
- Some index symbols vary by provider. If a symbol returns 404, check the provider's symbol catalogue and choose its exact ticker.
- Market data is third-party and may differ from a broker's OTC feed. Test only in demo first.

- Fixed active-symbol parsing to match the documented `/api/active` response (`name`/`symbol`), so valid instruments are not rejected for missing undocumented flags.
- Added optional browser audio alerts for CALL/PUT, with an in-app sound test and a user-controlled setting.
- Signal history is saved locally on the device (up to 500 entries) and remains exportable as CSV.
- Rejects stale quotes and out-of-order timestamps before they can affect the analysis; live quotes update the current selected-timeframe sample instead of mixing five-second polls into the candle indicator series.
- PWA cache version is bumped when the app is updated so installed clients can receive the new files.
- SignalR stream callbacks are guarded against stale events after switching markets or disconnecting; a watchdog returns the UI to WAIT when no live tick arrives for five minutes.

Signals are heuristic indicators, not guaranteed trade instructions. Validate each symbol against the provider's live catalogue and test in a demo environment before relying on it.

- The DAX40 selector also resolves to the provider's documented market-page ticker `DE30` when that is the active symbol.

- Indicator calculations now use the full available closed-candle history for EMA 5/13 and Wilder's smoothed RSI 7; the app waits for at least 30 candles before issuing a directional signal.
