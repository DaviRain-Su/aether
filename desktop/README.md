# Aether Desk

Native trading terminal. Same product as the web harness — same tapes, same bars, same memory rules, same zinc/emerald/rose palette, same Google→Privy live wallet.

- Tapes: OKX · Backpack · Phoenix · Hyperliquid via this app's `/api/markets` (OKX direct if origin is down)
- Paper book + Desk Rules on this box — **no relay required**. Header labels it **paper**.
- Live wallet: pair a device code, then `GET /api/wallet` shows the ETH/SOL addresses minted from Google on the web. The desk does not mint a second key.
- Local memory at `~/.aether/memory.json`
- Optional fleet pair (`AETH-XXXX-XXXX`) for a vault seat, **Desk+ cloud memory**, and the live wallet

```
cargo run --release
```

`AETHER_ORIGIN` defaults to `http://127.0.0.1:8080`. Point it at your deployed harness to share tape, wallet, and (on Desk/Floor) memory.

**Paths**

| Path | Agent | Memory | Live wallet | Heartbeat |
| --- | --- | --- | --- | --- |
| Local (default) | This box. Desk Rules. | File | Pair to read | Off |
| Fleet | Still this box unless a remote seat is started | Cloud sync if plan is Desk+ | Same Privy addresses as the web | On |

Observer = local file, 40 live lessons. Desk = 400, syncs web ↔ desktop. Floor = 4000, the whole book.
