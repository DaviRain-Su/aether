Native trading terminal for Aether. Built with [GPUI Component](https://longbridge.github.io/gpui-component/) — the same Rust GPU UI Longbridge Pro uses.

- OKX public tape and candlesticks (`CandlestickChart`)
- Paper book + Desk Rules
- Load-bearing memory at `~/.aether/memory.json`
- Fleet pairing via `AETH-XXXX-XXXX` against the web control plane

Tape pulls run on a background pool (never the UI thread). Always run release — debug GPUI redraws hitch even with a cheap tape:

```
cargo run --release
```

`cargo run` (dev) now uses `opt-level = 1`, but still skip it for the desk. Optional: `AETHER_ORIGIN=https://your-app.example cargo run --release`

Paste a device code from the web Fleet / Desk pages. Heartbeats keep the machine online.
