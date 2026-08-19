import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { g as formatUsd, m as formatPct, n as GALLERY, s as SKILLS, x as venueLabel } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { c as useHarness, r as PageIntro, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/agents-Czj9JG1H.js
var import_jsx_runtime = require_jsx_runtime();
function AgentsPage() {
	const followed = useHarness((s) => s.followed);
	const toggle = useHarness((s) => s.toggleFollow);
	const toggleSkill = useHarness((s) => s.toggleSkill);
	const skills = useHarness((s) => s.skills);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
		kicker: "Gallery",
		title: "Invest with other judgment systems",
		body: "Each agent is a skill plus a paper track. Follow one and Aether loads that skill into the harness. This is not copy-trading of live money."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6",
		children: GALLERY.map((a) => {
			const on = followed.includes(a.id);
			const skill = SKILLS.find((s) => s.id === a.skillId);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "flex flex-col rounded-lg border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-wide text-subtle",
							children: a.manager
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 font-display text-2xl",
							children: a.name
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: a.style })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: a.thesis
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-4 grid grid-cols-2 gap-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								k: "YTD",
								v: formatPct(a.returnYtd),
								up: a.returnYtd >= 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								k: "30d",
								v: formatPct(a.return30d),
								up: a.return30d >= 0
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								k: "Max DD",
								v: formatPct(a.maxDd),
								up: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
								k: "AUM",
								v: formatUsd(a.aum, 0)
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex flex-wrap gap-1",
						children: [a.markets.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: venueLabel(v) }, v)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "muted",
							children: skill?.name
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 flex gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							size: "sm",
							variant: on ? "secondary" : "default",
							onClick: () => {
								toggle(a.id);
								if (!on && !skills.includes(a.skillId)) toggleSkill(a.skillId);
							},
							children: on ? "Following" : "Follow"
						})
					})
				]
			}, a.id);
		})
	})] });
}
function Stat({ k, v, up }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-[11px] uppercase tracking-wide text-subtle",
		children: k
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: up === void 0 ? "font-mono" : up ? "font-mono text-up" : "font-mono text-down",
		children: v
	})] });
}
//#endregion
export { AgentsPage as component };
