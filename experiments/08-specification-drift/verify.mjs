import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/08-specification-drift/RESULT.json", "utf8"));
const names = result.tools.map((tool) => tool.name).sort();
if (JSON.stringify(names) !== JSON.stringify(["weather_contract_v1", "weather_contract_v2"])) throw new Error("native additions incomplete");
if (result.calls[0]?.responded?.status !== "Completed" || result.calls[0]?.output?.version !== 1) throw new Error("version one call failed");
if (result.calls[1]?.responded?.status !== "Completed" || result.calls[1]?.output?.version !== 2) throw new Error("version two call failed");
if (!result.after?.removed?.includes("weather_contract_v1") || result.after?.denied !== true || !result.after?.error?.includes("Tool not found")) throw new Error("retirement failed");
const bytes = readFileSync("experiments/08-specification-drift/native.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_SPECIFICATION_DRIFT_OK");
