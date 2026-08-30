import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files", "-z"]).toString().split("\0").filter(Boolean);
const forbidden = ["registry-gateway.cloudflare-ui.workers.dev", "npm.pkg.github.com", "_authToken=", "BEGIN PRIVATE KEY"];
for (const file of files) {
  const bytes = readFileSync(file);
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const needle of forbidden) if (text.includes(needle)) throw new Error(`${file} contains forbidden release material`);
}
if (files.some((file) => file === ".dev.vars" || file.endsWith(".secret"))) throw new Error("tracked local secret file");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
if (packageJson.private !== true) throw new Error("research Worker must remain private until publication is approved");
const wrangler = readFileSync("wrangler.jsonc", "utf8");
if (!wrangler.includes('"workers_dev": false') || !wrangler.includes('"preview_urls": false')) throw new Error("public deployment defaults enabled");
if (!wrangler.includes('"class_name": "IntentDurableObject"')) throw new Error("durable approval binding missing");
console.log("MULDER_PRODUCT_SECURITY_OK");
