import { readFileSync, writeFileSync } from "node:fs";

const resultPath = process.env.RESULT_PATH;
const approvalSecret = process.env.HUMAN_APPROVAL_SECRET;
const workerUrl = process.env.WORKER_URL ?? "http://127.0.0.1:8891";
const originUrl = process.env.ORIGIN_URL ?? "http://127.0.0.1:8892";
if (!resultPath || !approvalSecret) throw new Error("RESULT_PATH and HUMAN_APPROVAL_SECRET are required");
const result = JSON.parse(readFileSync(resultPath, "utf8"));
const response = await fetch(`${workerUrl}/__mulder/approve`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-human-approval": approvalSecret },
  body: JSON.stringify({ intentId: result.intentId, digest: result.digest, decisionId: "decision-1" }),
});
result.restartReplay = { status: response.status, body: await response.json(), ledger: await fetch(`${originUrl}/ledger`).then((ledger) => ledger.json()) };
writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n");
if (result.restartReplay.status !== 200 || result.restartReplay.body.execution?.replay !== "stored" || result.restartReplay.ledger.logicalEffectCount !== 1 || result.restartReplay.ledger.authorizedCount !== result.replay.ledger.authorizedCount) throw new Error("restart replay failed");
console.log("MULDER_DURABLE_RESTART_OK");
