import { getMarkets } from "@/lib/server/markets";
import type { ChainType, LiveWallet, WalletRow } from "./types";

const USDC_ETH = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const SOL_RPC = "https://api.mainnet-beta.solana.com";

async function rpc(url: string, body: unknown, ms = 4000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function hexToInt(hex: string | undefined, decimals: number): number {
  if (!hex || hex === "0x") return 0;
  try {
    const n = BigInt(hex);
    const base = 10n ** BigInt(decimals);
    const whole = n / base;
    const frac = n % base;
    return Number(whole) + Number(frac) / Number(base);
  } catch {
    return 0;
  }
}

async function ethBalance(address: string): Promise<{ native: number; usdc: number }> {
  const owner = address.toLowerCase();
  const data = `0x70a08231000000000000000000000000${owner.replace(/^0x/, "").padStart(40, "0")}`;
  const [bal, usdc] = await Promise.all([
    rpc(ETH_RPC, { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [owner, "latest"] }),
    rpc(ETH_RPC, {
      jsonrpc: "2.0",
      id: 2,
      method: "eth_call",
      params: [{ to: USDC_ETH, data }, "latest"],
    }),
  ]);
  const native = hexToInt(
    typeof bal === "object" && bal && "result" in bal ? String((bal as { result?: string }).result) : undefined,
    18,
  );
  const usdcAmt = hexToInt(
    typeof usdc === "object" && usdc && "result" in usdc ? String((usdc as { result?: string }).result) : undefined,
    6,
  );
  return { native, usdc: usdcAmt };
}

async function solBalance(address: string): Promise<{ native: number; usdc: number }> {
  const [bal, tokens] = await Promise.all([
    rpc(SOL_RPC, { jsonrpc: "2.0", id: 1, method: "getBalance", params: [address] }),
    rpc(SOL_RPC, {
      jsonrpc: "2.0",
      id: 2,
      method: "getTokenAccountsByOwner",
      params: [address, { mint: USDC_SOL }, { encoding: "jsonParsed" }],
    }),
  ]);
  const lamports =
    typeof bal === "object" && bal && "result" in bal
      ? Number((bal as { result?: { value?: number } }).result?.value ?? 0)
      : 0;
  let usdc = 0;
  const accounts =
    typeof tokens === "object" && tokens && "result" in tokens
      ? ((tokens as { result?: { value?: Array<{ account?: { data?: { parsed?: { info?: { tokenAmount?: { uiAmount?: number } } } } } }> } }).result
          ?.value ?? [])
      : [];
  for (const a of accounts) {
    const amt = a.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
    if (typeof amt === "number") usdc += amt;
  }
  return { native: lamports / 1e9, usdc };
}

export async function liveOf(rows: WalletRow[]): Promise<LiveWallet[]> {
  if (!rows.length) return [];
  const markets = await getMarkets().catch(() => []);
  const ethPx = markets.find((m) => m.symbol === "ETH")?.price ?? 0;
  const solPx = markets.find((m) => m.symbol === "SOL")?.price ?? 0;

  const out: LiveWallet[] = [];
  await Promise.all(
    rows.map(async (row) => {
      const chain: ChainType = row.chainType;
      const bals = chain === "solana" ? await solBalance(row.address) : await ethBalance(row.address);
      const px = chain === "solana" ? solPx : ethPx;
      out.push({
        chainType: chain,
        address: row.address,
        nativeSymbol: chain === "solana" ? "SOL" : "ETH",
        native: bals.native,
        nativeUsd: bals.native * px,
        usdc: bals.usdc,
        privyWalletId: row.privyWalletId,
      });
    }),
  );
  out.sort((a, b) => a.chainType.localeCompare(b.chainType));
  return out;
}

export function sumUsd(wallets: LiveWallet[]): number {
  return wallets.reduce((acc, w) => acc + w.nativeUsd + w.usdc, 0);
}
