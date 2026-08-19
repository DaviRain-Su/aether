# Indicators — Web ↔ Desktop

Shared **ids** so toggles and tips mean the same thing on both surfaces.

## Desktop (native GPUI)

Computed in `desktop/src/indicators.rs`. Shown as **status tips** + toggle row (not drawn on the candlestick canvas yet — gpui-component `CandlestickChart` has no series API).

| id | Series | Notes |
| --- | --- | --- |
| `ema20` | EMA(20) on close | Default on |
| `ema50` | EMA(50) | Default on |
| `sma20` | SMA(20) | |
| `bb` | Bollinger mid/upper/lower (20, 2σ) | Tips show upper–lower range |
| `rsi` | RSI(14) | Default on |
| `macd` | MACD(12,26,9) line | Signal/hist computed, tip shows line |

Defaults: `ema20`, `ema50`, `rsi` (`default_active()`).

## Web (Lightweight Charts)

Full catalog in `src/lib/indicators.ts` (`INDICATOR_DEFS` + compute). Overlays and oscillators render on the chart; toggles via `chartIndicators` in the Zustand store.

Groups include: **MA**, **Channel**, **Trend**, **Momentum**, **Volatility**, **Volume**.

Desktop is a **subset**. When adding a desktop series, reuse the same **id** as web.

## Adding parity

1. Implement math in `desktop/src/indicators.rs` (and extend `SeriesSet` / `status_tips`).
2. Add the id to `INDICATOR_IDS`.
3. Prefer the same period defaults as web (e.g. RSI 14, BB 20/2, MACD 12/26/9).
4. Canvas line overlays wait on Batch 4 (custom GPUI chart) or upstream series API on CandlestickChart.
