import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/06-write-approval/RESULT.json", "utf8"));
if (!/^[a-f0-9]{64}$/.test(result.digest)) throw new Error("intent digest missing");
if (result.pending.originLedger.authorizedCount !== 0) throw new Error("write executed while pending");
if (result.unauthorizedApproval.status !== 401 || result.unauthorizedApproval.originLedger.authorizedCount !== 0) throw new Error("unauthorized approval executed");
if (result.approval.digest !== result.digest || result.approval.state !== "approved") throw new Error("approval not bound to intent");
if (result.approved.status !== "Completed" || result.approved.output?.status !== 200 || result.approved.originLedger.authorizedCount !== 1 || result.approved.intentState !== "consumed") throw new Error("approved write failed");
if (result.replay.status !== "Completed" || result.replay.output?.status !== 409 || result.replay.output?.body?.error !== "intent_replay" || result.replay.output?.body?.digest !== result.digest) throw new Error("replay not denied");
if (result.replay.originLedger.authorizedCount !== 1) throw new Error("replay reached origin");
const bytes = readFileSync("experiments/06-write-approval/native.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.approved.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_WRITE_APPROVAL_OK");
