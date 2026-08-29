import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/02-api-without-document/RESULT.json", "utf8"));
if (!result.jsonDocument.nativeToolsAbsent || result.jsonDocument.tools.length !== 0) throw new Error("JSON API unexpectedly published native tools");
if (JSON.stringify(result.companion.tools) !== JSON.stringify(["get_weather"])) throw new Error("companion discovery failed");
if (result.companion.call?.responded?.status !== "Completed") throw new Error("companion native response missing");
if (result.companion.call?.output?.body?.source !== "unchanged-fixture-api") throw new Error("companion missed unchanged API");
const bytes = readFileSync("experiments/02-api-without-document/companion.png");
const digest = createHash("sha256").update(bytes).digest("hex");
if (result.companion.screenshot?.sha256 !== digest) throw new Error("screenshot mismatch");
console.log("MULDER_COMPANION_OK");
