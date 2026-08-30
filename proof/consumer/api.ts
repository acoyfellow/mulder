import { marker } from "./marker";

const ledger: Array<{ method: string; pathname: string; search: string }> = [];

function html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function consumerPage(): string {
  const last = ledger.at(-1);
  const result = html(last ? JSON.stringify({ nativeCallArrived: true, marker, request: last }, null, 2) : "waiting for a native WebMCP call");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Mulder clean consumer</title><style>body{background:#07100b;color:#d9ffe5;font:16px/1.5 ui-monospace,monospace;max-width:800px;margin:0 auto;padding:64px 24px}.stamp{display:inline-block;border:2px solid #64ff91;padding:6px 10px;letter-spacing:.12em}h1{font-size:48px}pre{border:1px solid #285c38;background:#0a1910;padding:24px;white-space:pre-wrap}</style></head><body><span class="stamp">INDEPENDENT CONSUMER</span><h1>Mulder found the API.</h1><p>This Worker installed Mulder from a package artifact. Its API does not import Mulder.</p><pre id="mulder-result">${result}</pre></body></html>`;
}

export async function applicationFetch(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/ledger") return Response.json({ marker, entries: ledger });
  if (url.pathname === "/reset" && request.method === "POST") {
    ledger.length = 0;
    return Response.json({ reset: true });
  }
  const match = url.pathname.match(/^\/api\/weather\/([^/]+)$/);
  if (!match || request.method !== "GET") return new Response("not found", { status: 404 });
  ledger.push({ method: request.method, pathname: url.pathname, search: url.search });
  return Response.json({ city: decodeURIComponent(match[1]), units: url.searchParams.get("units"), marker, source: "consumer-owned-unchanged-api" });
}
