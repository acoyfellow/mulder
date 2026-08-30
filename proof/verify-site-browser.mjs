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
  if (receipt.inspected.width !== width || receipt.inspected.height !== height) throw new Error(`${name} has wrong viewport ${receipt.inspected.width}x${receipt.inspected.height}`);
  const png = await readFile(screenshotPath);
  if (png.length < 20_000 || png.toString("ascii", 1, 4) !== "PNG") throw new Error(`${name} screenshot is invalid`);
  if (png.readUInt32BE(16) !== receipt.inspected.width || png.readUInt32BE(20) !== receipt.inspected.height) throw new Error(`${name} screenshot has wrong dimensions`);
}

await capture("desktop-home", 1440, 1000, "/", "Let browser agents use it");
await capture("mobile-home", 390, 844, "/", "Build your first tool");
await capture("desktop-quickstart", 1280, 900, "/docs/quickstart/", "Your first browser tool in ten minutes");
console.log("MULDER_SITE_BROWSER_OK:desktop:mobile:quickstart");
