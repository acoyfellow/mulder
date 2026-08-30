import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/10-edge-denial/RESULT.json", "utf8"));
if (result.directAdapter.status !== 401 || result.directAdapter.originLedger.authorizedCount !== 0) throw new Error("direct adapter control failed");
if (result.denied.status !== "Completed" || result.denied.output?.status !== 403) throw new Error("native denial missing");
if (result.denied.output?.body?.rule !== "deny-forbidden-city" || result.denied.output?.body?.subrequestCreated !== false) throw new Error("edge decision missing");
if (result.denied.originLedger.authorizedCount !== 0 || result.denied.originLedger.unauthorizedCount !== 0) throw new Error("denied call reached origin");
if (result.allowed.status !== "Completed" || result.allowed.output?.status !== 200 || result.allowed.originLedger.authorizedCount !== 1) throw new Error("allowed control failed");
const bytes = readFileSync("experiments/10-edge-denial/denied.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.denied.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_EDGE_DENIAL_OK");
