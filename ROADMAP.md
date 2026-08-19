# Aether roadmap

## Batch 1 (committed)

- [x] `LiveEvent` shared shape
- [x] OKX browser public WebSocket
- [x] Origin SSE `/api/markets?stream=1` for Backpack / Phoenix
- [x] Hyperliquid browser public WebSocket
- [x] Web Lightweight Charts (zoom / pan / history scroll-back / indicators)
- [x] 40+ indicators in `src/lib/indicators.ts`; desk toggles
- [x] Desktop 2s background pull + candle merge + `indicators.rs`
- [x] Paper book labeled on trade desk

## Batch 2 (next)

- [ ] Backpack / Phoenix native WS (or keep SSE)
- [ ] Desktop canvas overlays using `SeriesSet`
- [ ] Desktop SSE long-poll client
- [ ] Memory Desk+ billing surface
- [ ] Real-money order routing (product milestone, separate)

## Money boundary

| Surface | Reality |
| --- | --- |
| Paper book | Simulator — all tickets today |
| Live wallet | Privy embedded after Google (`PRIVY_*`) |
