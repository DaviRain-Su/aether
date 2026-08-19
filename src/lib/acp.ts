import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { uid } from "./utils";

/** Agent Client Protocol (JSON-RPC 2.0) — client side + loopback agent. */

export type JsonRpcId = number | string;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcNotification = {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export type AcpContent =
  | { type: "text"; text: string }
  | { type: "resource"; resource: { uri: string; mimeType?: string; text?: string } };

export type AcpUpdate =
  | {
      sessionUpdate: "agent_message_chunk";
      messageId?: string;
      content: { type: "text"; text: string };
    }
  | {
      sessionUpdate: "agent_thought_chunk";
      content: { type: "text"; text: string };
    }
  | {
      sessionUpdate: "tool_call";
      toolCallId: string;
      title: string;
      kind?: string;
      status?: string;
    }
  | {
      sessionUpdate: "tool_call_update";
      toolCallId: string;
      status?: string;
      content?: Array<{ type: "content"; content: { type: "text"; text: string } }>;
    }
  | {
      sessionUpdate: "plan";
      entries: Array<{ content: string; priority?: string; status?: string }>;
    }
  | {
      sessionUpdate: "usage_update";
      used?: number;
      size?: number;
    };

export type AcpTransportKind = "loopback" | "stdio" | "websocket";

export type AcpConnectOptions = {
  transport: AcpTransportKind;
  command?: string;
  args?: string[];
  cwd?: string;
  url?: string;
  onUpdate?: (sessionId: string, update: AcpUpdate) => void;
};

type Pending = {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
};

export interface AcpTransport {
  send(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void;
  onMessage(cb: (msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void): void;
  close(): Promise<void>;
}

class LoopbackTransport implements AcpTransport {
  private handlers: Array<(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void> =
    [];
  private agent: LoopbackAgent;

  constructor(runPrompt: LoopbackPromptFn) {
    this.agent = new LoopbackAgent(runPrompt, (msg) => this.emit(msg));
  }

  send(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void {
    void this.agent.handle(msg);
  }

  onMessage(cb: (msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void): void {
    this.handlers.push(cb);
  }

  async close(): Promise<void> {
    this.handlers = [];
  }

  private emit(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) {
    for (const h of this.handlers) h(msg);
  }
}

class StdioTransport implements AcpTransport {
  private proc: ChildProcessWithoutNullStreams;
  private buf = "";
  private handlers: Array<(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void> =
    [];

  constructor(command: string, args: string[], cwd?: string) {
    this.proc = spawn(command, args, {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });
    this.proc.stdout.setEncoding("utf8");
    this.proc.stdout.on("data", (chunk: string) => {
      this.buf += chunk;
      let idx: number;
      while ((idx = this.buf.indexOf("\n")) >= 0) {
        const line = this.buf.slice(0, idx).trim();
        this.buf = this.buf.slice(idx + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;
          for (const h of this.handlers) h(msg);
        } catch {
          /* ignore partial / non-json */
        }
      }
    });
    this.proc.stderr.setEncoding("utf8");
    this.proc.stderr.on("data", (d: string) => {
      console.warn("[acp:stdio]", d.slice(0, 400));
    });
  }

  send(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void {
    this.proc.stdin.write(`${JSON.stringify(msg)}\n`);
  }

  onMessage(cb: (msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void): void {
    this.handlers.push(cb);
  }

  async close(): Promise<void> {
    this.proc.kill("SIGTERM");
  }
}

class WebsocketTransport implements AcpTransport {
  private ws: WebSocket;
  private handlers: Array<(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void> =
    [];
  private ready: Promise<void>;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", () => resolve());
      this.ws.addEventListener("error", () => reject(new Error(`ACP websocket failed: ${url}`)));
    });
    this.ws.addEventListener("message", (ev) => {
      try {
        const raw = typeof ev.data === "string" ? ev.data : String(ev.data);
        const msg = JSON.parse(raw) as JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;
        for (const h of this.handlers) h(msg);
      } catch {
        /* ignore */
      }
    });
  }

  send(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void {
    void this.ready.then(() => this.ws.send(JSON.stringify(msg)));
  }

  onMessage(cb: (msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void): void {
    this.handlers.push(cb);
  }

  async close(): Promise<void> {
    this.ws.close();
  }
}

export type LoopbackPromptFn = (input: {
  sessionId: string;
  prompt: AcpContent[];
  emit: (update: AcpUpdate) => void;
}) => Promise<{ stopReason: string }>;

class LoopbackAgent {
  private sessions = new Set<string>();

  constructor(
    private runPrompt: LoopbackPromptFn,
    private emit: (msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse) => void,
  ) {}

  async handle(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): Promise<void> {
    if (!("method" in msg) || !msg.method) return;
    const req = msg as JsonRpcRequest;
    try {
      if (req.method === "initialize") {
        this.reply(req.id, {
          protocolVersion: 1,
          agentCapabilities: {
            loadSession: false,
            promptCapabilities: { image: false, audio: false, embeddedContext: true },
          },
          agentInfo: { name: "Aether Loopback", title: "Aether ACP", version: "1.0.0" },
        });
        return;
      }
      if (req.method === "session/new") {
        const sessionId = uid("sess");
        this.sessions.add(sessionId);
        this.reply(req.id, { sessionId });
        return;
      }
      if (req.method === "session/prompt") {
        const params = (req.params ?? {}) as { sessionId?: string; prompt?: AcpContent[] };
        const sessionId = params.sessionId ?? "";
        const prompt = params.prompt ?? [];
        const result = await this.runPrompt({
          sessionId,
          prompt,
          emit: (update) => {
            this.emit({
              jsonrpc: "2.0",
              method: "session/update",
              params: { sessionId, update },
            });
          },
        });
        this.reply(req.id, result);
        return;
      }
      if (req.method === "session/cancel") return;
      if ("id" in req) {
        this.reply(req.id, undefined, { code: -32601, message: `Unknown method ${req.method}` });
      }
    } catch (err) {
      if ("id" in req) {
        this.reply(req.id, undefined, {
          code: -32000,
          message: err instanceof Error ? err.message : "ACP loopback error",
        });
      }
    }
  }

  private reply(
    id: JsonRpcId,
    result?: unknown,
    error?: { code: number; message: string },
  ) {
    const res: JsonRpcResponse = { jsonrpc: "2.0", id };
    if (error) res.error = error;
    else res.result = result ?? {};
    this.emit(res);
  }
}

export class AcpClient {
  private nextId = 1;
  private pending = new Map<JsonRpcId, Pending>();
  private transport: AcpTransport;
  private sessionId: string | null = null;
  readonly traces: Array<{ t: number; dir: "out" | "in"; method?: string; raw: unknown }> = [];
  private onUpdate?: (sessionId: string, update: AcpUpdate) => void;

  private constructor(transport: AcpTransport, onUpdate?: (s: string, u: AcpUpdate) => void) {
    this.transport = transport;
    this.onUpdate = onUpdate;
    transport.onMessage((msg) => this.inbound(msg));
  }

  static async connect(
    opts: AcpConnectOptions,
    runPrompt: LoopbackPromptFn,
  ): Promise<AcpClient> {
    let transport: AcpTransport;
    if (opts.transport === "stdio") {
      if (!opts.command) throw new Error("ACP stdio requires a command");
      transport = new StdioTransport(opts.command, opts.args ?? [], opts.cwd);
    } else if (opts.transport === "websocket") {
      if (!opts.url) throw new Error("ACP websocket requires a url");
      transport = new WebsocketTransport(opts.url);
    } else {
      transport = new LoopbackTransport(runPrompt);
    }
    const client = new AcpClient(transport, opts.onUpdate);
    await client.request("initialize", {
      protocolVersion: 1,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "Aether", title: "Aether Finance Harness", version: "1.0.0" },
    });
    const created = (await client.request("session/new", {
      cwd: opts.cwd ?? "/workspace",
      mcpServers: [],
    })) as { sessionId: string };
    client.sessionId = created.sessionId;
    return client;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async prompt(blocks: AcpContent[]): Promise<{ stopReason: string }> {
    if (!this.sessionId) throw new Error("No ACP session");
    const result = (await this.request("session/prompt", {
      sessionId: this.sessionId,
      prompt: blocks,
    })) as { stopReason: string };
    return result;
  }

  async close(): Promise<void> {
    await this.transport.close();
  }

  private request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };
    this.traces.push({ t: Date.now(), dir: "out", method, raw: msg });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`ACP timeout on ${method}`));
      }, 120_000);
      this.pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      this.transport.send(msg);
    });
  }

  private inbound(msg: JsonRpcRequest | JsonRpcNotification | JsonRpcResponse): void {
    this.traces.push({
      t: Date.now(),
      dir: "in",
      method: "method" in msg ? msg.method : undefined,
      raw: msg,
    });
    if ("method" in msg && msg.method === "session/update") {
      const params = (msg.params ?? {}) as { sessionId?: string; update?: AcpUpdate };
      if (params.sessionId && params.update) this.onUpdate?.(params.sessionId, params.update);
      return;
    }
    if ("id" in msg && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      if ("error" in msg && msg.error) p.reject(new Error(msg.error.message));
      else p.resolve("result" in msg ? msg.result : undefined);
    }
  }
}

const clientCache = new Map<string, Promise<AcpClient>>();

export function acpCacheKey(opts: {
  transport: AcpTransportKind;
  command?: string;
  url?: string;
}): string {
  return `${opts.transport}::${opts.command ?? ""}::${opts.url ?? "loopback"}`;
}

export async function getSharedAcpClient(
  key: string,
  connect: () => Promise<AcpClient>,
): Promise<AcpClient> {
  const existing = clientCache.get(key);
  if (existing) return existing;
  const p = connect().catch((err) => {
    clientCache.delete(key);
    throw err;
  });
  clientCache.set(key, p);
  return p;
}
