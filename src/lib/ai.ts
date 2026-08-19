import { GALLERY, PLUGINS, SKILLS } from "./catalog";
import type { AcpContent } from "./acp";
import type { ChatMessage, InvestorSkill, Market, PortfolioSnapshot } from "./types";

export const GROK_MODEL = "grok-4.5";

export const FINANCE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_quote",
      description: "Latest mark, 24h change, and venue for a symbol.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string" } },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_markets",
      description: "List tradeable markets. Optionally filter by venue: spot, perp, equity, predict.",
      parameters: {
        type: "object",
        properties: { venue: { type: "string" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_book",
      description: "Current paper portfolio: cash, equity, positions, open orders, kill switch.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_onchain",
      description: "Funding, open interest, and stablecoin impulse for a major.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string" } },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_news",
      description: "Recent headlines touching a symbol or theme.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_candles",
      description:
        "OHLC candles for a symbol. Crypto from the selected tape (OKX, Backpack, Phoenix). bar: 1s, 1m, 3m, 5m, 15m, 30m, 1H, 4H, 1D. Optional source: okx | backpack | phoenix.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          bar: { type: "string" },
          source: { type: "string", description: "okx | backpack | phoenix" },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "recall",
      description: "Read book memory: lessons, constraints, journal. Survives chat clear.",
      parameters: { type: "object", properties: { query: { type: "string" } } },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "remember",
      description:
        "Write a load-bearing memory. category: lesson | constraint | preference. Use after a loss or a user rule.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          name: { type: "string" },
          body: { type: "string" },
          symbol: { type: "string" },
          side: { type: "string" },
        },
        required: ["category", "name", "body"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "propose_trade",
      description:
        "Propose a paper order. The harness executes it if the book allows. Always include a reason.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["buy", "sell"] },
          type: { type: "string", enum: ["market", "limit"] },
          qty: { type: "number" },
          price: { type: "number" },
          leverage: { type: "number" },
          reason: { type: "string" },
        },
        required: ["symbol", "side", "qty", "reason"],
      },
    },
  },
];

export function skillPrompt(skill: InvestorSkill): string {
  return [
    `## Skill: ${skill.name} (${skill.author})`,
    skill.summary,
    `Signals: ${skill.signals.join("; ")}`,
    `Filters: ${skill.filters.join("; ")}`,
    `Sizing: ${skill.sizing}`,
    `Risk: ${skill.risk}`,
    `Universe: ${skill.universe}`,
    `Regime: ${skill.regime}`,
    `Cadence: ${skill.cadence}`,
    `Playbooks:\n${skill.playbooks.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
  ].join("\n");
}

export function buildSystemPrompt(input: {
  skills: string[];
  plugins: string[];
  followed: string[];
  book: PortfolioSnapshot;
  markets: Market[];
  focus?: string;
  memoryText?: string;
}): string {
  const loaded = SKILLS.filter((s) => input.skills.includes(s.id));
  const plugs = PLUGINS.filter((p) => input.plugins.includes(p.id));
  const follows = GALLERY.filter((a) => input.followed.includes(a.id));
  const tape = input.markets
    .slice(0, 24)
    .map(
      (m) =>
        `${m.symbol.padEnd(12)} ${m.price.toPrecision(6)}  ${m.change24h >= 0 ? "+" : ""}${m.change24h.toFixed(2)}%  ${m.venue}  ${m.source ?? "seed"}`,
    )
    .join("\n");

  return `You are Aether, a local-first AI Finance Agent. Codex for markets.

You are the brain, not the vault. The user keeps self-custody. This book is paper by default.
You never give personalized financial advice as a licensed advisor. You reason in public, cite skills, and wait for the harness to execute.

Four pillars:
- Models: you are the cognition (Grok or an ACP-connected local code agent).
- Skills: investor judgment systems the user loaded.
- Plugins: what you can see.
- Execution: paper venues — spot, perps, prediction markets, equities. Tape is OKX, Backpack, or Phoenix.

Rules:
- Think like the loaded skills. If none are loaded, say so and reason plainly.
- Prefer tools over guesses for marks and the book.
- Size from cash and existing heat. Do not blow the book up.
- If the kill switch is on, do not propose trades.
- When you want to trade, call propose_trade (or emit a \`\`\`trade JSON block if tools are unavailable).
- Memory is load-bearing. If a lesson forbids a symbol/side, refuse and cite it. Do not re-derive a losing trade from a fresh chat.
- Be concise. Lead with the decision, then the why.
- Prediction markets are quoted as implied probability 0–1.

Loaded skills:
${loaded.length ? loaded.map(skillPrompt).join("\n\n") : "(none)"}

Enabled plugins: ${plugs.map((p) => p.name).join(", ") || "(market data only)"}

Followed agents:
${follows.length ? follows.map((a) => `- ${a.name} / ${a.manager}: ${a.thesis}`).join("\n") : "(none)"}

Book:
- Cash: ${input.book.cash.toFixed(2)} USD
- Equity: ${input.book.equity.toFixed(2)} USD
- Day PnL: ${input.book.dayPnl.toFixed(2)}
- Kill switch: ${input.book.killSwitch ? "ON" : "off"}
- Positions: ${
    input.book.positions.length
      ? input.book.positions
          .map((p) => `${p.side} ${p.qty} ${p.symbol} @ ${p.avgPrice} x${p.leverage}`)
          .join("; ")
      : "flat"
  }

Focus symbol: ${input.focus ?? "none"}

${input.memoryText ?? "Memory: (none)"}

Tape:
${tape}
`;
}

export function toAcpPrompt(system: string, history: ChatMessage[], user: string): AcpContent[] {
  const hist = history
    .slice(-12)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");
  return [
    { type: "text", text: user },
    {
      type: "resource",
      resource: {
        uri: "aether://harness/system.md",
        mimeType: "text/markdown",
        text: system,
      },
    },
    {
      type: "resource",
      resource: {
        uri: "aether://harness/history.md",
        mimeType: "text/markdown",
        text: hist || "(new session)",
      },
    },
  ];
}

export type GrokMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
};

export async function grokChat(input: {
  messages: GrokMessage[];
  tools?: typeof FINANCE_TOOLS;
  stream?: false;
}): Promise<{
  content: string;
  tool_calls?: GrokMessage["tool_calls"];
  error?: string;
}> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { content: "", error: "AI is not available in this environment" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages: input.messages,
      tools: input.tools,
      temperature: 0.4,
      max_tokens: 1400,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { content: "", error: `xAI API error ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}` };
  }
  const json = (await res.json()) as {
    choices: Array<{
      message: {
        content?: string | null;
        tool_calls?: GrokMessage["tool_calls"];
      };
    }>;
  };
  const msg = json.choices[0]?.message;
  return { content: msg?.content ?? "", tool_calls: msg?.tool_calls };
}
