#!/usr/bin/env node
/**
 * Pair a machine with Aether using a device code, then hold a relay seat.
 *
 *   node scripts/aether-connect.mjs --code AETH-XXXX-XXXX
 *   node scripts/aether-connect.mjs --code AETH-XXXX-XXXX --origin https://your-app.example
 */
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const code = (flag("--code", "") || "").toUpperCase().trim();
const origin = flag("--origin", "");
if (!/^AETH-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) {
  console.error("usage: node scripts/aether-connect.mjs --code AETH-XXXX-XXXX [--origin https://…]");
  process.exit(1);
}

const fingerprint = `cli_${process.env.USER ?? "box"}_${process.platform}`;
const base = origin || "http://127.0.0.1:8080";

const res = await fetch(`${base}/api/control/claim`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ code, fingerprint, name: `${process.platform} connector` }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(body.error ?? `claim failed ${res.status}`);
  process.exit(1);
}
console.log(`[aether-connect] paired ${body.device?.id ?? ""} as ${body.device?.name ?? "device"}`);
console.log(`[aether-connect] device code ${code} is this machine's identity`);
console.log("[aether-connect] hold this process. Start seats from the Fleet page.");

const beat = () => {
  fetch(`${base}/api/control/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: body.device.id, ownerId: body.ownerId }),
  }).catch(() => {});
};
beat();
setInterval(beat, 15_000);
