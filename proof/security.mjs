import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory = ".") {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".wrangler") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const files = sourceFiles();
const forbidden = ["registry-gateway" + ".cloudflare-ui.workers.dev", "npm.pkg" + ".github.com", "_auth" + "Token=", "BEGIN " + "PRIVATE KEY"];
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
