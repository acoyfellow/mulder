import { createHash } from "node:crypto";

const secret = process.env.ORIGIN_SECRET;
if (!secret || secret.length < 32) throw new Error("ORIGIN_SECRET is required");
const fingerprint = createHash("sha256").update(secret).digest("hex");
let authorizedCount = 0;
let unauthorizedCount = 0;
let logicalEffectCount = 0;
const idempotentWrites = new Map();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.ORIGIN_PORT ?? "8892"),
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ledger") return Response.json({ authorizedCount, unauthorizedCount, logicalEffectCount, idempotencyKeys: idempotentWrites.size, credentialFingerprint: fingerprint });
    if (url.pathname === "/reset" && request.method === "POST") {
      authorizedCount = 0;
      unauthorizedCount = 0;
      logicalEffectCount = 0;
      idempotentWrites.clear();
      return Response.json({ ok: true });
    }
    const match = url.pathname.match(/^\/weather\/([^/]+)$/);
    const write = url.pathname === "/write" && request.method === "POST";
    if (!match && !write) return Response.json({ error: "not_found" }, { status: 404 });
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      unauthorizedCount += 1;
      return Response.json({ error: "origin_unauthorized" }, { status: 401 });
    }
    authorizedCount += 1;
    if (write) {
      const idempotencyKey = request.headers.get("idempotency-key");
      if (!idempotencyKey) return Response.json({ error: "idempotency_key_required" }, { status: 400 });
      const prior = idempotentWrites.get(idempotencyKey);
      if (prior) return Response.json({ ...prior, replayed: true });
      logicalEffectCount += 1;
      const result = { written: await request.json(), source: "protected-idempotent-origin", requestNumber: authorizedCount, logicalEffectNumber: logicalEffectCount };
      idempotentWrites.set(idempotencyKey, result);
      return Response.json(result);
    }
    return Response.json({ city: decodeURIComponent(match[1]), temperature: 23, source: "protected-unchanged-origin", requestNumber: authorizedCount });
  },
});

console.log(`MULDER_ORIGIN_READY:${server.port}:${fingerprint}`);
