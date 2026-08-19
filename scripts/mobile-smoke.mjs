import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:8080/trade", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(800);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await page.screenshot({ path: "/workspace/screenshots/trade-mobile.png", fullPage: false });
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const overflowHome = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await page.screenshot({ path: "/workspace/screenshots/landing-mobile.png", fullPage: false });
console.log(JSON.stringify({ overflow, overflowHome, errors, title: await page.title() }, null, 2));
await browser.close();
