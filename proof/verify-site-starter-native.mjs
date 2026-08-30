import { writeFile } from "node:fs/promises";
import { runWebMcpProof } from "./native-harness.mjs";

const base = process.env.CONSUMER_URL;
const browserPath = process.env.BROWSER_PATH;
const outputPath = process.env.OUTPUT_PATH;
if (!base || !browserPath || !outputPath) throw new Error("CONSUMER_URL, BROWSER_PATH, and OUTPUT_PATH are required");

await fetch(`${base}/proof/reset`, { method: "POST" });
const receipt = await runWebMcpProof({
  browserPath,
  url: `${base}/__mulder/`,
  requiredToolNames: ["get_service_health"],
  expectedToolNames: ["get_service_health"],
  calls: [{ toolName: "get_service_health", input: { service: "checkout-api", region: "us-east" } }],
  inspectExpression: "document.querySelector('#mulder-result')?.textContent",
});
const response = receipt.calls[0]?.output;
if (receipt.calls[0]?.responded?.status !== "Completed") throw new Error("native call did not complete");
if (response?.status !== 200 || response?.body?.source !== "existing-api" || response?.body?.service !== "checkout-api" || response?.body?.region !== "us-east") throw new Error(`wrong native response: ${JSON.stringify(response)}`);
const ledger = await fetch(`${base}/proof/requests`).then((value) => value.json());
const expected = [{ method: "GET", pathname: "/api/services/checkout-api", search: "?region=us-east" }];
if (JSON.stringify(ledger.requests) !== JSON.stringify(expected)) throw new Error(`wrong API arrivals: ${JSON.stringify(ledger.requests)}`);
await writeFile(outputPath, JSON.stringify({ receipt, ledger }, null, 2));
console.log("MULDER_SITE_TUTORIAL_NATIVE_OK");
