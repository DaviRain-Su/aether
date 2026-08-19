# Aether roadmap

## Goals (standing)

1. **Web \u2194 Desktop parity** \u2014 same venues, bars, history behavior, indicators set, paper/live boundary.
2. **Smooth UX** \u2014 no main-thread network; desktop \u22642s tape; Web WS/SSE; chart stays interactive.
3. **Real data + real wallet** \u2014 public market tapes are live; balances only from chain after Privy mint.

## Batch 1 (landed on `main`)

- [x] `LiveEvent` + OKX / Hyperliquid browser WS + origin SSE `?stream=1`
- [x] Web Lightweight Charts (zoom / pan / history / indicators)
- [x] 40+ indicators (`src/lib/indicators.ts`) + desk toggles
- [x] Paper book labeled; Privy path for live addresses (needs env)
- [x] Desktop background tape pull (no sync ureq on UI thread)
- [x] Desktop 2s timer + `merge_candles` + RSI tip in status
- [x] Shared bar list includes 3m / 30m on desktop

## Batch 2 (next)

- [ ] Desktop canvas overlays from `SeriesSet` (EMA lines on chart, not only status RSI)
- [ ] Desktop history scroll-back (`before` pagination parity with Web)
- [ ] Desktop SSE/WS client for sub-2s tips (optional; 2s poll is acceptable baseline)
- [ ] External wallet connect (OKX Connect / injected) **beside** Privy embedded \u2014 see `docs/WALLET.md`
- [ ] Memory Desk+ billing surface
- [ ] Real-money order routing (separate product milestone; paper tickets stay default)

## Money boundary

| Surface | Reality |
| --- | --- |
| Paper book | Simulator \u2014 all tickets today |
| Live wallet | Privy embedded after Google (`PRIVY_*`) \u2014 real RPC balances only |
| External | Optional later (OKX Connect, etc.) |

## Wallet decision

**Keep Privy** for embedded (Google \u2192 mint). OKX Wallet is connect-existing, not a Privy replacement. Full write-up: [`docs/WALLET.md`](docs/WALLET.md).
