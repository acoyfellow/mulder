import { access, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("site output path is required");
const requiredRoutes = ["/", "/docs/", "/docs/quickstart/", "/docs/browser-support/", "/docs/security/", "/docs/reference/", "/examples/", "/examples/operations/", "/examples/inventory/", "/examples/support/", "/examples/analytics/"];
const routeFile = (path) => path === "/" ? join(root, "index.html") : join(root, path, "index.html");
for (const route of requiredRoutes) await access(routeFile(route));

const home = await readFile(routeFile("/"), "utf8");
for (const phrase of ["Let browser agents use it", "Add Mulder to your existing Worker", "Existing API stays unchanged", "Build your first tool"]) {
  if (!home.includes(phrase)) throw new Error(`home is missing: ${phrase}`);
}
const quickstart = await readFile(routeFile("/docs/quickstart/"), "utf8");
for (const phrase of ["Public preview", "x-webmcp-enabled", "createWebMcpCompanion", "npm run check", "Chrome build that supports WebMCP"]) {
  if (!quickstart.includes(phrase)) throw new Error(`quickstart is missing: ${phrase}`);
}
const security = await readFile(routeFile("/docs/security/"), "utf8");
for (const phrase of ["does not give your API key to the browser", "cannot verify which browser agent made the call", "does not generate tools that change data"]) {
  if (!security.includes(phrase)) throw new Error(`security is missing: ${phrase}`);
}

const htmlFiles = [];
async function walk(directory) {
  for (const name of await readdir(directory)) {
    const path = join(directory, name);
    const info = await stat(path);
    if (info.isDirectory()) await walk(path);
    else if (name.endsWith(".html")) htmlFiles.push(path);
  }
}
await walk(root);
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!html.includes('<html lang="en">') || !html.includes('id="content"') || !html.includes("Skip to content")) throw new Error(`accessibility shell missing in ${file}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  if (new Set(ids).size !== ids.length) throw new Error(`duplicate id in ${file}`);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (!target.startsWith("/") || target.startsWith("/".repeat(2))) continue;
    const path = target.split(/[?#]/)[0];
    const candidate = path.endsWith("/") ? routeFile(path) : join(root, path);
    await access(candidate).catch(() => { throw new Error(`broken internal link ${target} in ${file}`); });
  }
}
const search = JSON.parse(await readFile(join(root, "search-index.json"), "utf8"));
if (search.length !== requiredRoutes.length) throw new Error(`search index has ${search.length} pages`);
for (const file of ["mulder-demo.mp4", "styles.css", "app.js", "og.svg", "demo-poster.png", "downloads/acoyfellow-mulder-0.1.0.tgz", "downloads/starter/package.json", "downloads/starter/index.ts", "downloads/starter/api.ts"]) {
  const info = await stat(join(root, file));
  if (!info.size) throw new Error(`empty asset: ${file}`);
}
console.log(`MULDER_SITE_ROUTES_OK:${requiredRoutes.length}:${htmlFiles.length}`);
