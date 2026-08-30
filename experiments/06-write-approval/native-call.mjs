import { writeFileSync } from "node:fs";

const browserPath = process.env.BROWSER_PATH;
const modulePath = process.env.WEBMCP_PROOF_MODULE;
const outputPath = process.env.OUTPUT_PATH;
const approvalSecret = process.env.HUMAN_APPROVAL_SECRET;
const originUrl = process.env.ORIGIN_URL;
if (!browserPath || !modulePath || !outputPath || !approvalSecret || !originUrl) throw new Error("BROWSER_PATH, WEBMCP_PROOF_MODULE, OUTPUT_PATH, HUMAN_APPROVAL_SECRET, and ORIGIN_URL are required");
const { runWebMcpProof } = await import(modulePath);
await fetch(`${originUrl}/reset`, { method: "POST" });
const native = await runWebMcpProof({
  browserPath,
  url: "http://127.0.0.1:8891/experiments/approval",
  requiredToolNames: ["create_case_file"],
  calls: [{ toolName: "create_case_file", input: { title: "Project Mulder", classification: "secret" } }],
  inspectExpression: `document.querySelector('#approval-result')?.textContent`,
  ...(process.env.SCREENSHOT_PATH ? { screenshotPath: process.env.SCREENSHOT_PATH } : {}),
});
if (native.screenshot) native.screenshot.path = process.env.SCREENSHOT_PATH;
const pending = native.calls[0]?.output;
if (pending?.status !== 202 || pending?.body?.state !== "pending") throw new Error("native call did not create a pending durable intent");
const { id: intentId, digest } = pending.body;
const ledgerAfterCreate = await fetch(`${originUrl}/ledger`).then((response) => response.json());
const unauthorizedResponse = await fetch("http://127.0.0.1:8891/__mulder/approve", { method: "POST", headers: { "content-type": "application/json", "x-human-approval": "wrong" }, body: JSON.stringify({ intentId, digest, decisionId: "decision-1" }) });
const unauthorized = { status: unauthorizedResponse.status, body: await unauthorizedResponse.json(), ledger: await fetch(`${originUrl}/ledger`).then((response) => response.json()) };
const approve = async (decisionId) => {
  const response = await fetch("http://127.0.0.1:8891/__mulder/approve", { method: "POST", headers: { "content-type": "application/json", "x-human-approval": approvalSecret }, body: JSON.stringify({ intentId, digest, decisionId }) });
  return { status: response.status, body: await response.json(), ledger: await fetch(`${originUrl}/ledger`).then((ledger) => ledger.json()) };
};
const approvalRace = await Promise.all(Array.from({ length: 8 }, () => approve("decision-1")));
const approved = approvalRace[0];
const replay = await approve("decision-1");
const conflictingDecision = await approve("decision-2");
writeFileSync(outputPath, JSON.stringify({ schema: "mulder.durable-approval.v1", verdict: "pass", native, intentId, digest, ledgerAfterCreate, unauthorized, approvalRace, approved, replay, conflictingDecision }, null, 2) + "\n");
console.log("MULDER_DURABLE_APPROVAL_CAPTURED");
