import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("site output path is required");
const css = await readFile(join(root, "styles.css"), "utf8");
for (const banned of ["letter-spacing:", "text-transform:uppercase", "box-shadow:", "font-weight:700", "font-weight:750", "font-weight:800"]) {
  if (css.includes(banned)) throw new Error(`Kumo rule violation: ${banned}`);
}
for (const required of ["body{margin:0;background:var(--paper);color:var(--ink);font-size:14px", ".nav a{color:var(--muted);font-size:14px", ".button{display:inline-flex", "font-size:14px;font-weight:600", ".content p,.content li{color:#343934;font-size:14px"]) {
  if (!css.includes(required)) throw new Error(`Kumo typography rule missing: ${required}`);
}
const files = [];
async function walk(directory) {
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) await walk(path);
    else if (name.endsWith(".html")) files.push(path);
  }
}
await walk(root);
for (const file of files) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gs)) {
    const heading = match[1].replace(/<[^>]+>/g, "").trim();
    const letters = heading.replace(/[^A-Za-z]/g, "");
    if (letters.length > 3 && heading === heading.toUpperCase()) throw new Error(`heading is not sentence case in ${file}: ${heading}`);
  }
}
console.log(`MULDER_KUMO_DESIGN_OK:${files.length}-pages`);
