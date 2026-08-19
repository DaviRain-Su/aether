import type {
  FollowedAgent,
  InvestorSkill,
  Market,
  ModelOption,
  PluginDef,
  Venue,
} from "./types";

export const STARTING_CASH = 100_000;

export const BUILTIN_MODELS: ModelOption[] = [
  {
    id: "desk-rules",
    kind: "grok",
    name: "Desk Rules",
    vendor: "Local",
    blurb: "No LLM. Runs the loaded skill against the tape. Always on, even without an API key.",
  },
  {
    id: "grok-4.5",
    kind: "grok",
    name: "Grok 4.5",
    vendor: "xAI",
    blurb: "Built-in reasoning core. Tool-calling across quotes, book, and execution.",
  },
  {
    id: "acp-loopback",
    kind: "acp",
    name: "ACP Loopback",
    vendor: "Aether",
    blurb: "In-process Agent Client Protocol agent wrapping Grok. Use this to verify the ACP path.",
    acpId: "loopback",
  },
];

const CRYPTO: Array<{
  symbol: string;
  name: string;
  id: string;
  base: number;
}> = [
  { symbol: "BTC", name: "Bitcoin", id: "bitcoin", base: 97420 },
  { symbol: "ETH", name: "Ethereum", id: "ethereum", base: 3420 },
  { symbol: "SOL", name: "Solana", id: "solana", base: 178 },
  { symbol: "HYPE", name: "Hyperliquid", id: "hyperliquid", base: 24.8 },
  { symbol: "DOGE", name: "Dogecoin", id: "dogecoin", base: 0.168 },
  { symbol: "WIF", name: "dogwifhat", id: "dogwifcoin", base: 0.14 },
  { symbol: "BONK", name: "Bonk", id: "bonk", base: 0.00002 },
  { symbol: "PUMP", name: "Pump", id: "pump-fun", base: 0.003 },
  { symbol: "JUP", name: "Jupiter", id: "jupiter-exchange-solana", base: 0.17 },
  { symbol: "XRP", name: "XRP", id: "ripple", base: 2.42 },
  { symbol: "BNB", name: "BNB", id: "binancecoin", base: 612 },
  { symbol: "ADA", name: "Cardano", id: "cardano", base: 0.78 },
];

const EQUITIES: Array<{ symbol: string; name: string; base: number }> = [
  { symbol: "SPX", name: "S&P 500", base: 5482 },
  { symbol: "NVDA", name: "NVIDIA", base: 128.4 },
  { symbol: "AAPL", name: "Apple", base: 228.1 },
  { symbol: "TSLA", name: "Tesla", base: 248.6 },
  { symbol: "MSFT", name: "Microsoft", base: 428.9 },
  { symbol: "AMZN", name: "Amazon", base: 198.2 },
];

const PREDICTS: Array<{
  symbol: string;
  name: string;
  base: number;
}> = [
  { symbol: "US-ELECT-26", name: "US House 2026 majority", base: 0.52 },
  { symbol: "BTC-100K", name: "BTC above $100k by year-end", base: 0.61 },
  { symbol: "FED-CUT", name: "Fed cuts next meeting", base: 0.38 },
  { symbol: "ETH-ETF-FLOW", name: "ETH ETF net inflow this month", base: 0.57 },
];

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededWalk(seed: string, now = Date.now(), steps = 48): number[] {
  const bucket = Math.floor(now / 4000);
  const out: number[] = [];
  let x = 1;
  for (let i = 0; i < steps; i++) {
    const n = hash32(`${seed}:${bucket - (steps - i)}`);
    const delta = ((n % 1000) - 500) / 9000;
    x = Math.max(0.2, x * (1 + delta));
    out.push(x);
  }
  return out;
}

export function seedPrice(base: number, seed: string, now = Date.now()): number {
  const walk = seededWalk(seed, now, 24);
  return base * walk[walk.length - 1]!;
}

export function seedChange(seed: string, now = Date.now()): number {
  const n = hash32(`${seed}:chg:${Math.floor(now / 60_000)}`);
  return ((n % 1600) - 700) / 100;
}

function sparkFrom(base: number, seed: string, now: number): number[] {
  return seededWalk(seed, now).map((m) => base * m);
}

export function buildStaticMarkets(now = Date.now()): Market[] {
  const spots: Market[] = CRYPTO.map((c) => {
    const price = seedPrice(c.base, c.symbol, now);
    const spark = sparkFrom(c.base, c.symbol, now);
    const change24h = seedChange(c.symbol, now);
    return {
      symbol: c.symbol,
      name: c.name,
      venue: "spot" as Venue,
      base: c.symbol,
      quote: "USD",
      coingeckoId: c.id,
      price,
      change24h,
      volume24h: c.base * 1_000_000 * (0.4 + (hash32(c.symbol) % 80) / 100),
      high24h: price * 1.018,
      low24h: price * 0.982,
      spark,
    };
  });

  const perps: Market[] = CRYPTO.map((c) => {
    const m = spots.find((s) => s.symbol === c.symbol)!;
    return {
      ...m,
      symbol: `${c.symbol}-PERP`,
      name: `${c.name} Perp`,
      venue: "perp" as Venue,
      price: m.price * (1 + seedChange(`${c.symbol}-p`, now) / 10000),
    };
  });

  const eqs: Market[] = EQUITIES.map((e) => {
    const price = seedPrice(e.base, e.symbol, now);
    return {
      symbol: e.symbol,
      name: e.name,
      venue: "equity" as Venue,
      base: e.symbol,
      quote: "USD",
      price,
      change24h: seedChange(e.symbol, now),
      volume24h: e.base * 80_000,
      high24h: price * 1.012,
      low24h: price * 0.988,
      spark: sparkFrom(e.base, e.symbol, now),
    };
  });

  const preds: Market[] = PREDICTS.map((p) => {
    const price = Math.min(0.97, Math.max(0.03, seedPrice(p.base, p.symbol, now)));
    return {
      symbol: p.symbol,
      name: p.name,
      venue: "predict" as Venue,
      base: p.symbol,
      quote: "USD",
      price,
      change24h: seedChange(p.symbol, now) / 4,
      volume24h: 2_400_000 + (hash32(p.symbol) % 800_000),
      high24h: Math.min(0.99, price + 0.04),
      low24h: Math.max(0.01, price - 0.04),
      spark: sparkFrom(p.base, p.symbol, now).map((v) =>
        Math.min(0.97, Math.max(0.03, v)),
      ),
    };
  });

  return [...spots, ...perps, ...eqs, ...preds];
}

export const COINGECKO_IDS: Record<string, string> = Object.fromEntries(
  CRYPTO.map((c) => [c.symbol, c.id]),
);

export const SKILLS: InvestorSkill[] = [
  {
    id: "druckenmiller",
    name: "Liquidity Macro",
    author: "Stanley Druckenmiller",
    era: "1981–",
    summary:
      "Top-down liquidity regimes. Concentrate when the tape agrees. Cut losers immediately.",
    signals: ["Dollar liquidity", "Real rates impulse", "Cross-asset confirmation"],
    filters: ["No fading a funded trend", "Avoid low-conviction scatter"],
    sizing: "Highly concentrated. 1–3 expressions of the same macro view.",
    risk: "Fast loss cutting. Never average a broken thesis.",
    universe: "FX, rates, indices, mega-cap, BTC as a liquidity proxy",
    regime: "Risk-on when liquidity expands; defensive when it contracts.",
    playbooks: [
      "Identify the liquidity impulse first",
      "Wait for price confirmation",
      "Size up only after the tape agrees",
      "Exit the moment the impulse reverses",
    ],
    cadence: "Weekly thesis, daily risk",
  },
  {
    id: "livermore",
    name: "Tape & Pivots",
    author: "Jesse Livermore",
    era: "1907–1940",
    summary: "Trade the line of least resistance. Pyramids on confirmation. Never argue with the tape.",
    signals: ["Pivot break", "Volume expansion", "Higher highs after rest"],
    filters: ["No dull markets", "No fading a confirmed pivot"],
    sizing: "Probe small, pyramid into strength, never into weakness.",
    risk: "Hard stops under the last pivot. Pride is expensive.",
    universe: "Liquid leaders only",
    regime: "Bull: buy breakouts. Bear: sell breakdowns. Chop: stand aside.",
    playbooks: [
      "Map the pivotal point",
      "Enter on confirmation, not prediction",
      "Add only if the position is already right",
      "Get out when the line of least resistance flips",
    ],
    cadence: "Session to multi-week swing",
  },
  {
    id: "buffett",
    name: "Owner Earnings",
    author: "Warren Buffett",
    era: "1956–",
    summary: "Buy durable businesses at a discount to owner earnings. Time is a friend of the wonderful company.",
    signals: ["Moat durability", "Owner earnings yield", "Capital allocation quality"],
    filters: ["No turnarounds without a fortress", "No leverage you cannot explain"],
    sizing: "Concentrated quality. Few names, long duration.",
    risk: "Permanent capital loss, not mark-to-market noise. Margin of safety first.",
    universe: "Understandable cash businesses",
    regime: "Buy more fear. Sit on cash when prices are silly.",
    playbooks: [
      "Write the one-page business",
      "Estimate owner earnings through a cycle",
      "Require a margin of safety",
      "Do nothing most days",
    ],
    cadence: "Years",
  },
  {
    id: "turtle",
    name: "Turtle Breakout",
    author: "Richard Dennis / Turtles",
    era: "1983–",
    summary: "Donchian breakouts, ATR unit sizing, pyramids, hard stops. Systematic, not clever.",
    signals: ["20-day / 55-day channel break", "ATR expansion"],
    filters: ["Skip correlated copies of the same bet", "Respect heat cap"],
    sizing: "N-unit risk. Add on strength. Never more than portfolio heat allows.",
    risk: "2N stop. Whipsaws are tuition. Do not override the system.",
    universe: "Liquid futures-like instruments: BTC, ETH, indices, metals proxies",
    regime: "Works in trends. Loses in chop. Stay mechanical.",
    playbooks: [
      "Compute N (ATR)",
      "Enter the break",
      "Pyramid at +0.5N",
      "Trail or stop at 2N",
    ],
    cadence: "Daily",
  },
  {
    id: "minervini-vcp",
    name: "VCP Momentum",
    author: "Mark Minervini",
    era: "1990–",
    summary: "Stage-2 trends, volatility contraction, tight pivots, fast loss cutting.",
    signals: ["VCP tightness", "RS leadership", "Volume dry-up then surge"],
    filters: ["No stage-4", "No wide-and-loose bases"],
    sizing: "Full position at the pivot. Cut if it fails immediately.",
    risk: "7–8% hard stop. Never hold a failed breakout.",
    universe: "High-RS equities and liquid crypto leaders",
    regime: "Only in confirmed bull legs.",
    playbooks: [
      "Find stage-2 leaders",
      "Wait for contraction",
      "Buy the pivot with volume",
      "Sell the failure without debate",
    ],
    cadence: "Daily / swing",
  },
  {
    id: "ansem-crypto",
    name: "Crypto Narrative",
    author: "Ansem",
    era: "2021–",
    summary: "L1 vs app-token structure, attention, reflexive retail flow, TA plus thesis.",
    signals: ["Mindshare acceleration", "Funding extremes", "Relative L1 strength"],
    filters: ["No bagholding dead narratives", "Size for illiquidity"],
    sizing: "Barbell: core L1, satellite narratives with tight risk.",
    risk: "Narrative decay is a stop. Leverage is optional, not a personality.",
    universe: "Majors + high-attention alts",
    regime: "Risk-on when BTC leads and funding is calm. Defensive when BTC dumps first.",
    playbooks: [
      "Is BTC giving permission?",
      "Which narrative is accelerating vs priced-in?",
      "Enter on a higher-low, not a green candle",
      "Exit when mindshare rolls over",
    ],
    cadence: "Hours to weeks",
  },
  {
    id: "hayes-liquidity",
    name: "Dollar Liquidity",
    author: "Arthur Hayes",
    era: "2020–",
    summary: "Crypto risk appetite is a dollar-liquidity trade. Funding and leverage cycles first.",
    signals: ["TGA / RRP / fiscal impulse", "Stablecoin supply", "Perp funding"],
    filters: ["Do not fade a liquidity wave with a local TA story"],
    sizing: "Asymmetric. Big when liquidity is expanding.",
    risk: "Leverage unwind risk. Respect basis and funding.",
    universe: "BTC, ETH, high-beta perps",
    regime: "Print → risk. Drain → hide.",
    playbooks: [
      "Map the dollar liquidity impulse",
      "Check funding and OI",
      "Express via BTC/ETH first",
      "De-risk when the impulse ends",
    ],
    cadence: "Weekly macro, daily execution",
  },
  {
    id: "dalio-allweather",
    name: "All Weather",
    author: "Ray Dalio",
    era: "1975–",
    summary: "Economic machine. Balance growth and inflation buckets. Risk parity, not dollar parity.",
    signals: ["Growth surprise", "Inflation surprise", "Policy stance"],
    filters: ["No single-factor concentration"],
    sizing: "Risk-balanced across four regimes.",
    risk: "Drawdowns from regime transitions. Rebalance, do not recency-trade.",
    universe: "Equities, long duration, commodities, cash / BTC as alt reserve",
    regime: "Always on. Tilt, do not abandon.",
    playbooks: [
      "Name the regime",
      "Check which bucket is underweight in risk terms",
      "Rebalance toward parity",
      "Avoid hero trades",
    ],
    cadence: "Monthly",
  },
  {
    id: "soros-reflexivity",
    name: "Reflexivity",
    author: "George Soros",
    era: "1969–",
    summary: "Prices change fundamentals which change prices. Find the flawed prevailing view.",
    signals: ["Crowd certainty", "Feedback between price and story", "Policy reaction function"],
    filters: ["No trades without a reflexive loop"],
    sizing: "Asymmetric. Press when the loop is confirmed.",
    risk: "Being early looks identical to being wrong. Use a thesis kill date.",
    universe: "Macro, crypto, crowded equities",
    regime: "Most powerful near turning points.",
    playbooks: [
      "Write the prevailing view",
      "Find the flaw",
      "Wait for the first feedback confirmation",
      "Press, then leave before the new dogma hardens",
    ],
    cadence: "Weeks to quarters",
  },
  {
    id: "marks-cycles",
    name: "Second-Level Cycles",
    author: "Howard Marks",
    era: "1985–",
    summary: "Second-level thinking. Know where we are in the cycle. Aggressiveness is a choice.",
    signals: ["Credit spreads", "Covenant quality", "Euphoria vs despair language"],
    filters: ["Do not buy average companies at peak multiples"],
    sizing: "Defensive near peaks, aggressive near washes.",
    risk: "The biggest risk is not volatility — it is overpaying.",
    universe: "Credit-sensitive assets, quality cyclicals, BTC as risk barometer",
    regime: "Move along the aggressiveness spectrum, slowly.",
    playbooks: [
      "Locate the cycle",
      "Ask what is already in the price",
      "Tilt risk, do not flip a switch",
      "Write the second-level view",
    ],
    cadence: "Quarterly",
  },
  {
    id: "lynch-growth",
    name: "GARP Stories",
    author: "Peter Lynch",
    era: "1977–1990",
    summary: "Understandable growth. Classify the company. PEG discipline. Monitor the story.",
    signals: ["Earnings acceleration", "Story still intact", "PEG < 1.5"],
    filters: ["No stories you cannot explain to a teenager"],
    sizing: "More names than Buffett, still researched.",
    risk: "Story break is an exit. Balance sheet first.",
    universe: "Equities with a real product",
    regime: "Works when growth is rewarded. Sit out speculative froth.",
    playbooks: [
      "Classify: slow / stalwart / fast / cycle / turnaround / asset",
      "Check PEG and debt",
      "Buy what you understand",
      "Sell when the story changes, not the quote",
    ],
    cadence: "Quarterly earnings",
  },
  {
    id: "seykota",
    name: "Systematic Trend",
    author: "Ed Seykota",
    era: "1970–",
    summary: "Mechanical trend. Volatility sizing. Whipsaw tolerance. The system is the edge.",
    signals: ["Channel / MA trend state", "Volatility for size"],
    filters: ["No discretionary overrides"],
    sizing: "Inverse to volatility. Small enough to sleep.",
    risk: "Defined per-trade. The account is a factory, not a casino.",
    universe: "Any liquid trendable market",
    regime: "Always in. Expect clusters of losses.",
    playbooks: [
      "Define the rule in one sentence",
      "Size off volatility",
      "Take every signal",
      "Never invent a reason to skip",
    ],
    cadence: "Daily",
  },
];

export const PLUGINS: PluginDef[] = [
  {
    id: "market-data",
    name: "Market Data",
    kind: "market",
    blurb: "Live tape from OKX, Backpack, and Phoenix on Solana. Equities and prediction books stay local.",
    source: "OKX · Backpack · Phoenix",
  },
  {
    id: "onchain",
    name: "On-chain",
    kind: "onchain",
    blurb: "Stablecoin supply, funding, open interest snapshots for BTC and ETH.",
    source: "Synthetic on-chain tape",
  },
  {
    id: "news",
    name: "News Wire",
    kind: "news",
    blurb: "Headlines the agent can cite when reasoning about a name.",
    source: "Aether wire",
  },
  {
    id: "social",
    name: "Social Heat",
    kind: "social",
    blurb: "Attention and mindshare scores for majors and narratives.",
    source: "Synthetic mindshare",
  },
  {
    id: "research",
    name: "Deep Research",
    kind: "research",
    blurb: "Lets the model open a longer reasoning pass over skills + book.",
    source: "Grok / ACP",
  },
  {
    id: "predict",
    name: "Prediction Markets",
    kind: "predict",
    blurb: "Polymarket-style events with implied odds the agent can trade.",
    source: "Aether predict book",
  },
];

export const GALLERY: FollowedAgent[] = [
  {
    id: "druk-macro",
    name: "Impulse",
    manager: "Druckenmiller Macro",
    skillId: "druckenmiller",
    modelHint: "Grok 4.5",
    markets: ["perp", "equity", "spot"],
    aum: 42_800_000,
    return30d: 8.4,
    returnYtd: 31.2,
    maxDd: -7.1,
    winRate: 54,
    thesis: "Dollar liquidity still expanding. Express via BTC-PERP and NVDA, cut on real-rate reversal.",
    style: "Concentrated macro",
  },
  {
    id: "live-tape",
    name: "Pivotal",
    manager: "Livermore Tape",
    skillId: "livermore",
    modelHint: "ACP Loopback",
    markets: ["spot", "perp"],
    aum: 11_200_000,
    return30d: 12.1,
    returnYtd: 44.0,
    maxDd: -14.6,
    winRate: 41,
    thesis: "Least resistance is still up in BTC and SOL. Probe, pyramid, never argue.",
    style: "Swing tape",
  },
  {
    id: "turtle-sys",
    name: "Channel",
    manager: "Turtle System",
    skillId: "turtle",
    modelHint: "Grok 4.5",
    markets: ["perp"],
    aum: 27_400_000,
    return30d: 4.2,
    returnYtd: 18.7,
    maxDd: -9.8,
    winRate: 38,
    thesis: "BTC and ETH 20-day channel still intact. Mechanical units only.",
    style: "Systematic",
  },
  {
    id: "vcp-lead",
    name: "Tight Pivot",
    manager: "Minervini VCP",
    skillId: "minervini-vcp",
    modelHint: "Grok 4.5",
    markets: ["equity", "spot"],
    aum: 9_600_000,
    return30d: 6.8,
    returnYtd: 27.5,
    maxDd: -8.2,
    winRate: 47,
    thesis: "NVDA and HYPE contracting after a stage-2 run. Wait for the tight pivot.",
    style: "Growth momentum",
  },
  {
    id: "hayes-liq",
    name: "Printer",
    manager: "Hayes Liquidity",
    skillId: "hayes-liquidity",
    modelHint: "ACP Loopback",
    markets: ["spot", "perp"],
    aum: 15_900_000,
    return30d: 9.7,
    returnYtd: 38.4,
    maxDd: -16.0,
    winRate: 49,
    thesis: "Net dollar liquidity still the only input that matters. BTC first, ETH second.",
    style: "Crypto macro",
  },
  {
    id: "dalio-aw",
    name: "Machine",
    manager: "Dalio All Weather",
    skillId: "dalio-allweather",
    modelHint: "Grok 4.5",
    markets: ["equity", "spot", "predict"],
    aum: 61_000_000,
    return30d: 1.8,
    returnYtd: 9.4,
    maxDd: -4.2,
    winRate: 58,
    thesis: "Growth + mild disinflation. Overweight equities and BTC as the alt reserve, underweight duration.",
    style: "Risk parity",
  },
  {
    id: "ansem-nar",
    name: "Mindshare",
    manager: "Ansem Narrative",
    skillId: "ansem-crypto",
    modelHint: "Grok 4.5",
    markets: ["spot", "perp"],
    aum: 6_400_000,
    return30d: 14.6,
    returnYtd: 51.3,
    maxDd: -22.4,
    winRate: 44,
    thesis: "SOL and HYPE still own the attention tape. Rotate, do not marry.",
    style: "Narrative",
  },
  {
    id: "buffett-qe",
    name: "Owner",
    manager: "Buffett Quality",
    skillId: "buffett",
    modelHint: "Grok 4.5",
    markets: ["equity"],
    aum: 88_000_000,
    return30d: 2.1,
    returnYtd: 12.8,
    maxDd: -5.5,
    winRate: 63,
    thesis: "AAPL and MSFT still compound owner earnings. Cash is a position.",
    style: "Long quality",
  },
];

export function venueLabel(v: Venue): string {
  switch (v) {
    case "spot":
      return "Spot";
    case "perp":
      return "Perp";
    case "predict":
      return "Predict";
    case "equity":
      return "Equity";
  }
}

export function marketBySymbol(markets: Market[], symbol: string): Market | undefined {
  return markets.find((m) => m.symbol === symbol);
}

export function inferVenue(symbol: string): Venue {
  if (symbol.endsWith("-PERP")) return "perp";
  if (PREDICTS.some((p) => p.symbol === symbol)) return "predict";
  if (EQUITIES.some((e) => e.symbol === symbol)) return "equity";
  return "spot";
}
