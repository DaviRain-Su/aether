import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as formatUsd, p as equityOf } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { a as SignedOut, c as useHarness, i as SignedIn, r as PageIntro, s as useCurrentUser, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/accounts-DYCgjCQ9.js
var import_jsx_runtime = require_jsx_runtime();
function AccountsPage() {
	const user = useCurrentUser();
	const cash = useHarness((s) => s.cash);
	const positions = useHarness((s) => s.positions);
	const markets = useHarness((s) => s.markets);
	const kill = useHarness((s) => s.killSwitch);
	const setKill = useHarness((s) => s.setKillSwitch);
	const reset = useHarness((s) => s.resetBook);
	const eq = equityOf(cash, positions, markets);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
			kicker: "Accounts",
			title: "The brain, not the vault",
			body: "Paper USDC sits in this harness. Live venues stay self-custodial — Aether never holds keys. Connect a real book when you take the app onto your own machine."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 p-4 md:grid-cols-3 md:p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-wide text-subtle",
							children: "Paper vault"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 font-mono text-3xl tabular-nums",
							children: formatUsd(eq)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-1 text-sm text-muted",
							children: ["Cash ", formatUsd(cash)]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: [positions.length, " positions"] }), kill ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: "down",
								children: "Kill switch"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: "up",
								children: "Live"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-wide text-subtle",
							children: "Hyperliquid (paper)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-lg",
							children: "Perps desk"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "BTC, ETH, SOL, HYPE, DOGE perpetual marks. Leverage up to 20×. No deposit."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-wide text-subtle",
							children: "Predict (paper)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-lg",
							children: "Event book"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Polymarket-style implied odds. Buy the yes, sell the no. Settles never — this is a tape."
						})
					]
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "border-t border-border px-4 py-8 md:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Controls"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: kill ? "danger" : "secondary",
						onClick: () => setKill(!kill),
						children: kill ? "Release kill switch" : "Engage kill switch"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => reset(),
						children: "Reset paper book"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 max-w-xl text-sm text-muted",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Signed in as ",
						user?.displayName ?? user?.primaryEmail ?? "you",
						". The book on this device is still local; sign-in is for identity, not custody."
					] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"You are on a guest book stored in this browser.",
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/login",
							className: "text-fg underline-offset-2 hover:underline",
							children: "Sign in"
						}),
						" ",
						"if you want an identity on the desk."
					] }) })]
				})
			]
		})
	] });
}
//#endregion
export { AccountsPage as component };
