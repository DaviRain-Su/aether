import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as GROK_PROVIDERS } from "./router-DRjGua5C.mjs";
import { n as authClient, r as signIn, t as Button } from "./button-BC8tvutv.mjs";
import { t as Input } from "./input-D47CvrYP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DI11vDMG.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [mode, setMode] = (0, import_react.useState)("in");
	const [err, setErr] = (0, import_react.useState)(null);
	const [pending, setPending] = (0, import_react.useState)(false);
	async function onEmail(e) {
		e.preventDefault();
		setErr(null);
		setPending(true);
		try {
			if (mode === "up") {
				const { error } = await authClient.signUp.email({
					email,
					password,
					name: email.split("@")[0] ?? "trader"
				});
				if (error) throw new Error(error.message);
			} else {
				const { error } = await authClient.signIn.email({
					email,
					password
				});
				if (error) throw new Error(error.message);
			}
			window.location.href = "/trade";
		} catch (ex) {
			setErr(ex instanceof Error ? ex.message : "Sign-in failed");
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-dvh place-items-center bg-bg px-5 text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "font-display text-2xl tracking-tight",
					children: "Aether"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-8 font-display text-3xl",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "The desk works as a guest. Sign in if you want the book tied to an account."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 space-y-2",
					children: GROK_PROVIDERS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "secondary",
						className: "w-full",
						onClick: () => signIn(p.providerId, { callbackURL: "/trade" }),
						children: ["Continue with ", p.label]
					}, p.providerId))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "my-6 flex items-center gap-3 text-[11px] uppercase tracking-wide text-subtle",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" }),
						"Email",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px flex-1 bg-border" })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "space-y-3",
					onSubmit: onEmail,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							required: true,
							placeholder: "you@desk.local",
							value: email,
							onChange: (e) => setEmail(e.target.value)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							required: true,
							minLength: 8,
							placeholder: "Password",
							value: password,
							onChange: (e) => setPassword(e.target.value)
						}),
						err ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-down",
							children: err
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "w-full",
							disabled: pending,
							children: mode === "in" ? "Sign in with email" : "Create account"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-4 text-sm text-muted hover:text-fg",
					onClick: () => setMode((m) => m === "in" ? "up" : "in"),
					children: mode === "in" ? "Need an account?" : "Already have an account?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-8",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/trade",
						className: "text-sm text-muted hover:text-fg",
						children: "Continue as guest"
					})
				})
			]
		})
	});
}
//#endregion
export { Login as component };
