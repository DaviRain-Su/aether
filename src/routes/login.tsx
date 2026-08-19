import { Link, createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () =>
    pageHead(
      "Sign in",
      "Sign in with Google, X, or email. That identity is the handle for a Privy embedded wallet.",
    ),
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setPending(true);
    try {
      if (mode === "up") {
        const { error } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? "trader",
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) throw new Error(error.message);
      }
      window.location.href = "/trade";
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Sign-in failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 text-fg">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-display text-2xl tracking-tight">
          Aether
        </Link>
        <h1 className="mt-8 font-display text-3xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Google signs you in. Privy mints the live wallet from that identity — not a second login. The desk still works as a guest on paper.
        </p>

        {authEnabled ? (
          <div className="mt-6 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/trade" })}
              >
                Continue with {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
        )}

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wide text-subtle">
          <span className="h-px flex-1 bg-border" />
          Email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={onEmail}>
          <Input
            type="email"
            required
            placeholder="you@desk.local"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            minLength={8}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err ? <p className="text-xs text-down">{err}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {mode === "in" ? "Sign in with email" : "Create account"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted hover:text-fg"
          onClick={() => setMode((m) => (m === "in" ? "up" : "in"))}
        >
          {mode === "in" ? "Need an account?" : "Already have an account?"}
        </button>
        <p className="mt-8">
          <Link to="/trade" className="text-sm text-muted hover:text-fg">
            Continue as guest
          </Link>
        </p>
      </div>
    </main>
  );
}
