import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { d as useRouterState, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as Menu, d as Box, f as BookOpen, l as ChartLine, n as Wallet, o as Plug, t as X, u as Brain } from "../_libs/lucide-react.mjs";
import { b as uid, c as STARTING_CASH, d as cn, f as emptyBook, g as formatUsd, l as applyTrade, t as BUILTIN_MODELS, u as buildStaticMarkets, y as snapshotOf } from "./router-DRjGua5C.mjs";
import { i as signOut, n as authClient, t as Button } from "./button-BC8tvutv.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-D7ryNnhA.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled (default) -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	const { data, isPending } = authClient.useSession();
	const user = data?.user;
	return {
		user: user ? {
			id: user.id,
			displayName: user.name ?? null,
			primaryEmail: user.email ?? null,
			profileImageUrl: user.image ?? null,
			isDevFallback: false
		} : null,
		isPending
	};
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
/** Render children only when a user is present (real session, or the disabled-auth dev user). */
function SignedIn({ children }) {
	const { user } = useCurrentUserState();
	return user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children }) : null;
}
/**
* Render children only once we KNOW the visitor is signed out (`isPending` has
* cleared and there is no user). Hidden while the session is still loading.
*/
function SignedOut({ children }) {
	const { user, isPending } = useCurrentUserState();
	if (isPending || user) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of).
*/
function UserButton() {
	const user = useCurrentUser();
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => void signOut(),
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline",
				children: "Sign out"
			})
		]
	});
}
function asBook(s) {
	return {
		cash: s.cash,
		positions: s.positions,
		orders: s.orders,
		fills: s.fills,
		killSwitch: s.killSwitch
	};
}
var useHarness = create()(persist((set, get) => ({
	markets: buildStaticMarkets(),
	cash: STARTING_CASH,
	positions: [],
	orders: [],
	fills: [],
	killSwitch: false,
	focus: "BTC",
	venueFilter: "all",
	skills: ["druckenmiller"],
	plugins: [
		"market-data",
		"news",
		"predict"
	],
	followed: [],
	modelId: "grok-4.5",
	acpAgents: [{
		id: "loopback",
		name: "ACP Loopback",
		transport: "loopback",
		enabled: true,
		createdAt: Date.now()
	}],
	messages: [],
	streaming: false,
	hydrated: false,
	setMarkets: (markets) => set({ markets }),
	setFocus: (focus) => set({ focus }),
	setVenueFilter: (venueFilter) => set({ venueFilter }),
	toggleSkill: (id) => set((s) => ({ skills: s.skills.includes(id) ? s.skills.filter((x) => x !== id) : [...s.skills, id] })),
	togglePlugin: (id) => set((s) => ({ plugins: s.plugins.includes(id) ? s.plugins.filter((x) => x !== id) : [...s.plugins, id] })),
	toggleFollow: (id) => set((s) => {
		return { followed: !s.followed.includes(id) ? [...s.followed, id] : s.followed.filter((x) => x !== id) };
	}),
	setModel: (modelId) => set({ modelId }),
	addAcpAgent: (a) => set((s) => ({ acpAgents: [...s.acpAgents, {
		...a,
		id: uid("acp"),
		createdAt: Date.now()
	}] })),
	removeAcpAgent: (id) => set((s) => ({
		acpAgents: s.acpAgents.filter((a) => a.id !== id),
		modelId: s.modelId === `acp:${id}` ? "grok-4.5" : s.modelId
	})),
	setKillSwitch: (killSwitch) => set({ killSwitch }),
	submitTrade: (t) => {
		const s = get();
		const result = applyTrade(asBook(s), s.markets, t);
		if (result.error) return {
			ok: false,
			error: result.error
		};
		set({
			cash: result.book.cash,
			positions: result.book.positions,
			orders: result.book.orders,
			fills: result.book.fills
		});
		return { ok: true };
	},
	cancelOrder: (id) => set((s) => ({ orders: s.orders.map((o) => o.id === id && o.status === "open" ? {
		...o,
		status: "cancelled"
	} : o) })),
	resetBook: () => set({
		...emptyBook(),
		cash: STARTING_CASH
	}),
	pushMessage: (m) => {
		const id = m.id ?? uid("msg");
		set((s) => ({ messages: [...s.messages, {
			id,
			role: m.role,
			content: m.content,
			createdAt: Date.now(),
			tools: m.tools,
			acp: m.acp
		}] }));
		return id;
	},
	patchMessage: (id, patch) => set((s) => ({ messages: s.messages.map((m) => m.id === id ? {
		...m,
		...patch
	} : m) })),
	setStreaming: (streaming) => set({ streaming }),
	clearChat: () => set({ messages: [] }),
	snapshot: () => snapshotOf(asBook(get()), get().markets),
	book: () => asBook(get())
}), {
	name: "aether-harness",
	partialize: (s) => ({
		cash: s.cash,
		positions: s.positions,
		orders: s.orders,
		fills: s.fills,
		killSwitch: s.killSwitch,
		focus: s.focus,
		venueFilter: s.venueFilter,
		skills: s.skills,
		plugins: s.plugins,
		followed: s.followed,
		modelId: s.modelId,
		acpAgents: s.acpAgents,
		messages: s.messages.slice(-40)
	}),
	onRehydrateStorage: () => (state) => {
		if (state) state.hydrated = true;
	}
}));
function modelOptions(acpAgents) {
	return [...BUILTIN_MODELS, ...acpAgents.filter((a) => a.id !== "loopback").map((a) => ({
		id: `acp:${a.id}`,
		kind: "acp",
		name: a.name,
		vendor: `ACP · ${a.transport}`,
		blurb: a.transport === "stdio" ? `Local process: ${a.command ?? ""} ${(a.args ?? []).join(" ")}` : a.transport === "websocket" ? `WebSocket ${a.url ?? ""}` : "In-process ACP agent",
		acpId: a.id
	}))];
}
var NAV = [
	{
		to: "/trade",
		label: "Trade",
		icon: ChartLine
	},
	{
		to: "/agents",
		label: "Agents",
		icon: Brain
	},
	{
		to: "/skills",
		label: "Skills",
		icon: BookOpen
	},
	{
		to: "/plugins",
		label: "Plugins",
		icon: Plug
	},
	{
		to: "/models",
		label: "Models",
		icon: Box
	},
	{
		to: "/accounts",
		label: "Accounts",
		icon: Wallet
	}
];
function AppShell({ children }) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	const { user, isPending } = useCurrentUserState();
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	const equity = useHarness((s) => {
		const pos = s.positions.reduce((acc, p) => {
			const m = s.markets.find((x) => x.symbol === p.symbol);
			if (!m) return acc;
			const dir = p.side === "long" ? 1 : -1;
			return acc + (m.price - p.avgPrice) * p.qty * dir;
		}, 0);
		return s.cash + pos;
	});
	const day = equity - 1e5;
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-3 backdrop-blur-sm md:px-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "grid size-10 place-items-center rounded-sm text-muted md:hidden",
						onClick: () => setOpen((v) => !v),
						"aria-label": "Menu",
						children: open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-xl tracking-tight",
							children: "Aether"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "hidden text-[11px] uppercase tracking-[0.18em] text-subtle sm:inline",
							children: "Finance agent"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "ml-4 hidden items-center gap-0.5 md:flex",
						children: NAV.map((item) => {
							const on = path === item.to || path.startsWith(`${item.to}/`);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: item.to,
								className: cn("rounded-sm px-3 py-1.5 text-sm transition-colors duration-150", on ? "bg-raised text-fg" : "text-muted hover:text-fg"),
								children: item.label
							}, item.to);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden text-right sm:block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-sm tabular-nums",
								children: mounted ? formatUsd(equity) : formatUsd(1e5)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("text-[11px] tabular-nums", day >= 0 ? "text-up" : "text-down"),
								children: mounted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [day >= 0 ? "+" : "", formatUsd(day)] }) : "+$0.00"
							})]
						}), isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "size-8 animate-pulse rounded-full bg-raised" }) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedIn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {}) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignedOut, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							asChild: true,
							size: "sm",
							variant: "secondary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								children: "Sign in"
							})
						}) })]
					})
				]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border-b border-border bg-surface px-3 py-2 md:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-3 gap-1",
					children: NAV.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						onClick: () => setOpen(false),
						className: cn("flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs", path === item.to ? "bg-raised text-fg" : "text-muted"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-4" }), item.label]
					}, item.to))
				})
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "sticky bottom-0 z-30 grid grid-cols-6 border-t border-border bg-bg/95 md:hidden",
				children: NAV.map((item) => {
					const on = path === item.to;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.to,
						className: cn("flex min-h-12 flex-col items-center justify-center gap-0.5 text-[10px]", on ? "text-fg" : "text-subtle"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, { className: "size-4" }), item.label]
					}, item.to);
				})
			})
		]
	});
}
function Mark({ value, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("tabular-nums", value >= 0 ? "text-up" : "text-down", className),
		children: [
			value >= 0 ? "+" : "",
			value.toFixed(2),
			"%"
		]
	});
}
function PageIntro({ kicker, title, body, action }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-3 border-b border-border px-4 py-6 md:flex-row md:items-end md:justify-between md:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-[0.18em] text-subtle",
					children: kicker
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display mt-1 text-3xl tracking-tight md:text-4xl",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-xl text-sm text-muted",
					children: body
				})
			]
		}), action]
	});
}
//#endregion
export { SignedOut as a, useHarness as c, SignedIn as i, Mark as n, modelOptions as o, PageIntro as r, useCurrentUser as s, AppShell as t };
