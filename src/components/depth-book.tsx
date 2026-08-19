import type { DepthBook } from "@/lib/types";
import { cn, formatPx, formatQty } from "@/lib/utils";

export function DepthPane({
  book,
  last,
}: {
  book: DepthBook | null | undefined;
  last?: number;
}) {
  const asks = [...(book?.asks ?? [])].slice(0, 8).reverse();
  const bids = (book?.bids ?? []).slice(0, 8);
  const max = Math.max(...asks.map((l) => l.sz), ...bids.map((l) => l.sz), 0.0001);

  if (!book || (!asks.length && !bids.length)) {
    return (
      <div className="grid h-full place-items-center px-3 text-center text-[11px] text-subtle">
        Depth is live on OKX crypto pairs.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col text-[11px]">
      <div className="grid grid-cols-2 border-b border-border px-2 py-1 font-mono text-subtle">
        <span>Price</span>
        <span className="text-right">Size</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {asks.map((l) => (
          <Row key={`a-${l.px}`} px={l.px} sz={l.sz} max={max} tone="down" />
        ))}
        <div className="border-y border-border px-2 py-1 font-mono text-sm tabular-nums">
          {last ? formatPx(last) : "—"}
        </div>
        {bids.map((l) => (
          <Row key={`b-${l.px}`} px={l.px} sz={l.sz} max={max} tone="up" />
        ))}
      </div>
    </div>
  );
}

function Row({
  px,
  sz,
  max,
  tone,
}: {
  px: number;
  sz: number;
  max: number;
  tone: "up" | "down";
}) {
  const w = Math.max(4, Math.round((sz / max) * 100));
  return (
    <div className="relative grid grid-cols-2 px-2 py-0.5 font-mono tabular-nums">
      <span
        className={cn(
          "absolute inset-y-0 right-0 opacity-20",
          tone === "up" ? "bg-up" : "bg-down",
        )}
        style={{ width: `${w}%` }}
      />
      <span className={tone === "up" ? "text-up" : "text-down"}>{formatPx(px)}</span>
      <span className="text-right text-muted">{formatQty(sz)}</span>
    </div>
  );
}
