import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { o as PLUGINS } from "./router-DRjGua5C.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { c as useHarness, r as PageIntro, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/plugins-_yQwnI-Y.js
var import_jsx_runtime = require_jsx_runtime();
function PluginsPage() {
	const on = useHarness((s) => s.plugins);
	const toggle = useHarness((s) => s.togglePlugin);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
		kicker: "Plugins",
		title: "What the agent is allowed to see",
		body: "A skill without data is an opinion. Enable the feeds the model may query on a turn."
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6",
		children: PLUGINS.map((p) => {
			const enabled = on.includes(p.id);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: "rounded-lg border border-border bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl",
							children: p.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: p.kind })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm text-muted",
						children: p.blurb
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-subtle",
						children: p.source
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4",
						size: "sm",
						variant: enabled ? "secondary" : "default",
						onClick: () => toggle(p.id),
						children: enabled ? "Enabled" : "Enable"
					})
				]
			}, p.id);
		})
	})] });
}
//#endregion
export { PluginsPage as component };
