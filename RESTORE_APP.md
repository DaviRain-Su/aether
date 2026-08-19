# RESTORE desktop/src/app.rs

Main briefly received a truncated `app.rs`. Restore with:

```bash
# From good commit, then re-apply the 2s + merge changes locally from RESTORE_APP.md below
git show 36ba60bc36cf7730b90adb792d38ab9175b4d4b1:desktop/src/app.rs > desktop/src/app.rs
```

Then in `arm_timer`, change `from_secs(8)` to `from_secs(2)`.

In `request_pull`, replace wholesale candle assign with:

```rust
this.candles = tape::merge_candles(&this.candles, &pack.candles);
const MAX_CANDLES: usize = 400;
if this.candles.len() > MAX_CANDLES {
    let drop = this.candles.len() - MAX_CANDLES;
    this.candles.drain(0..drop);
}
let series = crate::indicators::compute(&this.candles);
let tip = series.rsi.last().and_then(|v| *v);
this.status = format!(
    "{} {} × {} · {}{}",
    tape::label(&this.tape),
    this.candles.len(),
    this.bar,
    this.focus,
    tip.map(|r| format!(" · RSI {r:.1}")).unwrap_or_default()
).into();
```

`desktop/src/tape.rs` on main already has `merge_candles` and 3m/30m bars.

Wallet strategy: see `docs/WALLET.md` — keep Privy for embedded; OKX Connect is external-only.
