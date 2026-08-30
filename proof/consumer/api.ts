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
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 78% 18%,#143522 0,transparent 34%),#06100a;color:#e8fff0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}main{width:min(1080px,calc(100% - 64px));margin:auto;padding:26px 0}.top{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.brand{font-size:14px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}.live{display:flex;gap:9px;align-items:center;color:#8cb69a;font-size:12px}.dot{width:9px;height:9px;border-radius:50%;background:#66ff91;box-shadow:0 0 18px #66ff91}.eyebrow{color:#66ff91;text-transform:uppercase;letter-spacing:.15em;font-size:12px}h1{font:700 clamp(40px,5vw,58px)/.98 system-ui,sans-serif;letter-spacing:-.055em;max-width:830px;margin:10px 0 13px}h1 span{color:#66ff91}.intro{color:#a9c8b3;font:15px/1.45 system-ui,sans-serif;max-width:680px;margin:0 0 18px}.flow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.step{position:relative;border:1px solid #28583a;background:#0b1c11cc;border-radius:14px;padding:16px;min-height:108px}.step.done{border-color:#4fcf72;background:#0d2515}.number{color:#688d73;font-size:11px}.state{position:absolute;right:15px;top:15px;color:#66ff91;font-size:11px}.step h2{font:650 17px system-ui,sans-serif;margin:17px 0 5px}.step p{color:#91ae99;font-size:12px;line-height:1.4;margin:0}.result{margin-top:11px;border:1px solid ${complete ? "#66ff91" : "#28583a"};border-radius:14px;background:#07150c;padding:16px;display:grid;grid-template-columns:170px 1fr;gap:20px;align-items:center;min-height:90px}.result-label{color:${complete ? "#66ff91" : "#789582"};font-size:11px;letter-spacing:.12em;text-transform:uppercase}.result-label strong{display:block;color:#e8fff0;font:650 18px system-ui,sans-serif;letter-spacing:0;text-transform:none;margin-top:5px}pre{margin:0;color:${complete ? "#d9ffe5" : "#6e8f78"};font:12px/1.4 ui-monospace,monospace;white-space:pre-wrap}.foot{display:flex;justify-content:space-between;color:#587361;font-size:10px;margin-top:10px}@media(max-width:760px){main{width:min(100% - 32px,1080px);padding:22px 0}.flow{grid-template-columns:1fr}.result{grid-template-columns:1fr}.top{margin-bottom:24px}}
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
