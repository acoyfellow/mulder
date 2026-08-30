import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/06-write-approval/RESULT.json", "utf8"));
const pending = result.native?.calls?.[0]?.output;
if (pending?.status !== 202 || pending?.body?.state !== "pending") throw new Error("native call did not create pending intent");
if (!/^[a-f0-9]{64}$/.test(result.intentId) || !/^[a-f0-9]{64}$/.test(result.digest)) throw new Error("durable intent identity missing");
if (result.ledgerAfterCreate.logicalEffectCount !== 0 || result.ledgerAfterCreate.authorizedCount !== 0) throw new Error("write executed before approval");
if (result.unauthorized.status !== 401 || result.unauthorized.ledger.logicalEffectCount !== 0) throw new Error("unauthorized approval executed");
if (result.approvalRace?.length !== 8 || result.approvalRace.some((attempt) => attempt.status !== 200 || attempt.body?.approval?.digest !== result.digest || attempt.body?.execution?.status !== 200)) throw new Error("concurrent approval execution failed");
if (result.replay.ledger.logicalEffectCount !== 1 || result.replay.ledger.idempotencyKeys !== 1 || result.replay.ledger.authorizedCount < 1) throw new Error("origin logical effect mismatch");
if (result.replay.status !== 200 || result.replay.body?.execution?.replay !== "stored") throw new Error("idempotent approval replay failed");
if (result.conflictingDecision.status !== 409 || result.conflictingDecision.ledger.logicalEffectCount !== 1) throw new Error("conflicting decision was accepted");
if (result.restartReplay.status !== 200 || result.restartReplay.body?.execution?.replay !== "stored" || result.restartReplay.ledger.logicalEffectCount !== 1 || result.restartReplay.ledger.authorizedCount !== result.replay.ledger.authorizedCount) throw new Error("durable restart replay failed");
const bytes = readFileSync("experiments/06-write-approval/native.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.native.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_DURABLE_WRITE_APPROVAL_OK");
