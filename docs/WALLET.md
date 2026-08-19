# Wallet strategy (Web + Desktop)

## Boundary (do not blur)

| Surface | What it is | Money |
| --- | --- | --- |
| **Paper book** | Local simulator on the desk | Fake USDC, labeled **Paper** |
| **Live wallet** | Embedded wallet minted after identity | Real chain balances only |
| **External wallet** | User's own extension/app (optional) | User signs; we never hold keys |

Paper numbers must never be shown as live balances. Live balances only come from RPC after a real address exists.

## Primary embedded path: Privy (keep)

Already wired in this repo:

- Google (better-auth) → session → server `mintOnPrivy` → ETH + SOL addresses
- `PRIVY_APP_ID` + `PRIVY_APP_SECRET` required; if unset, UI says "not configured" and invents nothing
- Desktop pulls the same snapshot via `/api/wallet?ownerId=&deviceId=` after pair

Why keep it (2026):

- Consumer onboarding is the product need (social → wallet, no seed in-app)
- Multi-chain EVM + Solana matches our venues
- React/server APIs already match our stack

## OKX Wallet — what it is / is not

OKX offers **Connect** (extension / app / Mini Wallet via `@okxconnect/*`), not a full "Google login mints an embedded wallet" product for third-party apps.

Use OKX when the user already has OKX Wallet and wants to **connect** it to the desk.

Do **not** use OKX as the primary embedded path for new users who only sign in with Google.

**Shipped (client):** `src/lib/wallet/external.ts` + Accounts → **External wallet**.
Uses injected `window.ethereum` / OKX provider (`eth_requestAccounts`). Address is stored in
`localStorage` only — not the paper book, not Privy mint, not server custody.

## Alternatives evaluated (prefer existing)

| Provider | Fit for Aether | Notes |
| --- | --- | --- |
| **Privy** | Primary | Already integrated |
| **Dynamic** (Fireblocks) | Strong alt | Migrate only if Privy env/cost fails |
| **Openfort** | Good if self-host / AA | More work to swap |
| **Turnkey** | Infra only | You still build login UX |
| **OKX Connect** | External connect only | Not embedded mint |

Recommendation: **stay on Privy for embedded**; external connectors are optional.

## Desktop

- No second mint flow. Pair device → same `/api/wallet` as Web.
- Local-only mode: paper book + public tapes; live wallet needs pair + origin with Privy configured.
- Never block the UI thread on wallet HTTP (already on background executor).

## Config checklist

```bash
# Web / origin
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...

# Optional: public client id if using Privy client SDK later
# VITE_PRIVY_APP_ID=...
```

Without these, accounts page shows the configured=false reason string. That is correct behavior.
