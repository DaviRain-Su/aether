import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { s as SKILLS } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { c as useHarness, r as PageIntro, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/skills-BG7794gf.js
var import_jsx_runtime = require_jsx_runtime();
function SkillsPage() {
	const loaded = useHarness((s) => s.skills);
	const toggle = useHarness((s) => s.toggleSkill);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
		kicker: "Skills",
		title: "Judgment, not prompts",
		body: "Each skill is a portable investor system: signals, filters, sizing, risk, universe, regime, playbooks. The agent has to use what you load."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6",
		children: SKILLS.map((s) => {
			const on = loaded.includes(s.id);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "flex flex-col rounded-lg border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] uppercase tracking-wide text-subtle",
							children: [
								s.author,
								" · ",
								s.era
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-1 font-display text-2xl",
							children: s.name
						})] }), on ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: "up",
							children: "Loaded"
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: s.summary
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
						className: "mt-3 space-y-1 text-xs text-subtle",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Universe · ", s.universe] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Sizing · ", s.sizing] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Cadence · ", s.cadence] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-1",
						children: s.signals.slice(0, 3).map((x) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: x }, x))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4",
						size: "sm",
						variant: on ? "secondary" : "default",
						onClick: () => toggle(s.id),
						children: on ? "Unload" : "Install"
					})
				]
			}, s.id);
		})
	})] });
}
//#endregion
export { SkillsPage as component };
