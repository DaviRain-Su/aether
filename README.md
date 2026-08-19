# Aether

Local-first **AI finance agent**. Models, skills, plugins, a paper book, live tapes, and ACP so *your* code agent can sit in the seat. The brain, not the vault.

Web harness + native GPUI desk. Same product.

## What it is

- **Trade desk** — OKX, Backpack, Phoenix (Solana), Hyperliquid. Candles, depth, funding. Execution is paper until you move size on-chain yourself.
- **Live wallet** — Sign in with **Google**. [Privy](https://www.privy.io) mints a non-custodial ETH + SOL embedded wallet from that identity. Aether never holds the key. The `$100,000` figure on the desk is a **labeled paper simulator**, not a balance.
- **Agents / skills / plugins** — Packaged judgment (Livermore, Druckenmiller, Turtles, Hayes) as `SKILL.md`. Plugins are what the model can see.
- **ACP** — Agent Client Protocol. Point the harness at Claude Code, Codex, Gemini CLI, OpenCode, or any stdio/WebSocket agent.
- **Fleet** — Device codes `AETH-XXXX-XXXX`. Cloudflare Durable Objects for vault, device hub, optional relay.
- **Memory** — Load-bearing, not a chat log. Observer is local. Desk and Floor sync across web and desktop.

## Web

TanStack Start. Sign in with Google, X, or email. Open `/trade`.

```
npm install
npm run dev
```

The desk listens on `0.0.0.0:8080`.

## Desktop

Same tapes, same zinc / emerald / rose palette, same memory rules, same live wallet.

```
cd desktop
cargo run --release
```

`AETHER_ORIGIN` defaults to `http://127.0.0.1:8080`. Point it at a deployed harness to share tape, memory (Desk+), and the Google→Privy wallet after you pair a device code.

| Path | Agent | Memory | Live wallet | Relay |
| --- | --- | --- | --- | --- |
| Local (default) | This box. Desk Rules. | `~/.aether/memory.json` | Pair to read | Off |
| Fleet | Still this box unless a remote seat is started | Cloud sync if plan is Desk+ | Same addresses as the web | Optional |

The native desk **does not mint** a second key. Google signs in on the web; Privy mints there; the desktop reads `/api/wallet` with the paired device.

## Accounts (paper vs live)

| Surface | What it is |
| --- | --- |
| **Paper book** | Local simulator. Starts at $100,000 paper USDC. Kill switch. Reset is local. Header labels it **Paper**. |
| **Live wallet** | Privy embedded ETH + SOL, keyed to the Google (Better Auth) user. Balances from public RPC. Header labels it **Live**. |

Without `PRIVY_APP_ID` + `PRIVY_APP_SECRET` on the server, live stays empty. Aether will not invent an address or a fake balance.

Optional `VITE_PRIVY_APP_ID` is for a future client SDK. Login itself is Better Auth (Google / X / email) — Privy is wallet infrastructure, not a second login.

## Tapes

| Source | What you get |
| --- | --- |
| OKX | Spot + swaps, USDT |
| Backpack | USDC spot & perps |
| Phoenix | Solana perps, equity perps |
| Hyperliquid | HL perps, HYPE native |

`GET /api/markets?source=okx|backpack|phoenix|hyperliquid`

## Memory plans

| Plan | Live entities | Where |
| --- | --- | --- |
| Observer | 40 | Local only |
| Desk | 400 | Cloud sync web ↔ desktop |
| Floor | 4000 | Full book |

Acceptance: clear the chat, then the agent still refuses the same losing trade.

## Auth

Google and X through the Grok broker. Email + password on this app's Better Auth. Do not add other providers.

## Privy (deploy)

Set on the **server** (never commit a `.env` in this repo):

- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`

Then: Google sign-in → `POST /api/wallet { action: "mint" }` → ETH + SOL addresses persisted → balances from public Ethereum and Solana RPC (native + USDC).

Desktop: `GET /api/wallet?ownerId=&deviceId=` after a successful claim.

## ACP

`scripts/acp-bridge.mjs` and `scripts/aether-connect.mjs`. The harness is an ACP client. A local agent is a server.

## Layout

```
src/           web harness (TanStack Start)
desktop/       native GPUI crate (aether-desk)
cloudflare/    Durable Objects control plane
migrations/    Postgres / PGLite
```

## Docs

- [`docs/WALLET.md`](docs/WALLET.md) — paper vs live, Privy vs OKX Connect
- [`docs/INDICATORS.md`](docs/INDICATORS.md) — Web ↔ desktop indicator ids
- [`docs/PRIVY_CHECKLIST.md`](docs/PRIVY_CHECKLIST.md) — deploy-time mint verification
- [`ROADMAP.md`](ROADMAP.md) — batches and goals

## Not this product

Not a broker. Not advice. Not custody. Paper fills are simulated. Live keys live on Privy. Skills are judgment systems, not promises.
