import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Candle, ChartBar } from "@/lib/types";
import { cn, formatPx, formatQty } from "@/lib/utils";

type Hover = {
  i: number;
  x: number;
  y: number;
};

function token(el: HTMLElement, name: string, fallback: string) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

function formatAxisTime(t: number, bar: ChartBar) {
  const d = new Date(t);
  if (bar === "1D") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  if (bar === "4H" || bar === "1H") {
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit" });
  }
  if (bar === "1s") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function PriceChart({
  candles,
  bar,
  className,
}: {
  candles: Candle[];
  bar: ChartBar;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = wrap.clientWidth;
      const height = wrap.clientHeight;
      if (width < 8 || height < 8) return;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const up = token(wrap, "--color-up", "#34d399");
      const down = token(wrap, "--color-down", "#f87171");
      const border = token(wrap, "--color-border", "#26262b");
      const muted = token(wrap, "--color-subtle", "#71717a");
      const fg = token(wrap, "--color-fg", "#f4f4f5");

      const padL = 8;
      const padR = 56;
      const padT = 10;
      const volH = Math.max(36, Math.floor(height * 0.22));
      const gap = 8;
      const axisH = 18;
      const plotB = height - volH - gap - axisH;
      const plotH = plotB - padT;
      const plotW = width - padL - padR;
      if (plotW < 20 || plotH < 20 || !candles.length) {
        ctx.fillStyle = muted;
        ctx.font = "12px IBM Plex Sans, sans-serif";
        ctx.fillText("No candles yet", padL, height / 2);
        return;
      }

      const hi = Math.max(...candles.map((c) => c.h));
      const lo = Math.min(...candles.map((c) => c.l));
      const range = Math.max(hi - lo, hi * 0.002, 1e-8);
      const maxV = Math.max(...candles.map((c) => c.v ?? 0), 1);
      const n = candles.length;
      const slot = plotW / n;
      const body = Math.max(1, Math.min(9, slot * 0.62));

      const yPx = (p: number) => padT + ((hi - p) / range) * plotH;
      const xAt = (i: number) => padL + slot * i + slot / 2;

      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let g = 0; g <= 3; g++) {
        const y = padT + (plotH * g) / 3;
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        const px = hi - (range * g) / 3;
        ctx.fillStyle = muted;
        ctx.font = "10px IBM Plex Mono, ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.fillText(formatPx(px), padL + plotW + 6, y + 3);
      }
      ctx.stroke();

      candles.forEach((c, i) => {
        const x = xAt(i);
        const bull = c.c >= c.o;
        ctx.strokeStyle = bull ? up : down;
        ctx.fillStyle = bull ? up : down;
        ctx.beginPath();
        ctx.moveTo(x, yPx(c.h));
        ctx.lineTo(x, yPx(c.l));
        ctx.stroke();
        const top = yPx(Math.max(c.o, c.c));
        const bot = yPx(Math.min(c.o, c.c));
        const h = Math.max(1, bot - top);
        ctx.fillRect(x - body / 2, top, body, h);

        const vh = ((c.v ?? 0) / maxV) * (volH - 2);
        ctx.globalAlpha = 0.45;
        ctx.fillRect(x - body / 2, height - axisH - vh, body, vh);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = muted;
      ctx.font = "10px IBM Plex Sans, sans-serif";
      ctx.textAlign = "center";
      const ticks = 4;
      for (let i = 0; i < ticks; i++) {
        const idx = Math.min(n - 1, Math.round((i / (ticks - 1)) * (n - 1)));
        ctx.fillText(formatAxisTime(candles[idx]!.t, bar), xAt(idx), height - 4);
      }

      if (hover && hover.i >= 0 && hover.i < n) {
        const c = candles[hover.i]!;
        const x = xAt(hover.i);
        const y = yPx(c.c);
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.25;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, height - axisH);
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [candles, bar, hover]);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const wrap = wrapRef.current;
    if (!wrap || !candles.length) return;
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padL = 8;
    const padR = 56;
    const plotW = rect.width - padL - padR;
    const i = Math.max(0, Math.min(candles.length - 1, Math.floor(((x - padL) / plotW) * candles.length)));
    setHover({ i, x, y: e.clientY - rect.top });
  }

  const active = hover ? candles[hover.i] : candles[candles.length - 1];
  const up = active ? active.c >= active.o : true;

  return (
    <div className={cn("relative", className)}>
      {active ? (
        <div className="pointer-events-none absolute top-1 left-1 z-10 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] tabular-nums">
          <span className={up ? "text-up" : "text-down"}>O {formatPx(active.o)}</span>
          <span className="text-muted">H {formatPx(active.h)}</span>
          <span className="text-muted">L {formatPx(active.l)}</span>
          <span className={up ? "text-up" : "text-down"}>C {formatPx(active.c)}</span>
          {active.v ? <span className="text-subtle">V {formatQty(active.v)}</span> : null}
        </div>
      ) : null}
      <div
        ref={wrapRef}
        className="h-full w-full"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    </div>
  );
}
