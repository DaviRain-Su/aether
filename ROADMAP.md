# Aether roadmap

## Goals (standing)

1. **Web ↔ Desktop parity** — same venues, bars, history, indicators, paper/live boundary.
2. **Smooth UX** — no main-thread network; desktop ≤2s tape; Web WS/SSE; interactive charts.
3. **Real data + real wallet** — live public tapes; balances only from chain after Privy mint.

## Batch 1 — landed

- [x] LiveEvent + OKX / HL browser WS + origin SSE `?stream=1`
- [x] Web Lightweight Charts (zoom / pan / history / indicators)
- [x] 40+ web indicators + desk toggles
- [x] Paper labeled; Privy path for live addresses
- [x] Desktop background tape; 2s timer; merge_candles; 3m/30m bars

## Batch 2 — landed

- [x] Desktop history `before` + **Older** button
- [x] Desktop EMA / RSI (and more) status tips from SeriesSet
- [ ] Canvas EMA line overlays (still blocked: CandlestickChart has no series API)
- [ ] Desktop native WS (optional; 2s poll is baseline)

## Batch 3 — mostly landed

- [x] Expand desktop indicators: SMA20, Bollinger, MACD (+ existing EMA/RSI)
- [x] Desktop indicator toggle row (ids: ema20, ema50, sma20, bb, rsi, macd)
- [x] Shared indicator catalog — [`docs/INDICATORS.md`](docs/INDICATORS.md)
- [x] Privy ops checklist — [`docs/PRIVY_CHECKLIST.md`](docs/PRIVY_CHECKLIST.md)
- [x] SEO: `pageHead` og/twitter completeness; sitemap/robots already wired to `SITE_PAGES`
- [ ] Deploy-time Privy mint verification (ops on your host with `PRIVY_*`)
- [ ] Optional: desktop SSE tip stream when origin is up

## Batch 4 — in progress

- [x] Memory Desk+ billing surface on `/memory`
- [x] Plan catalog names Desk+ consistently
- [x] External wallets (injected OKX / MetaMask) on Accounts
- [x] Real-money execution **boundary** — live hard-off
- [x] Desktop chart **view zoom** (+ / − / reset on visible bar window)
- [ ] Payment checkout (Stripe or similar) — still **Soon**
- [ ] Custom GPUI canvas with drawn EMA overlays (replace CandlestickChart later)

## Money boundary

| Surface | Reality |
| --- | --- |
| Paper book | Simulator — all tickets today |
| Live wallet | Privy embedded after Google — real RPC balances only |
| External | Injected connect on Accounts (browser only; not custody) |
| Live tickets | **Off** — see docs/EXECUTION.md |

See [`docs/WALLET.md`](docs/WALLET.md).
