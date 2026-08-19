import "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as cn } from "./router-DRjGua5C.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-fg outline-none placeholder:text-subtle focus-visible:border-accent/50", className),
		...props
	});
}
//#endregion
export { Input as t };
