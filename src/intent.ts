import { DurableObject } from "cloudflare:workers";
import { intentDigest, type IntentEnvelope, type IntentState } from "./intent-core";

export { intentDigest, sha256, type IntentEnvelope, type IntentState } from "./intent-core";

type Decision = {
  id: string;
  humanSubject: string;
  authenticationMethod: string;
  decidedAt: number;
};

type TerminalResult = {
  status: number;
  bodyText: string;
  contentType: string;
};

export type IntentRecord = {
  id: string;
  digest: string;
  state: IntentState;
  envelope: IntentEnvelope;
  decision?: Decision;
  result?: TerminalResult;
  createdAt: number;
  updatedAt: number;
};

type IntentEnv = {
  ORIGIN_SECRET?: string;
  ORIGIN_URL?: string;
};

function jsonError(error: string, status: number): Response {
  return Response.json({ error }, { status });
}

export class IntentDurableObject extends DurableObject<IntentEnv> {
  private async record(): Promise<IntentRecord | undefined> {
    return this.ctx.storage.get<IntentRecord>("intent");
  }

  private async authorizeBrowser(request: Request, record: IntentRecord): Promise<Response | undefined> {
    const supplied = request.headers.get("x-browser-session-hash");
    if (!supplied || supplied !== record.envelope.browserSessionHash) return jsonError("intent_not_found", 404);
  }

  private async create(request: Request): Promise<Response> {
    if (await this.record()) return jsonError("intent_exists", 409);
    const body = await request.json() as { id?: string; envelope?: IntentEnvelope };
    if (!body.id || !body.envelope) return jsonError("bad_intent", 400);
    const now = Date.now();
    if (body.envelope.expiresAt <= now) return jsonError("intent_expired", 409);
    const record: IntentRecord = { id: body.id, digest: await intentDigest(body.envelope), state: "pending", envelope: body.envelope, createdAt: now, updatedAt: now };
    await this.ctx.storage.put("intent", record);
    return Response.json({ id: record.id, digest: record.digest, state: record.state, expiresAt: record.envelope.expiresAt }, { status: 202 });
  }

  private async status(request: Request): Promise<Response> {
    const record = await this.record();
    if (!record) return jsonError("intent_not_found", 404);
    const denied = await this.authorizeBrowser(request, record);
    if (denied) return denied;
    return Response.json({ id: record.id, digest: record.digest, state: record.state, result: record.result ?? null, decision: record.decision ? { decidedAt: record.decision.decidedAt, authenticationMethod: record.decision.authenticationMethod } : null });
  }

  private async approve(request: Request): Promise<Response> {
    const body = await request.json() as { digest?: string; decisionId?: string; humanSubject?: string; authenticationMethod?: string };
    const outcome = await this.ctx.storage.transaction(async (transaction) => {
      const record = await transaction.get<IntentRecord>("intent");
      if (!record) return { error: "intent_not_found", status: 404 } as const;
      if (record.decision?.id === body.decisionId && record.digest === body.digest) return { record } as const;
      if (record.state !== "pending") return { error: "intent_not_pending", status: 409 } as const;
      if (Date.now() >= record.envelope.expiresAt) {
        const expired = { ...record, state: "expired" as const, updatedAt: Date.now() };
        await transaction.put("intent", expired);
        return { error: "intent_expired", status: 409 } as const;
      }
      if (!body.digest || body.digest !== record.digest) return { error: "intent_digest_mismatch", status: 409 } as const;
      if (!body.decisionId || !body.humanSubject || !body.authenticationMethod) return { error: "decision_identity_required", status: 400 } as const;
      const approved: IntentRecord = { ...record, state: "approved", decision: { id: body.decisionId, humanSubject: body.humanSubject, authenticationMethod: body.authenticationMethod, decidedAt: Date.now() }, updatedAt: Date.now() };
      await transaction.put("intent", approved);
      return { record: approved } as const;
    });
    if ("error" in outcome && outcome.error) return jsonError(outcome.error, outcome.status ?? 500);
    return Response.json({ id: outcome.record.id, digest: outcome.record.digest, state: outcome.record.state });
  }

  private async execute(): Promise<Response> {
    const record = await this.record();
    if (!record) return jsonError("intent_not_found", 404);
    if ((record.state === "succeeded" || record.state === "failed") && record.result) return new Response(record.result.bodyText, { status: record.result.status, headers: { "content-type": record.result.contentType, "x-mulder-intent": record.id, "x-mulder-replay": "stored" } });
    if (record.state !== "approved" && record.state !== "dispatching") return jsonError(`intent_${record.state}`, 409);
    if (!this.env.ORIGIN_SECRET || !this.env.ORIGIN_URL) return jsonError("origin_binding_missing", 503);
    if (record.state === "approved") await this.ctx.storage.put("intent", { ...record, state: "dispatching", updatedAt: Date.now() });
    let response: Response;
    try {
      response = await fetch(new URL(record.envelope.targetPath, this.env.ORIGIN_URL), {
        method: record.envelope.method,
        headers: {
          authorization: `Bearer ${this.env.ORIGIN_SECRET}`,
          "content-type": record.envelope.contentType,
          "idempotency-key": `${record.envelope.tenant}:${record.id}`,
        },
        body: record.envelope.bodyText,
      });
    } catch {
      return jsonError("origin_outcome_unknown", 503);
    }
    const bodyText = await response.text();
    if (response.status >= 500) return jsonError("origin_retryable_failure", 503);
    const terminal: IntentRecord = {
      ...record,
      state: response.ok ? "succeeded" : "failed",
      result: { status: response.status, bodyText, contentType: response.headers.get("content-type") ?? "application/octet-stream" },
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put("intent", terminal);
    return new Response(bodyText, { status: response.status, headers: { "content-type": terminal.result?.contentType ?? "application/octet-stream", "x-mulder-intent": record.id } });
  }

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path === "/create" && request.method === "POST") return this.create(request);
    if (path === "/status" && request.method === "GET") return this.status(request);
    if (path === "/approve" && request.method === "POST") return this.approve(request);
    if (path === "/execute" && request.method === "POST") return this.execute();
    return jsonError("not_found", 404);
  }
}
