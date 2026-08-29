import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/07-principal-identity/RESULT.json", "utf8"));
if (result.native.status !== "Completed" || !result.native.frameId || !result.native.invocationId) throw new Error("native identity evidence missing");
if (result.edge.browserPrincipal?.verified !== true || result.edge.browserPrincipal?.source !== "server-issued-http-only-session") throw new Error("browser principal missing");
if (result.edge.humanPrincipal !== null || result.edge.agentPrincipal !== null) throw new Error("unearned principal claimed");
if (result.edge.claimedAgentInput !== "spoofed-agent" || result.edge.claimedAgentAccepted !== false) throw new Error("spoof control failed");
if (result.edge.browserProvidedAgentAssertionHeaders.length !== 0) throw new Error("unexpected browser agent assertion");
if (result.visible?.cookie !== "") throw new Error("HttpOnly browser session became visible");
if (result.verdict !== "falsified-native-webmcp-has-no-edge-verifiable-agent-principal") throw new Error("verdict mismatch");
const bytes = readFileSync("experiments/07-principal-identity/native.png");
if (createHash("sha256").update(bytes).digest("hex") !== result.screenshot?.sha256) throw new Error("screenshot mismatch");
console.log("MULDER_PRINCIPAL_IDENTITY_FALSIFIED");
