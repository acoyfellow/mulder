import { readFileSync, writeFileSync } from "node:fs";
import { runWebMcpProof } from "./native-harness.mjs";

const browserPath = process.env.BROWSER_PATH;
const marker = process.env.CONSUMER_MARKER;
const outputPath = process.env.OUTPUT_PATH;
if (!browserPath || !marker || !outputPath) throw new Error("BROWSER_PATH, CONSUMER_MARKER, and OUTPUT_PATH are required");
const base = "http://127.0.0.1:8893";
const control = await fetch(`${base}/api/weather/Lisbon?units=celsius`).then((response) => response.json());
if (control.marker !== marker || control.source !== "consumer-owned-unchanged-api") throw new Error("consumer API control failed");
await fetch(`${base}/reset`, { method: "POST" });
const receipt = await runWebMcpProof({
  browserPath,
  url: `${base}/__mulder/`,
  requiredToolNames: ["get_weather"],
  expectedToolNames: ["get_weather"],
  calls: [{ toolName: "get_weather", input: { city: "Lisbon", units: "celsius" } }],
  inspectExpression: "document.querySelector('#mulder-result')?.textContent",
});
const manifest = await fetch(`${base}/__mulder/manifest`).then((response) => response.json());
const ledger = await fetch(`${base}/ledger`).then((response) => response.json());
if (JSON.stringify(manifest.tools.map((tool) => tool.name)) !== JSON.stringify(["get_weather"])) throw new Error("consumer manifest contains the wrong tools");
const descriptor = receipt.tools[0];
if (descriptor?.name !== "get_weather" || descriptor?.annotations?.readOnly !== true || descriptor?.inputSchema?.additionalProperties !== false || !descriptor?.inputSchema?.required?.includes("city") || !descriptor?.inputSchema?.properties?.units?.enum?.includes("celsius")) throw new Error("native descriptor mismatch");
const call = receipt.calls[0];
if (call?.responded?.status !== "Completed" || call?.output?.body?.marker !== marker || call?.output?.body?.source !== "consumer-owned-unchanged-api") throw new Error("native consumer call failed");
if (!String(receipt.inspected).includes(marker)) throw new Error("consumer page did not show native result");
const expected = [{ method: "GET", pathname: "/api/weather/Lisbon", search: "?units=celsius" }];
if (ledger.marker !== marker || JSON.stringify(ledger.entries) !== JSON.stringify(expected)) throw new Error("native call did not produce exactly one expected API arrival");
writeFileSync(outputPath, JSON.stringify({ schema: "mulder.clean-consumer.v1", marker, control, manifest, receipt, ledger }, null, 2) + "\n");
if (readFileSync(outputPath, "utf8").includes(process.env.PRODUCER_ROOT ?? "\0")) throw new Error("receipt contains producer path");
console.log("MULDER_CLEAN_CONSUMER_NATIVE_OK");
