import { marker } from "./marker";

const ledger: Array<{ method: string; pathname: string; search: string }> = [];

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
