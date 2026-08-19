export type Venue = "spot" | "perp" | "predict" | "equity";

export type Side = "buy" | "sell";

export type OrderType = "market" | "limit";

export type OrderStatus = "open" | "filled" | "cancelled";

export type ModelKind = "grok" | "acp";

export type AcpTransport = "loopback" | "stdio" | "websocket";

export type TapeSource = "okx" | "backpack" | "phoenix" | "hyperliquid" | "coingecko" | "seed";

export type ChartBar = "1s" | "1m" | "3m" | "5m" | "15m" | "30m" | "1H" | "4H" | "1D";

export type Market = {
  symbol: string;
  name: string;
  venue: Venue;
  base: string;
  quote: string;
  coingeckoId?: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  spark: number[];
  source?: TapeSource;
  bid?: number;
  ask?: number;
};

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type BookLevel = {
  px: number;
  sz: number;
};

export type DepthBook = {
  instId: string;
  source: TapeSource;
  ts: number;
  bids: BookLevel[];
  asks: BookLevel[];
};

export type FundingSnap = {
  instId: string;
  rate: number;
  nextTime: number;
  premium?: number;
};

export type PrivacyPrefs = {
  hideBalances: boolean;
  hidePnl: boolean;
  hideIdentity: boolean;
};

export type Position = {
  id: string;
  symbol: string;
  venue: Venue;
  side: "long" | "short";
  qty: number;
  avgPrice: number;
  leverage: number;
  openedAt: number;
};

export type Order = {
  id: string;
  symbol: string;
  venue: Venue;
  side: Side;
  type: OrderType;
  qty: number;
  price: number;
  leverage: number;
  status: OrderStatus;
  createdAt: number;
  filledAt?: number;
};

export type Fill = {
  id: string;
  orderId: string;
  symbol: string;
  side: Side;
  qty: number;
  price: number;
  fee: number;
  createdAt: number;
};

export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ToolTrace = {
  id: string;
  name: string;
  args: string;
  result?: string;
  status: "pending" | "running" | "done" | "error";
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  tools?: ToolTrace[];
  acp?: { sessionId?: string; stopReason?: string };
  relay?: Array<{ from: string; to: string; method: string }>;
};

export type AcpAgentConfig = {
  id: string;
  name: string;
  transport: AcpTransport;
  command?: string;
  args?: string[];
  cwd?: string;
  url?: string;
  enabled: boolean;
  createdAt: number;
};

export type ModelOption = {
  id: string;
  kind: ModelKind;
  name: string;
  vendor: string;
  blurb: string;
  acpId?: string;
};

export type InvestorSkill = {
  id: string;
  name: string;
  author: string;
  era: string;
  summary: string;
  signals: string[];
  filters: string[];
  sizing: string;
  risk: string;
  universe: string;
  regime: string;
  playbooks: string[];
  cadence: string;
  exclusive?: boolean;
};

export type PluginDef = {
  id: string;
  name: string;
  kind: "market" | "onchain" | "news" | "social" | "research" | "predict";
  blurb: string;
  source: string;
};

export type FollowedAgent = {
  id: string;
  name: string;
  manager: string;
  skillId: string;
  modelHint: string;
  markets: Venue[];
  aum: number;
  return30d: number;
  returnYtd: number;
  maxDd: number;
  winRate: number;
  thesis: string;
  style: string;
};

export type ProposedTrade = {
  symbol: string;
  side: Side;
  type: OrderType;
  qty: number;
  price?: number;
  leverage?: number;
  reason: string;
};

export type PortfolioSnapshot = {
  cash: number;
  equity: number;
  positions: Position[];
  openOrders: Order[];
  dayPnl: number;
  killSwitch: boolean;
};
