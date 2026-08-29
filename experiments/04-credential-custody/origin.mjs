import { createHash } from "node:crypto";

const secret = process.env.ORIGIN_SECRET;
if (!secret || secret.length < 32) throw new Error("ORIGIN_SECRET is required");
const fingerprint = createHash("sha256").update(secret).digest("hex");
let authorizedCount = 0;
let unauthorizedCount = 0;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.ORIGIN_PORT ?? "8892"),
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ledger") return Response.json({ authorizedCount, unauthorizedCount, credentialFingerprint: fingerprint });
    if (url.pathname === "/reset" && request.method === "POST") {
      authorizedCount = 0;
      unauthorizedCount = 0;
      return Response.json({ ok: true });
    }
    const match = url.pathname.match(/^\/weather\/([^/]+)$/);
    if (!match) return Response.json({ error: "not_found" }, { status: 404 });
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      unauthorizedCount += 1;
      return Response.json({ error: "origin_unauthorized" }, { status: 401 });
    }
    authorizedCount += 1;
    return Response.json({ city: decodeURIComponent(match[1]), temperature: 23, source: "protected-unchanged-origin", requestNumber: authorizedCount });
  },
});

console.log(`MULDER_ORIGIN_READY:${server.port}:${fingerprint}`);
