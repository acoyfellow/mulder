import { describe, expect, test } from "bun:test";
import { expiryDisposition, intentDigest, type IntentEnvelope } from "../src/intent-core";

const envelope: IntentEnvelope = {
  version: 1,
  tenant: "tenant-a",
  operation: "create_case_file",
  operationVersion: "1",
  method: "POST",
  targetPath: "/write",
  contentType: "application/json",
  bodyText: '{"title":"Mulder"}',
  policyVersion: "approval-v1",
  credentialProfile: "origin-v1",
  browserSessionHash: "session-hash",
  expiresAt: 2_000_000_000_000,
};

describe("durable write intents", () => {
  test("expired approval cannot begin or resume dispatch", () => {
    expect(expiryDisposition("approved", 100, 100)).toBe("expire");
    expect(expiryDisposition("dispatching", 100, 101)).toBe("uncertain");
    expect(expiryDisposition("approved", 101, 100)).toBe("continue");
    expect(expiryDisposition("succeeded", 100, 101)).toBe("continue");
  });

  test("the approval digest binds every authority-bearing envelope field", async () => {
    const baseline = await intentDigest(envelope);
    expect(await intentDigest({ ...envelope })).toBe(baseline);
    for (const changed of [
      { tenant: "tenant-b" },
      { operationVersion: "2" },
      { method: "POST" as const, targetPath: "/other" },
      { bodyText: '{"title":"Changed"}' },
      { policyVersion: "approval-v2" },
      { credentialProfile: "origin-v2" },
      { browserSessionHash: "other-session" },
      { expiresAt: envelope.expiresAt + 1 },
    ]) expect(await intentDigest({ ...envelope, ...changed })).not.toBe(baseline);
  });
});
