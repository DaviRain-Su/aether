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
- [ ] Canvas EMA overlays on CandlestickChart (blocked: no series API — tips + toggles interim)
- [ ] Desktop native WS (optional; 2s poll is baseline)
- [ ] External wallet Connect beside Privy
- [ ] Memory Desk+ billing UI
- [ ] Real order routing (product milestone)

## Batch 3 — current

**Theme:** indicator depth on desktop + keep money boundary crystal clear.

- [x] Expand desktop indicators: SMA20, Bollinger, MACD (+ existing EMA/RSI)
- [x] Desktop indicator toggle row (same ids as web: ema20, ema50, sma20, bb, rsi, macd)
- [ ] Web: verify Privy mint path end-to-end when `PRIVY_*` set (ops, not code)
- [ ] Shared indicator catalog doc (web list ↔ desktop subset)
- [ ] SEO/meta pass on marketing routes if still thin
- [ ] Optional: desktop SSE tip stream when origin is up

## Batch 4 — later

- External wallets (OKX Connect / injected) as *additional* path
- Memory subscription surface (Desk+ / Floor)
- Real-money execution adapters (explicit, separate from paper book)
- Custom GPUI canvas chart with overlays + wheel zoom (replace CandlestickChart)

## Money boundary

| Surface | Reality |
| --- | --- |
| Paper book | Simulator — all tickets today |
| Live wallet | Privy embedded after Google — real RPC balances only |
| External | Optional later |

See [`docs/WALLET.md`](docs/WALLET.md).
