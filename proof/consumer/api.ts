import { marker } from "./marker";

const ledger: Array<{ method: string; pathname: string; search: string }> = [];

function html(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function consumerPage(): string {
  const last = ledger.at(-1);
  const complete = Boolean(last);
  const result = last ? html(JSON.stringify({ status: "200 OK", request: `${last.method} ${last.pathname}${last.search}`, source: "consumer-owned API" }, null, 2)) : "Waiting for the native call…";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mulder · OpenAPI to WebMCP</title><style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:#f8f8f5;color:#111210;font-family:Inter,system-ui,sans-serif}main{width:min(1120px,calc(100% - 64px));margin:auto;padding:30px 0}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.brand{font-size:25px;font-weight:750;letter-spacing:-.05em}.brand:after{content:'';display:inline-block;width:10px;height:10px;border-radius:50%;background:#c9511f;margin-left:6px}.live{color:#667080;font-size:12px}.dot{display:none}.eyebrow{color:#667080;text-transform:uppercase;letter-spacing:.13em;font-size:11px;font-weight:700}h1{font:750 clamp(42px,5.5vw,66px)/.94 system-ui,sans-serif;letter-spacing:-.065em;max-width:900px;margin:12px 0 16px}h1 span{color:#111210}.intro{color:#343934;font:17px/1.45 system-ui,sans-serif;max-width:780px;margin:0 0 24px}.flow{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #d9dbd6;border-left:1px solid #d9dbd6}.step{position:relative;border-right:1px solid #d9dbd6;border-bottom:1px solid #d9dbd6;padding:19px;min-height:118px}.step.done{background:#fff}.number{color:#c9511f;font-size:11px;font-weight:700}.state{position:absolute;right:17px;top:17px;color:#667080;font-size:10px}.step.done .state{color:#c9511f}.step h2{font:700 18px system-ui,sans-serif;margin:20px 0 6px}.step p{color:#667080;font-size:12px;line-height:1.4;margin:0}.result{margin-top:14px;border:2px solid ${complete ? "#111210" : "#d9dbd6"};background:#fff;padding:18px;display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:center;min-height:94px}.result-label{color:#667080;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.result-label strong{display:block;color:#111210;font:700 19px system-ui,sans-serif;letter-spacing:0;text-transform:none;margin-top:6px}pre{margin:0;color:#343934;font:12px/1.45 ui-monospace,monospace;white-space:pre-wrap}.foot{display:flex;justify-content:space-between;color:#848b84;font-size:10px;margin-top:10px}@media(max-width:760px){main{width:min(100% - 32px,1080px);padding:22px 0}.flow{grid-template-columns:1fr}.result{grid-template-columns:1fr}.top{margin-bottom:24px}}
</style></head><body><main><div class="top"><div class="brand">Mulder</div><div class="live"><span class="dot"></span>local proof · artifact install</div></div><div class="eyebrow">OpenAPI → native browser tool</div><h1>Your API already has an <span>agent interface.</span></h1><p class="intro">Mulder turns one approved read-only OpenAPI operation into a native WebMCP tool. The API stays unchanged.</p><section class="flow"><article class="step done"><span class="number">01</span><span class="state">✓ READY</span><h2>Package installed</h2><p>Clean consumer. No Mulder source access.</p></article><article class="step done"><span class="number">02</span><span class="state">✓ FOUND</span><h2>get_weather</h2><p>Generated from the consumer’s OpenAPI document.</p></article><article class="step ${complete ? "done" : ""}"><span class="number">03</span><span class="state">${complete ? "✓ COMPLETE" : "● WAITING"}</span><h2>Native Chrome call</h2><p>${complete ? "Reached the unchanged API exactly once." : "Waiting for the browser agent…"}</p></article></section><section class="result"><div class="result-label">Live result<strong>${complete ? "Call completed" : "Ready to run"}</strong></div><pre id="mulder-result">${result}</pre></section><div class="foot"><span>read-only GET</span><span>${html(marker)}</span></div></main></body></html>`;
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
