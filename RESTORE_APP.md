# Desktop app.rs — restored on main

As of commit `40f8859`:

- `desktop/src/app.rs` — full Desk methods + `include!` of render
- `desktop/src/desk_render_a.inc.rs` — `impl Render` + header / market / bar
- `desktop/src/desk_render_b.inc.rs` — agent pane + ticket rail
- `desktop/src/tape.rs` — `merge_candles` + 3m/30m bars

Behavior:

1. Tape timer **2s** (was 8s)
2. Candles **merged** by timestamp, capped at 400
3. Status shows **RSI** tip
4. Full UI restored (no `stub_rest`)

Pull:

```bash
git pull origin main
cd desktop && cargo run --release
```
