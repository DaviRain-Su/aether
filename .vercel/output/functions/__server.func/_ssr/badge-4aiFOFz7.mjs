import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as cn } from "./router-DRjGua5C.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/badge-4aiFOFz7.js
var import_jsx_runtime = require_jsx_runtime();
function Badge({ className, tone = "default", children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium tracking-wide", tone === "default" && "bg-raised text-muted", tone === "up" && "bg-up/15 text-up", tone === "down" && "bg-down/15 text-down", tone === "muted" && "text-subtle", className),
		children
	});
}
//#endregion
export { Badge as t };
