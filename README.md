# PO Auto Signals — PRO paper-trading safeguards

- Arabic PWA interface with multi-asset market scanner.
- Uses the configured third-party price API; provider quotes may differ from Pocket Option OTC quotes.
- The analysis panel uses EMA 5/13, RSI 7 and momentum. Signals are analytical only and are not a promise of returns.
- The Quick Trading journal records manually entered trades and outcomes locally. It does not read broker balances or submit orders.
- The Auto Engine is a local paper-trading simulator only. It does not authenticate to Pocket Option, read account data, or send broker orders.

## PRO simulator safeguards
- Requires two consecutive fresh CALL/PUT scanner snapshots before opening a simulated trade.
- Prevents re-entry on the same direction for an asset until the signal resets to WAIT or reverses.
- Applies a 180-second per-asset cooldown, one open trade per asset, and a configurable maximum number of open trades.
- Uses the start-of-day virtual balance as the fixed daily-loss-limit reference.
- Stops opening new simulated trades after the configured daily loss limit or three consecutive simulated losses.
- Closes simulated trades using the next fresh quote received after the configured duration. This is an approximation, not Pocket Option settlement logic.

## Pocket Option Quick Trading connection
- No official, documented Quick Trading API or authorized order-submission integration has been verified for this project.
- Do not enter a Pocket Option password, OTP, session cookie, or browser token into this PWA or send them in chat.
- Real order placement remains disabled. Continue with the official Pocket Option interface and explicit manual confirmation unless the broker provides an officially supported integration method and its terms permit the intended use.
- Test the simulator in demo mode first. Simulated results are not evidence of live profitability.
