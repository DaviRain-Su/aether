const origin = "http://127.0.0.1:8080";
const guestId = "gtestmemory01";

const book = {
  cash: 100000,
  equity: 100000,
  positions: [],
  openOrders: [],
  dayPnl: 0,
  killSwitch: false,
};

async function remember() {
  const res = await fetch(`${origin}/api/memory`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      guestId,
      action: "ingest",
      text: "I lost money shorting SOL into a liquidity expansion. Remember that.",
      focus: "SOL",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.wrote) throw new Error(`remember failed ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function turn(text) {
  const res = await fetch(`${origin}/api/agent/turn`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      history: [],
      skills: ["druckenmiller"],
      plugins: ["market-data"],
      followed: [],
      modelId: "desk-rules",
      guestId,
      book,
      focus: "SOL",
    }),
  });
  if (!res.ok || !res.body) throw new Error(`turn ${res.status}`);
  const raw = await res.text();
  const events = raw
    .split("\n\n")
    .map((p) => p.replace(/^data:\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  return events;
}

const rec = await remember();
const events = await turn("Short SOL again. Size a probe.");
const tokens = events.filter((e) => e.type === "token").map((e) => e.text).join("");
const trades = events.filter((e) => e.type === "trade");
const refused = /refuse/i.test(tokens);

console.log(
  JSON.stringify(
    {
      remembered: rec.wrote,
      refused,
      trades: trades.length,
      excerpt: tokens.slice(0, 500),
    },
    null,
    2,
  ),
);

if (!refused || trades.length > 0) process.exit(1);
