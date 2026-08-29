import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const receipt = JSON.parse(readFileSync("proof/native.json", "utf8"));
const names = receipt.tools.map((tool) => tool.name);
if (JSON.stringify(names) !== JSON.stringify(["get_weather"])) throw new Error("native tool surface mismatch");
if (receipt.tools[0]?.annotations?.readOnly !== true) throw new Error("GET tool is not read-only");
if (receipt.calls.length !== 1) throw new Error("native call missing");
const call = receipt.calls[0];
if (call.invoked?.toolName !== "get_weather" || call.responded?.status !== "Completed") throw new Error("native event chain incomplete");
if (call.output?.status !== 200 || call.output?.body?.source !== "unchanged-fixture-api") throw new Error("original API response missing");
if (!String(receipt.inspected).includes("get_weather") || !String(receipt.inspected).includes("unchanged-fixture-api")) throw new Error("visible result missing");
const screenshot = readFileSync("proof/native.png");
const digest = createHash("sha256").update(screenshot).digest("hex");
if (receipt.screenshot?.path !== "proof/native.png" || receipt.screenshot?.sha256 !== digest) throw new Error("screenshot mismatch");
console.log("MULDER_NATIVE_OK");
