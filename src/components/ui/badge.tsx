import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  children,
}: {
  className?: string;
  tone?: "default" | "up" | "down" | "muted";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium tracking-wide",
        tone === "default" && "bg-raised text-muted",
        tone === "up" && "bg-up/15 text-up",
        tone === "down" && "bg-down/15 text-down",
        tone === "muted" && "text-subtle",
        className,
      )}
    >
      {children}
    </span>
  );
}
