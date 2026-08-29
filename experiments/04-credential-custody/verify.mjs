import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/04-credential-custody/RESULT.json", "utf8"));
if (result.native.tool !== "get_secret_weather" || result.native.status !== "Completed") throw new Error("native call missing");
if (result.native.output?.status !== 200 || result.native.output?.body?.source !== "protected-unchanged-origin") throw new Error("protected origin response missing");
if (result.native.visible?.cookie !== "") throw new Error("HttpOnly cookie became page-visible");
if (Object.keys(result.native.visible?.localStorage ?? {}).length || Object.keys(result.native.visible?.sessionStorage ?? {}).length) throw new Error("page storage is not empty");
if (result.negativeControls.directOriginStatus !== 401 || result.negativeControls.unauthorizedAdapterStatus !== 401) throw new Error("negative control failed");
if (result.negativeControls.afterUnauthorizedAdapter.authorizedCount !== 0) throw new Error("unauthorized adapter reached origin");
if (result.origin.authorizedCount !== 1) throw new Error("authorized origin count mismatch");
if (result.secretScan.some((item) => item.exactMatches !== 0)) throw new Error("credential escaped");
const bytes = readFileSync("experiments/04-credential-custody/native.png");
const digest = createHash("sha256").update(bytes).digest("hex");
if (result.native.screenshot?.sha256 !== digest) throw new Error("screenshot mismatch");
console.log("MULDER_CREDENTIAL_CUSTODY_OK");
