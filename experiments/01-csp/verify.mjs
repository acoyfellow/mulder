import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/01-csp/RESULT.json", "utf8"));
if (result.policy !== "default-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'") throw new Error("policy changed");
if (!result.inline.failedClosed || result.inline.discovered.length !== 0) throw new Error("inline baseline did not fail");
if (JSON.stringify(result.external.tools) !== JSON.stringify(["get_weather"])) throw new Error("external native discovery failed");
if (result.external.call?.responded?.status !== "Completed") throw new Error("native response missing");
if (result.external.call?.output?.body?.source !== "unchanged-fixture-api") throw new Error("unchanged API response missing");
if (result.nonce?.tool?.name !== "get_weather" || result.nonce?.status !== "Completed" || result.nonce?.output?.body?.source !== "unchanged-fixture-api") throw new Error("nonce bootstrap failed");
if (!result.nonce?.policy.includes("script-src 'nonce-mulder-fixture'")) throw new Error("nonce policy missing");
if (!result.hashOnly?.failedClosed || result.hashOnly?.tools?.length !== 0 || !result.hashOnly?.policy.includes("script-src 'sha256-")) throw new Error("hash-only policy result changed");
if (result.verdict !== "nonce-preserved-and-passed-hash-only-preserved-and-blocked") throw new Error("CSP verdict mismatch");
const bytes = readFileSync("experiments/01-csp/external.png");
const digest = createHash("sha256").update(bytes).digest("hex");
if (result.external.screenshot?.sha256 !== digest) throw new Error("screenshot mismatch");
console.log("MULDER_CSP_OK");
