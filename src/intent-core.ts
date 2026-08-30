export type IntentState = "pending" | "approved" | "dispatching" | "succeeded" | "failed" | "denied" | "expired";

export type IntentEnvelope = {
  version: 1;
  tenant: string;
  operation: string;
  operationVersion: string;
  method: "POST";
  targetPath: string;
  contentType: "application/json";
  bodyText: string;
  policyVersion: string;
  credentialProfile: string;
  browserSessionHash: string;
  expiresAt: number;
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => `${JSON.stringify(key)}:${canonicalize(child)}`).join(",")}}`;
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export async function intentDigest(envelope: IntentEnvelope): Promise<string> {
  return sha256(canonicalize(envelope));
}
