import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { m as ArrowRight } from "../_libs/lucide-react.mjs";
import { g as formatUsd, m as formatPct, n as GALLERY, s as SKILLS, u as buildStaticMarkets } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { n as Mark } from "./app-shell-D7ryNnhA.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Cge4NQ9I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PILLARS = [
	{
		k: "01",
		title: "Models",
		body: "Grok is built in. Any local code agent that speaks ACP — Claude Code, Codex, Gemini CLI, OpenCode — can sit in the same seat."
	},
	{
		k: "02",
		title: "Skills",
		body: "Investor judgment as portable SKILL.md systems. Livermore, Druckenmiller, Turtles, Hayes. Load one. The agent has to think that way."
	},
	{
		k: "03",
		title: "Plugins",
		body: "What the agent can see: marks, on-chain tape, news, mindshare, prediction books. A model without plugins is a chatbot."
	},
	{
		k: "04",
		title: "Execution",
		body: "Paper venues for spot, Hyperliquid-style perps, equities, and prediction markets. Self-custody later. The brain, not the vault."
	}
];
function LandingTicker() {
	const [tape, setTape] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setTape(buildStaticMarkets());
	}, []);
	if (!tape) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-9 border-y border-border" });
	const row = [...tape, ...tape];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-hidden border-y border-border",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "ticker-track flex w-max gap-6 px-4 py-2",
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
function Landing() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mx-auto flex max-w-6xl items-center justify-between px-5 py-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "font-display text-2xl tracking-tight",
						children: "Aether"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "hidden items-center gap-6 text-sm text-muted md:flex",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/trade",
								className: "hover:text-fg",
								children: "Trade"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/agents",
								className: "hover:text-fg",
								children: "Agents"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/models",
								className: "hover:text-fg",
								children: "Models"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/skills",
								className: "hover:text-fg",
								children: "Skills"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						size: "sm",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/trade",
							children: ["Launch app ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-3.5" })]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LandingTicker, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto max-w-6xl px-5 py-16 md:py-24",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-[0.22em] text-subtle",
						children: "AI finance agent"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "font-display mt-4 max-w-4xl text-4xl leading-[1.05] tracking-tight md:text-6xl",
						children: [
							"Invest with agents.",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"Keep the keys."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-6 max-w-xl text-base text-muted md:text-lg",
						children: "Aether is a persistent financial harness — models, skills, plugins, execution — so a local code agent can reason like a fund and trade a paper book you control."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 flex flex-wrap gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "lg",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/trade",
								children: "Open the desk"
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "lg",
							variant: "outline",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/models",
								children: "Connect ACP"
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto grid max-w-6xl gap-px bg-border md:grid-cols-4",
					children: PILLARS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: "bg-bg px-5 py-8",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[11px] text-subtle",
								children: p.k
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-3 font-display text-2xl",
								children: p.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm leading-relaxed text-muted",
								children: p.body
							})
						]
					}, p.k))
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto max-w-6xl px-5 py-16",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
						children: "Follow"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display mt-2 text-3xl",
						children: "Judgment, packaged as agents"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/agents",
						className: "hidden text-sm text-muted hover:text-fg md:inline",
						children: "All agents"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4",
					children: GALLERY.slice(0, 4).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/agents",
						className: "rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-raised",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] uppercase tracking-wide text-subtle",
								children: a.manager
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-lg",
								children: a.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 font-mono text-2xl tabular-nums text-up",
								children: formatPct(a.returnYtd)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-subtle",
								children: "YTD · paper track"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 line-clamp-3 text-sm text-muted",
								children: a.thesis
							})
						]
					}, a.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
							children: "ACP"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-2 text-3xl md:text-4xl",
							children: "Your code agent is the model."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm leading-relaxed text-muted",
							children: "Agent Client Protocol is how editors talk to Claude Code, Codex, Gemini CLI, and OpenCode. Aether is a client. Point it at a local stdio command or a WebSocket bridge and the same harness — book, skills, plugins — rides that agent instead of a hosted LLM."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							className: "mt-6",
							variant: "secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/models",
								children: "Add an ACP agent"
							})
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-lg border border-border bg-surface p-4 font-mono text-[12px] leading-relaxed text-muted",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-subtle",
							children: "// session/prompt"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "mt-2 overflow-x-auto whitespace-pre-wrap",
							children: `{
  "method": "session/prompt",
  "params": {
    "sessionId": "sess_…",
    "prompt": [
      { "type": "text", "text": "Size BTC from Druckenmiller." },
      { "type": "resource", "resource": {
          "uri": "aether://harness/system.md"
      }}
    ]
  }
}`
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "border-t border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-6xl px-5 py-16",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
							children: "We are the brain, not the vault"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display mt-3 max-w-3xl text-3xl md:text-5xl",
							children: "Scoped paper trading today. Self-custody when you take it local."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-5 max-w-2xl text-sm text-muted",
							children: [
								"Nothing here is financial advice. Skills are judgment systems, not promises. The kill switch is yours. ",
								SKILLS.length,
								" investor skills ship in the catalog."
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
				className: "border-t border-border px-5 py-8 text-xs text-subtle",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex max-w-6xl flex-col gap-2 md:flex-row md:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Aether · local financial harness" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Not a broker. Not advice. Paper book by default." })]
				})
			})
		]
	});
}
//#endregion
export { Landing as component };
