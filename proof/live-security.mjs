import { runWebMcpProof } from "./native-harness.mjs";

const browserPath = process.env.BROWSER_PATH;
const originSecret = process.env.ORIGIN_SECRET;
if (!browserPath || !originSecret) throw new Error("BROWSER_PATH and ORIGIN_SECRET are required");
const workerUrl = "http://127.0.0.1:8891";
const originUrl = "http://127.0.0.1:8892";

const nonceResponses = await Promise.all([fetch(`${workerUrl}/experiments/csp/nonce`), fetch(`${workerUrl}/experiments/csp/nonce`)]);
const nonceSamples = await Promise.all(nonceResponses.map(async (response) => ({ policy: response.headers.get("content-security-policy") ?? "", html: await response.text() })));
const nonces = nonceSamples.map(({ policy, html }) => {
  const policyNonce = policy.match(/script-src 'nonce-([^']+)'/)?.[1];
  const tagNonce = html.match(/<script[^>]+nonce="([^"]+)"[^>]+src="\/__mulder\/bootstrap\.js"/)?.[1];
  if (!policyNonce || policyNonce !== tagNonce) throw new Error("nonce policy and bootstrap do not match");
  return policyNonce;
});
if (nonces[0] === nonces[1]) throw new Error("CSP nonce was reused across responses");

const nonceNative = await runWebMcpProof({ browserPath, url: `${workerUrl}/experiments/csp/nonce`, requiredToolNames: ["get_weather"], calls: [{ toolName: "get_weather", input: { city: "Nairobi", units: "celsius" } }] });
if (nonceNative.calls[0]?.output?.body?.source !== "unchanged-fixture-api") throw new Error("nonce-native call failed");
let hashBlocked = false;
try {
  await runWebMcpProof({ browserPath, url: `${workerUrl}/experiments/csp/hash`, requiredToolNames: ["get_weather"], calls: [], timeoutMs: 3000 });
} catch (error) {
  hashBlocked = String(error).includes("WebMCP.toolsAdded");
}
if (!hashBlocked) throw new Error("hash-only CSP did not block bootstrap discovery");

await fetch(`${originUrl}/reset`, { method: "POST" });
const denied = await runWebMcpProof({ browserPath, url: `${workerUrl}/experiments/custody`, requiredToolNames: ["get_secret_weather"], calls: [{ toolName: "get_secret_weather", input: { city: "Forbidden" } }] });
if (denied.calls[0]?.output?.status !== 403 || denied.calls[0]?.output?.body?.subrequestCreated !== false) throw new Error("edge denial response failed");
const deniedLedger = await fetch(`${originUrl}/ledger`).then((response) => response.json());
if (deniedLedger.authorizedCount !== 0 || deniedLedger.unauthorizedCount !== 0) throw new Error("denied native call reached origin");

const allowed = await runWebMcpProof({ browserPath, url: `${workerUrl}/experiments/custody`, requiredToolNames: ["get_secret_weather"], calls: [{ toolName: "get_secret_weather", input: { city: "Lisbon" } }] });
if (allowed.calls[0]?.output?.status !== 200 || allowed.calls[0]?.output?.body?.source !== "protected-unchanged-origin") throw new Error("credential-custody control failed");
const allowedLedger = await fetch(`${originUrl}/ledger`).then((response) => response.json());
if (allowedLedger.authorizedCount !== 1 || allowedLedger.unauthorizedCount !== 0) throw new Error("credential-custody origin count failed");

const publicArtifacts = await Promise.all(["/experiments/custody", "/experiments/custody/module.js", "/__mulder/manifest"].map((path) => fetch(`${workerUrl}${path}`).then((response) => response.text())));
const evidence = JSON.stringify({ nonceNative, denied, deniedLedger, allowed, allowedLedger, publicArtifacts });
if (evidence.includes(originSecret)) throw new Error("origin credential leaked into native or public artifacts");
console.log("MULDER_LIVE_CSP_OK");
console.log("MULDER_LIVE_EDGE_DENIAL_OK");
console.log("MULDER_LIVE_CREDENTIAL_CUSTODY_OK");
