import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWebMcpProof } from "./native-harness.mjs";

const browserPath = process.env.BROWSER_PATH;
if (!browserPath) throw new Error("BROWSER_PATH is required");
const directory = mkdtempSync(join(tmpdir(), "mulder-native-"));
try {
  const receipt = await runWebMcpProof({
    browserPath,
    url: "http://127.0.0.1:8891/__mulder/",
    requiredToolNames: ["get_weather"],
    expectedToolNames: ["get_weather"],
    calls: [{ toolName: "get_weather", input: { city: "Lisbon", units: "celsius" } }],
    screenshotPath: join(directory, "native.png"),
  });
  if (receipt.tools[0]?.name !== "get_weather") throw new Error("native tool discovery failed");
  if (receipt.calls[0]?.responded?.status !== "Completed") throw new Error("native invocation did not complete");
  if (receipt.calls[0]?.output?.status !== 200 || receipt.calls[0]?.output?.body?.source !== "unchanged-fixture-api") throw new Error("native invocation did not reach the fixture API");
  if (!receipt.screenshot?.sha256) throw new Error("native screenshot missing");
  console.log(`MULDER_PRODUCT_NATIVE_OK:${receipt.browser}`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
