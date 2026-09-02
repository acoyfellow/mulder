import { mkdir, readFile } from "node:fs/promises";
import { runWebMcpProof } from "./native-harness.mjs";

const base = process.env.SITE_URL;
const browserPath = process.env.BROWSER_PATH;
const output = process.env.OUTPUT_DIR;
if (!base || !browserPath || !output) throw new Error("SITE_URL, BROWSER_PATH, and OUTPUT_DIR are required");
await mkdir(output, { recursive: true });

async function capture(name, width, height, path, expected) {
  const screenshotPath = `${output}/${name}.png`;
  const receipt = await runWebMcpProof({
    browserPath,
    url: `${base}${path}`,
    viewport: { width, height, mobile: width < 600 },
    requiredToolNames: [],
    calls: [],
    inspectExpression: `({ text: document.body.innerText, width: innerWidth, height: innerHeight, title: document.title })`,
    screenshotPath,
  });
  if (!receipt.inspected?.text?.includes(expected)) throw new Error(`${name} rendered page is missing ${expected}`);
  const mobileViewport = width < 600 && receipt.inspected.width >= 320 && receipt.inspected.width <= 500 && receipt.inspected.height >= 700;
  const desktopViewport = width >= 600 && receipt.inspected.width === width && receipt.inspected.height === height;
  if (!mobileViewport && !desktopViewport) throw new Error(`${name} has wrong viewport ${receipt.inspected.width}x${receipt.inspected.height}`);
  const png = await readFile(screenshotPath);
  if (png.length < 20_000 || png.toString("ascii", 1, 4) !== "PNG") throw new Error(`${name} screenshot is invalid`);
  if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height) throw new Error(`${name} screenshot has wrong dimensions`);
}

await capture("desktop-home", 1440, 1000, "/", "Turn your existing API into");
await capture("mobile-home", 390, 844, "/", "Build your first tool");
await capture("desktop-quickstart", 1280, 900, "/docs/quickstart/", "Your first browser tool in ten minutes");
const pwa = await runWebMcpProof({
  browserPath,
  url: `${base}/`,
  requiredToolNames: [],
  calls: [],
  inspectExpression: `(async () => {
    const registration = await navigator.serviceWorker.ready;
    const manifest = await fetch('/manifest.webmanifest').then((response) => response.json());
    const cacheNames = await caches.keys();
    return { state: registration.active?.state, name: manifest.name, display: manifest.display, icons: manifest.icons.length, cachedHome: Boolean(await caches.match('/')), cacheNames };
  })()`,
});
if (pwa.inspected?.state !== "activated" || pwa.inspected?.name !== "Mulder" || pwa.inspected?.display !== "standalone" || pwa.inspected?.icons !== 3 || !pwa.inspected?.cachedHome) throw new Error(`PWA did not install: ${JSON.stringify(pwa.inspected)}`);
console.log("MULDER_SITE_BROWSER_OK:desktop:mobile:quickstart:pwa");
