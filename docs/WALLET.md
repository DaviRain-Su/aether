# Wallet strategy (Web + Desktop)

## Boundary (do not blur)

| Surface | What it is | Money |
| --- | --- | --- |
| **Paper book** | Local simulator on the desk | Fake USDC, labeled **Paper** |
| **Live wallet** | Embedded wallet minted after identity | Real chain balances only |
| **External wallet** | User\u2019s own extension/app (optional) | User signs; we never hold keys |

Paper numbers must never be shown as live balances. Live balances only come from RPC after a real address exists.

## Primary embedded path: Privy (keep)

Already wired in this repo:

- Google (better-auth) \u2192 session \u2192 server `mintOnPrivy` \u2192 ETH + SOL addresses
- `PRIVY_APP_ID` + `PRIVY_APP_SECRET` required; if unset, UI says \u201cnot configured\u201d and invents nothing
- Desktop pulls the same snapshot via `/api/wallet?ownerId=&deviceId=` after pair

Why keep it (2026):

- Consumer onboarding is the product need (social \u2192 wallet, no seed in-app)
- Multi-chain EVM + Solana matches our venues
- Stripe acquisition keeps the product line alive; React/server APIs already match our stack

## OKX Wallet \u2014 what it is / is not

OKX offers **Connect** (extension / app / Mini Wallet via `@okxconnect/*`), not a full \u201cGoogle login mints an embedded wallet\u201d product for third-party apps.

Use OKX when:

- User already has OKX Wallet and wants to **connect** it to the desk

Do **not** use OKX as the primary embedded path for new users who only sign in with Google.

Optional later work: add OKX Connect as an **external** connector next to Privy embedded (same pattern as \u201cbring MetaMask\u201d).

## Alternatives evaluated (prefer existing)

| Provider | Fit for Aether | Notes |
| --- | --- | --- |
| **Privy** | Primary | Already integrated |
| **Dynamic** (Fireblocks) | Strong alt | Polished multi-wallet UX; migrate only if Privy env/cost fails |
| **Openfort** | Good if self-host / AA | Open-source signer; more work to swap |
| **Turnkey** | Infra only | Signing + policy; you still build login UX |
| **thirdweb / Coinbase CDP** | Toolkit / Base-heavy | Overkill or ecosystem-locked for us |
| **OKX Connect** | External connect only | Not embedded mint |

Recommendation: **stay on Privy for embedded**; add external connectors (OKX / WalletConnect) only when product asks for \u201cconnect existing wallet.\u201d

## Desktop

- No second mint flow. Pair device \u2192 same `/api/wallet` as Web.
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
