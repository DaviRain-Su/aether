#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err?.message || err)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

try {
  await page.goto(`${base}/devices`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(800);
  const intro = await page.locator("h1").first().innerText();
  if (!/Devices/.test(intro)) throw new Error(`unexpected heading: ${intro}`);

  await page.getByRole("button", { name: "Desk" }).click();
  await page.waitForTimeout(400);

  const name = page.getByPlaceholder("Machine name");
  await name.fill("QA desk");
  await page.getByRole("button", { name: "Issue code" }).click();
  await page.getByRole("button", { name: "Pair this browser" }).waitFor({ timeout: 10000 });
  const code = (await page.locator("p.font-mono.text-2xl").first().innerText()).trim();
  if (!/^AETH-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)) throw new Error(`bad code ${code}`);

  await page.getByRole("button", { name: "Pair this browser" }).click();
  await page.waitForSelector("text=online", { timeout: 10000 });

  await page.getByRole("button", { name: "Start agent" }).click();
  await page.waitForSelector("text=running", { timeout: 10000 });
  await page.screenshot({ path: "/workspace/screenshots/fleet-paired.png" });

  await page.goto(`${base}/trade`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(800);
  const select = page.locator("select").last();
  const options = await select.locator("option").allTextContents();
  const seat = options.find((o) => o.startsWith("Relay"));
  if (!seat) throw new Error(`no relay seat in ${options.join(" | ")}`);
  const value = await select.locator("option", { hasText: seat }).first().getAttribute("value");
  await select.selectOption(value);
  await page.getByPlaceholder("Natural language. The harness executes.").fill("What is the tape saying?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForTimeout(2500);
  const body = await page.locator("aside").nth(1).innerText();
  if (!/Relay|Desk Rules|ACP|tape|Stand aside|Playbook/i.test(body)) {
    throw new Error(`agent pane missing relay output:\n${body.slice(0, 600)}`);
  }
  await page.screenshot({ path: "/workspace/screenshots/fleet-trade.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/devices`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/workspace/screenshots/fleet-mobile.png" });

  console.log(JSON.stringify({ ok: true, code, seat, errors }, null, 2));
  if (errors.length) process.exit(2);
} catch (err) {
  await page.screenshot({ path: "/workspace/screenshots/fleet-fail.png" }).catch(() => {});
  console.error(JSON.stringify({ ok: false, error: String(err?.message || err), errors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
