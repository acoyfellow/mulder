import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/05-request-fidelity/RESULT.json", "utf8"));
if (result.cases.length !== 7) throw new Error("request corpus incomplete");
const expected = { "path-encoding": "match", "scalar-query": "match", "array-query-explode": "mismatch", "header-parameter": "unsupported", "json-body": "match", "multipart-body": "mismatch", "http-error-status": "match" };
for (const item of result.cases) {
  if (expected[item.name] !== item.outcome) throw new Error(`${item.name} result changed`);
  if (item.outcome !== "unsupported" && item.reachedOrigin !== true) throw new Error(`${item.name} lacks origin evidence`);
}
if (result.counts.match !== 4 || result.counts.mismatch !== 2 || result.counts.unsupported !== 1 || result.verdict !== "partial") throw new Error("request fidelity totals changed");
console.log("MULDER_REQUEST_FIDELITY_OK");
