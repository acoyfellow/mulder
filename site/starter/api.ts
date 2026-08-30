export type ApiRequest = { method: string; pathname: string; search: string };

export const requests: ApiRequest[] = [];

export async function existingApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/proof/requests") return Response.json({ requests });
  if (url.pathname === "/proof/reset" && request.method === "POST") {
    requests.length = 0;
    return Response.json({ reset: true });
  }
  const match = url.pathname.match(/^\/api\/services\/([^/]+)$/);
  if (!match || request.method !== "GET") return new Response("Not found", { status: 404 });
  requests.push({ method: request.method, pathname: url.pathname, search: url.search });
  return Response.json({ service: decodeURIComponent(match[1]), region: url.searchParams.get("region"), status: "healthy", source: "existing-api" });
}
