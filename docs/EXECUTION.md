# Execution boundary

## Rule

| Path | Status | Money |
| --- | --- | --- |
| **Paper** | Default, always on | Simulator USDC (`src/lib/book.ts`) |
| **Live** | **Off** | Would touch chain / exchange — not wired |

Every ticket on the web desk and native desk settles on **paper** today.

## Code

- `src/lib/execution/router.ts` — single router
- `liveExecutionEnabled()` returns **`false`** hard-coded
- `executeLive()` rejects with a clear error even if someone passes `preferred: "live"`
- Store `submitTrade` uses `executePaper` (paper only)

## Turning live on later (product checklist)

1. Implement a real adapter (CEX API or on-chain tx) behind a named module.
2. Require user session + wallet (Privy or external) + explicit UI confirm.
3. Flip `liveExecutionEnabled()` only after review; keep paper as default for agents/skills.
4. Never show paper equity as a live balance.

## Desktop

`desktop/src/book.rs` is the same simulator. Pairing does not enable live tickets.
