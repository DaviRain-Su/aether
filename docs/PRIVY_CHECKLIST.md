# Privy live-wallet checklist (ops)

Code path is already in the repo (`src/lib/wallet/*`, `/api/wallet`). This is what to verify on a **deployed** harness with secrets.

## Server env

- [ ] `PRIVY_APP_ID`
- [ ] `PRIVY_APP_SECRET`
- [ ] Better Auth / Google (and optional X) configured so a real user session exists

Never commit `.env`. Desktop does **not** mint; it only reads after pair.

## Happy path

1. Open web `/login` → Google sign-in.
2. Open `/accounts` or trade desk → mint live wallet (`POST /api/wallet` with `{ "action": "mint" }` as the app does).
3. Expect **ETH + SOL** addresses persisted for that user (not paper cash).
4. Balances come from public RPC (native + USDC where implemented) — if zero, that is a real empty wallet, not a fake `$100,000`.
5. Header / accounts: **Paper** = simulator; **Live** = chain after mint.
6. Desktop: claim `AETH-…` device code → `GET /api/wallet?ownerId=&deviceId=` shows the **same** addresses/balances.

## Failure modes

| Symptom | Likely cause |
| --- | --- |
| Live stays empty / “not configured” | Missing `PRIVY_*` on server |
| Mint errors | Privy app dashboard / CORS / auth cookie |
| Desktop live `—` | Not paired, or pair against wrong origin |
| Paper still $100k after mint | Expected — paper is independent |

## Product rule

Paper tickets stay default. Real-money routing is a separate milestone (Batch 4).
