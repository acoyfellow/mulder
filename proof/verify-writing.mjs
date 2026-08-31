import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("site output path is required");
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
const banned = ["→", "←", "—", "at its core", "let's dive into", "it's worth noting", "it's important to note", "game-changer", "paradigm shift", "ultimately", "in conclusion"];
for (const file of files) {
  const html = await readFile(file, "utf8");
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
  for (const phrase of banned) {
    if (text.includes(phrase.toLowerCase())) throw new Error(`writing rule violation in ${file}: ${phrase}`);
  }
}
const home = await readFile(join(root, "index.html"), "utf8");
const visibleHome = home.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").toLowerCase();
for (const jargon of ["artifact", "same-origin", "dispatch", "scalar", "semantics", "bootstrap", "manifest", "companion"]) {
  if (visibleHome.includes(jargon)) throw new Error(`homepage jargon: ${jargon}`);
}
const comparison = home.match(/<section class="section section-rule">.*?<\/section>/s)?.[0] ?? "";
if (comparison.includes("data-copy")) throw new Error("comparison diagrams must not have copy buttons");
const quickstart = await readFile(join(root, "docs", "quickstart", "index.html"), "utf8");
if (!quickstart.includes('class="token-keyword"') || !quickstart.includes('class="token-string"') || !quickstart.includes('<pre tabindex="0">')) throw new Error("code examples need keyboard access and syntax highlighting");
console.log(`MULDER_WRITING_OK:${files.length}-pages`);
