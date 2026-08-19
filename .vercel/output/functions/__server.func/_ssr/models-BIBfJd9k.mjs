import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { t as Button } from "./button-BC8tvutv.mjs";
import { c as useHarness, o as modelOptions, r as PageIntro, t as AppShell } from "./app-shell-D7ryNnhA.mjs";
import { t as Badge } from "./badge-4aiFOFz7.mjs";
import { t as Input } from "./input-D47CvrYP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/models-BIBfJd9k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ModelsPage() {
	const modelId = useHarness((s) => s.modelId);
	const setModel = useHarness((s) => s.setModel);
	const acpAgents = useHarness((s) => s.acpAgents);
	const add = useHarness((s) => s.addAcpAgent);
	const remove = useHarness((s) => s.removeAcpAgent);
	const options = modelOptions(acpAgents);
	const [name, setName] = (0, import_react.useState)("Claude Code");
	const [transport, setTransport] = (0, import_react.useState)("stdio");
	const [command, setCommand] = (0, import_react.useState)("claude-code");
	const [args, setArgs] = (0, import_react.useState)("--acp");
	const [cwd, setCwd] = (0, import_react.useState)("");
	const [url, setUrl] = (0, import_react.useState)("ws://127.0.0.1:9100");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageIntro, {
			kicker: "Models",
			title: "Cognition is swappable",
			body: "Grok runs in-process. ACP Loopback speaks the Agent Client Protocol against that same brain so you can inspect the handshake. Add a local code agent when you run Aether on your machine."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6",
			children: options.map((m) => {
				const active = modelId === m.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] uppercase tracking-wide text-subtle",
								children: m.vendor
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "mt-1 font-display text-2xl",
								children: m.name
							})] }), active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: "up",
								children: "Active"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: m.kind })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm text-muted",
							children: m.blurb
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: active ? "secondary" : "default",
								onClick: () => setModel(m.id),
								children: active ? "Selected" : "Use"
							}), m.acpId && m.acpId !== "loopback" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => remove(m.acpId),
								children: "Remove"
							}) : null]
						})
					]
				}, m.id);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "border-t border-border px-4 py-8 md:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-2xl",
					children: "Add a local ACP agent"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-2xl text-sm text-muted",
					children: "ACP is JSON-RPC 2.0. The harness is the client: initialize, session/new, session/prompt. The agent (Claude Code, Codex, Gemini CLI, OpenCode, or anything that implements the protocol) is the subprocess or WebSocket peer. On this preview host, stdio talks to the sandbox — use ACP Loopback here, and stdio/WebSocket when you run Aether locally."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-6 grid max-w-xl gap-3",
					onSubmit: (e) => {
						e.preventDefault();
						add({
							name,
							transport,
							command: transport === "stdio" ? command : void 0,
							args: transport === "stdio" ? args.split(" ").filter(Boolean) : void 0,
							cwd: cwd || void 0,
							url: transport === "websocket" ? url : void 0,
							enabled: true
						});
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-subtle",
							children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "mt-1",
								value: name,
								onChange: (e) => setName(e.target.value)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-subtle",
							children: ["Transport", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "mt-1 flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-fg",
								value: transport,
								onChange: (e) => setTransport(e.target.value),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "stdio",
										children: "stdio (local process)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "websocket",
										children: "WebSocket"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "loopback",
										children: "Loopback (in-process)"
									})
								]
							})]
						}),
						transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-subtle",
								children: ["Command", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1 font-mono",
									value: command,
									onChange: (e) => setCommand(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-subtle",
								children: ["Args", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1 font-mono",
									value: args,
									onChange: (e) => setArgs(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs text-subtle",
								children: ["Working directory", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "mt-1 font-mono",
									value: cwd,
									onChange: (e) => setCwd(e.target.value),
									placeholder: "/path/to/repo"
								})]
							})
						] }) : null,
						transport === "websocket" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-subtle",
							children: ["WebSocket URL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "mt-1 font-mono",
								value: url,
								onChange: (e) => setUrl(e.target.value)
							})]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							children: "Add agent"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-10 max-w-2xl rounded-lg border border-border bg-surface p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-fg",
							children: "Typical local commands"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-3 space-y-2 font-mono text-xs text-muted",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "claude-code --acp" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "codex --acp" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "gemini --experimental-acp" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "opencode acp" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "node scripts/acp-bridge.mjs --cmd \"claude-code --acp\"" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-subtle",
							children: "The bridge script exposes a stdio ACP agent over WebSocket if your runtime cannot spawn the process directly."
						})
					]
				})
			]
		})
	] });
}
//#endregion
export { ModelsPage as component };
