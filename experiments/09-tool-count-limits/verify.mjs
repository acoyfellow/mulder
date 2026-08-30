import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/09-tool-count-limits/RESULT.json", "utf8"));
const counts = [10, 100, 500, 1000, 2000];
if (JSON.stringify(result.runs.map((run) => run.count)) !== JSON.stringify(counts)) throw new Error("count ladder incomplete");
for (const run of result.runs) {
  if (!run.passed || run.discovered !== run.count) throw new Error(`${run.count} discovery failed`);
  if (run.first?.index !== 0 || run.first?.value !== 1 || run.last?.index !== run.count - 1 || run.last?.value !== 2) throw new Error(`${run.count} boundary invocation failed`);
}
if (result.largestTestedPass !== 2000 || result.firstFailure !== null || result.verdict !== "tested-ceiling-passed") throw new Error("tested ceiling verdict mismatch");
const bytes = readFileSync("experiments/09-tool-count-limits/native.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_TOOL_COUNT_OK");
