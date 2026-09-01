import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
if (!root) throw new Error("site output path is required");
const required = ["manifest.webmanifest", "sw.js", "sitemap.xml", "robots.txt", "social-card.jpg", "icons/favicon-32.png", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"];
for (const path of required) if ((await stat(join(root, path))).size === 0) throw new Error(`empty PWA asset: ${path}`);
const manifest = JSON.parse(await readFile(join(root, "manifest.webmanifest"), "utf8"));
if (manifest.name !== "Mulder" || manifest.start_url !== "/" || manifest.scope !== "/" || manifest.display !== "standalone") throw new Error("invalid web app manifest");
for (const [path, width, height] of [["icons/icon-192.png", 192, 192], ["icons/icon-512.png", 512, 512], ["icons/maskable-512.png", 512, 512], ["icons/apple-touch-icon.png", 180, 180], ["icons/favicon-32.png", 32, 32]]) {
  const png = await readFile(join(root, path));
  if (png.toString("ascii", 1, 4) !== "PNG" || png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw new Error(`wrong icon dimensions: ${path}`);
}
const worker = await readFile(join(root, "sw.js"), "utf8");
if (!worker.includes('addEventListener("install"') || !worker.includes('addEventListener("fetch"') || !worker.includes("caches.open")) throw new Error("service worker lacks offline handling");
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
  for (const value of ['rel="canonical"', 'rel="manifest"', 'property="og:image"', 'name="twitter:card"', 'type="application/ld+json"', 'rel="apple-touch-icon"']) if (!html.includes(value)) throw new Error(`${file} lacks ${value}`);
  if ([...html.matchAll(/<h1[ >]/g)].length !== 1) throw new Error(`${file} must have exactly one h1`);
}
const sitemap = await readFile(join(root, "sitemap.xml"), "utf8");
if ((sitemap.match(/<url>/g) ?? []).length !== 11 || !sitemap.includes("https://mulder.coey.dev/docs/quickstart/")) throw new Error("sitemap does not list every public route");
console.log(`MULDER_PWA_SEO_OK:${htmlFiles.length}-pages:${manifest.icons.length}-icons`);
