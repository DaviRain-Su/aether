import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime, t as useQuery } from "../_libs/react+tanstack__react-query.mjs";
import { a as Send, i as Square, p as ArrowUpRight, s as OctagonX } from "../_libs/lucide-react.mjs";
import { d as cn, g as formatUsd, h as formatQty, x as venueLabel } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { c as useHarness, n as Mark, o as modelOptions, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
import { t as Input } from "./input-D47CvrYP.mjs";
import { a as ResponsiveContainer, i as Area, n as YAxis, o as Tooltip, r as XAxis, t as AreaChart } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/trade-DG0snuiF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function fetchMarkets() {
	const res = await fetch("/api/markets");
	if (!res.ok) throw new Error("markets");
	return await res.json();
}
async function fetchCandles(symbol) {
	const res = await fetch(`/api/markets?candles=${encodeURIComponent(symbol)}`);
	if (!res.ok) return [];
	return (await res.json()).candles ?? [];
}
function TradeDesk() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	const setMarkets = useHarness((s) => s.setMarkets);
	const q = useQuery({
		queryKey: ["markets"],
		queryFn: fetchMarkets,
		refetchInterval: 12e3,
		enabled: mounted
	});
	(0, import_react.useEffect)(() => {
		if (q.data) setMarkets(q.data);
	}, [q.data, setMarkets]);
	if (!mounted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid min-h-[60vh] place-items-center text-sm text-subtle",
		children: "Opening the desk…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-[calc(100dvh-3.5rem)] flex-col md:h-[calc(100dvh-3.5rem)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticker, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_340px]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MarketList, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "order-2 flex min-h-0 flex-col border-border lg:order-none lg:border-x",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartPane, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OrderTicket, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookTabs, {})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AgentPane, {})
			]
		})]
	});
}
function Ticker() {
	const markets = useHarness((s) => s.markets);
	const row = [...markets, ...markets];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-hidden border-b border-border bg-surface",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ticker-track flex w-max gap-6 px-4 py-1.5",
			children: row.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-baseline gap-2 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted",
						children: m.symbol
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono tabular-nums",
						children: formatUsd(m.price)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { value: m.change24h })
				]
			}, `${m.symbol}-${i}`))
		})
	});
}
function MarketList() {
	const markets = useHarness((s) => s.markets);
	const focus = useHarness((s) => s.focus);
	const setFocus = useHarness((s) => s.setFocus);
	const venueFilter = useHarness((s) => s.venueFilter);
	const setVenueFilter = useHarness((s) => s.setVenueFilter);
	const filters = [
		"all",
		"spot",
		"perp",
		"equity",
		"predict"
	];
	const rows = markets.filter((m) => venueFilter === "all" || m.venue === venueFilter);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "hidden min-h-0 flex-col lg:flex",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-1 overflow-x-auto border-b border-border px-2 py-2",
			children: filters.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setVenueFilter(f),
				className: cn("rounded-sm px-2 py-1 text-[11px] uppercase tracking-wide", venueFilter === f ? "bg-raised text-fg" : "text-subtle hover:text-fg"),
				children: f
			}, f))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "min-h-0 flex-1 overflow-y-auto",
			children: rows.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setFocus(m.symbol),
				className: cn("flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-raised", focus === m.symbol && "bg-raised"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-sm",
					children: m.symbol
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "block text-[11px] text-subtle",
					children: venueLabel(m.venue)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block font-mono text-sm tabular-nums",
						children: formatUsd(m.price)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, {
						value: m.change24h,
						className: "text-[11px]"
					})]
				})]
			}, m.symbol))
		})]
	});
}
function ChartPane() {
	const focus = useHarness((s) => s.focus);
	const setFocus = useHarness((s) => s.setFocus);
	const markets = useHarness((s) => s.markets);
	const market = useHarness((s) => s.markets.find((m) => m.symbol === s.focus));
	const candles = useQuery({
		queryKey: ["candles", focus],
		queryFn: () => fetchCandles(focus),
		refetchInterval: 6e4
	});
	const data = (0, import_react.useMemo)(() => {
		if (candles.data?.length) return candles.data.map((c) => ({
			t: c.t,
			p: c.c
		}));
		return (market?.spark ?? []).map((p, i) => ({
			t: i,
			p
		}));
	}, [candles.data, market?.spark]);
	const up = (market?.change24h ?? 0) >= 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-b border-border px-3 pt-3 pb-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "hidden text-lg font-medium lg:block",
						children: market?.symbol ?? focus
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "lg:hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sr-only",
							children: "Symbol"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							value: focus,
							onChange: (e) => setFocus(e.target.value),
							className: "h-10 rounded-sm border border-border bg-surface px-2 text-sm text-fg",
							children: markets.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: m.symbol,
								children: m.symbol
							}, m.symbol))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: market ? venueLabel(market.venue) : "" })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: market?.name
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-right",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-mono text-xl tabular-nums",
					children: market ? formatUsd(market.price) : "—"
				}), market ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { value: market.change24h }) : null]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 h-40 md:h-52",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
				width: "100%",
				height: "100%",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
					data,
					margin: {
						top: 6,
						right: 0,
						left: 0,
						bottom: 0
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
							id: "px",
							x1: "0",
							y1: "0",
							x2: "0",
							y2: "1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: up ? "#34d399" : "#f87171",
								stopOpacity: .28
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: up ? "#34d399" : "#f87171",
								stopOpacity: 0
							})]
						}) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
							dataKey: "t",
							hide: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
							hide: true,
							domain: ["dataMin", "dataMax"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
							contentStyle: {
								background: "#111114",
								border: "1px solid #26262b",
								fontSize: 12
							},
							labelFormatter: () => "",
							formatter: (v) => [formatUsd(v), "Mark"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
							type: "monotone",
							dataKey: "p",
							stroke: up ? "#34d399" : "#f87171",
							fill: "url(#px)",
							strokeWidth: 1.4
						})
					]
				})
			})
		})]
	});
}
function OrderTicket() {
	const market = useHarness((s) => s.markets.find((m) => m.symbol === s.focus));
	const submit = useHarness((s) => s.submitTrade);
	const kill = useHarness((s) => s.killSwitch);
	const setKill = useHarness((s) => s.setKillSwitch);
	const [side, setSide] = (0, import_react.useState)("buy");
	const [qty, setQty] = (0, import_react.useState)("0.1");
	const [lev, setLev] = (0, import_react.useState)("1");
	const [err, setErr] = (0, import_react.useState)(null);
	function send() {
		if (!market) return;
		const n = Number(qty);
		const result = submit({
			symbol: market.symbol,
			side,
			type: "market",
			qty: n,
			leverage: market.venue === "perp" ? Number(lev) || 1 : 1,
			reason: "Manual ticket"
		});
		setErr(result.ok ? null : result.error ?? "Rejected");
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "border-b border-border px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs uppercase tracking-[0.16em] text-subtle",
					children: "Ticket"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setKill(!kill),
					className: cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px]", kill ? "bg-down/15 text-down" : "text-subtle hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OctagonX, { className: "size-3.5" }), kill ? "Kill switch on" : "Kill switch"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 flex gap-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: side === "buy" ? "up" : "secondary",
					className: "flex-1",
					onClick: () => setSide("buy"),
					children: "Buy"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: side === "sell" ? "down" : "secondary",
					className: "flex-1",
					onClick: () => setSide("sell"),
					children: "Sell"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-2 grid grid-cols-2 gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-subtle",
					children: ["Qty", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: qty,
						onChange: (e) => setQty(e.target.value),
						className: "mt-1 h-9 font-mono"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "text-[11px] text-subtle",
					children: ["Leverage", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: lev,
						onChange: (e) => setLev(e.target.value),
						disabled: market?.venue !== "perp",
						className: "mt-1 h-9 font-mono"
					})]
				})]
			}),
			err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-xs text-down",
				children: err
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "mt-2 w-full",
				variant: side === "buy" ? "up" : "down",
				onClick: send,
				disabled: kill,
				children: [
					"Market ",
					side,
					" ",
					market?.symbol
				]
			})
		]
	});
}
function BookTabs() {
	const [tab, setTab] = (0, import_react.useState)("positions");
	const positions = useHarness((s) => s.positions);
	const orders = useHarness((s) => s.orders);
	const fills = useHarness((s) => s.fills);
	const markets = useHarness((s) => s.markets);
	const cancel = useHarness((s) => s.cancelOrder);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "min-h-0 flex-1 overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex gap-3 border-b border-border px-3",
			children: [
				"positions",
				"orders",
				"fills"
			].map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setTab(t),
				className: cn("py-2 text-xs uppercase tracking-wide", tab === t ? "text-fg" : "text-subtle"),
				children: t
			}, t))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-h-40 overflow-y-auto md:max-h-none",
			children: [
				tab === "positions" && (positions.length ? positions.map((p) => {
					const px = markets.find((m) => m.symbol === p.symbol)?.price ?? p.avgPrice;
					const dir = p.side === "long" ? 1 : -1;
					const pnl = (px - p.avgPrice) * p.qty * dir;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-3 py-2 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mr-2 text-xs uppercase text-subtle",
								children: p.side
							}),
							p.symbol,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-muted",
								children: formatQty(p.qty)
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("font-mono tabular-nums", pnl >= 0 ? "text-up" : "text-down"),
							children: formatUsd(pnl)
						})]
					}, p.id);
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 py-4 text-sm text-subtle",
					children: "Flat. Ask the agent or use the ticket."
				})),
				tab === "orders" && (orders.length ? orders.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-3 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						o.side,
						" ",
						o.symbol,
						" · ",
						o.status
					] }), o.status === "open" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "text-xs text-muted",
						onClick: () => cancel(o.id),
						children: "Cancel"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-muted",
						children: formatUsd(o.price)
					})]
				}, o.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 py-4 text-sm text-subtle",
					children: "No orders."
				})),
				tab === "fills" && (fills.length ? fills.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-3 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						f.side,
						" ",
						formatQty(f.qty),
						" ",
						f.symbol
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-muted",
						children: formatUsd(f.price)
					})]
				}, f.id)) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-3 py-4 text-sm text-subtle",
					children: "No fills yet."
				}))
			]
		})]
	});
}
function AgentPane() {
	const messages = useHarness((s) => s.messages);
	const streaming = useHarness((s) => s.streaming);
	const push = useHarness((s) => s.pushMessage);
	const patch = useHarness((s) => s.patchMessage);
	const setStreaming = useHarness((s) => s.setStreaming);
	const snapshot = useHarness((s) => s.snapshot);
	const skills = useHarness((s) => s.skills);
	const plugins = useHarness((s) => s.plugins);
	const followed = useHarness((s) => s.followed);
	const modelId = useHarness((s) => s.modelId);
	const setModel = useHarness((s) => s.setModel);
	const acpAgents = useHarness((s) => s.acpAgents);
	const models = modelOptions(acpAgents);
	const focus = useHarness((s) => s.focus);
	const submitTrade = useHarness((s) => s.submitTrade);
	const [text, setText] = (0, import_react.useState)("");
	const scroller = (0, import_react.useRef)(null);
	const abort = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [messages, streaming]);
	async function send(seed) {
		const content = (seed ?? text).trim();
		if (!content || streaming) return;
		setText("");
		push({
			role: "user",
			content
		});
		const aid = push({
			role: "assistant",
			content: ""
		});
		setStreaming(true);
		abort.current = new AbortController();
		const acp = acpAgents.find((a) => modelId === `acp:${a.id}` || modelId === "acp-loopback" && a.id === "loopback");
		try {
			const res = await fetch("/api/agent/turn", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				signal: abort.current.signal,
				body: JSON.stringify({
					text: content,
					history: useHarness.getState().messages.filter((m) => m.id !== aid).slice(-16),
					skills,
					plugins,
					followed,
					modelId,
					acp: acp ? {
						id: acp.id,
						name: acp.name,
						transport: acp.transport,
						command: acp.command,
						args: acp.args,
						cwd: acp.cwd,
						url: acp.url
					} : void 0,
					book: snapshot(),
					focus
				})
			});
			if (!res.ok || !res.body) {
				patch(aid, { content: "The agent could not start. Try Grok, or check Models." });
				return;
			}
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buf = "";
			let acc = "";
			const tools = [];
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				buf += decoder.decode(value, { stream: true });
				const parts = buf.split("\n\n");
				buf = parts.pop() ?? "";
				for (const part of parts) {
					const line = part.replace(/^data:\s*/, "").trim();
					if (!line) continue;
					let ev;
					try {
						ev = JSON.parse(line);
					} catch {
						continue;
					}
					if (ev.type === "token") {
						acc += String(ev.text ?? "");
						patch(aid, { content: acc });
					} else if (ev.type === "tool") {
						const id = String(ev.id);
						const existing = tools.find((t) => t.id === id);
						if (existing) {
							existing.status = ev.status ?? "done";
							existing.result = ev.result ? String(ev.result) : existing.result;
						} else tools.push({
							id,
							name: String(ev.name),
							args: String(ev.args ?? ""),
							result: ev.result ? String(ev.result) : void 0,
							status: ev.status ?? "running"
						});
						patch(aid, { tools: [...tools] });
					} else if (ev.type === "trade") submitTrade(ev.trade);
					else if (ev.type === "acp") patch(aid, { acp: {
						sessionId: ev.sessionId,
						stopReason: ev.method
					} });
					else if (ev.type === "error") {
						acc = acc || String(ev.message);
						patch(aid, { content: acc });
					}
				}
			}
		} catch (err) {
			if (err.name !== "AbortError") patch(aid, { content: "Connection dropped mid-turn." });
		} finally {
			setStreaming(false);
		}
	}
	const prompts = [
		`What is the tape saying about ${focus}?`,
		"Size a probe from the loaded skill.",
		"Review the book and cut anything that violates risk."
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "order-1 flex min-h-[55vh] flex-col border-t border-border lg:order-none lg:min-h-0 lg:border-t-0",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between border-b border-border px-3 py-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: "Agent"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "block",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: "Model"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						value: modelId,
						onChange: (e) => setModel(e.target.value),
						className: "mt-0.5 bg-transparent text-[11px] text-subtle",
						children: models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: m.id,
							children: m.name
						}, m.id))
					})]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "size-4 text-subtle" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: scroller,
				className: "min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3",
				children: messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3 pt-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-2xl tracking-tight",
							children: "Ask the book a question."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: "Skills judge. Plugins see. The model thinks — Grok, or a local code agent over ACP."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-col gap-1",
							children: prompts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void send(p),
								className: "rounded-md border border-border px-3 py-2 text-left text-sm text-muted hover:text-fg",
								children: p
							}, p))
						})
					]
				}) : messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bubble, { msg: m }, m.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex items-end gap-2 border-t border-border p-2",
				onSubmit: (e) => {
					e.preventDefault();
					send();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: text,
					onChange: (e) => setText(e.target.value),
					placeholder: "Natural language. The harness executes.",
					className: "h-11"
				}), streaming ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					size: "icon",
					variant: "secondary",
					onClick: () => abort.current?.abort(),
					"aria-label": "Stop",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Square, { className: "size-4" })
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					size: "icon",
					"aria-label": "Send",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
				})]
			})
		]
	});
}
function Bubble({ msg }) {
	if (msg.role === "user") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "ml-6 rounded-md bg-raised px-3 py-2 text-sm",
		children: msg.content
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [
			msg.tools?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-1",
				children: msg.tools.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-sm border border-border px-2 py-1.5 text-[11px] text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-fg",
							children: t.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-subtle",
							children: t.status
						}),
						t.result ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-1 max-h-20 overflow-auto font-mono text-[10px] text-subtle",
							children: t.result.slice(0, 400)
						}) : null
					]
				}, t.id))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "whitespace-pre-wrap text-sm leading-relaxed text-fg",
				children: msg.content || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-subtle",
					children: "Thinking…"
				})
			}),
			msg.acp?.sessionId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-mono text-[10px] text-subtle",
				children: ["ACP ", msg.acp.sessionId]
			}) : null
		]
	});
}
function TradePage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeDesk, {}) });
}
//#endregion
export { TradePage as component };
