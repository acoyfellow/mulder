export const example = {
  slug: "analytics",
  label: "Analytics",
  title: "Ask the dashboard instead of rebuilding the query",
  question: "How many people signed up this week?",
  toolName: "get_metric",
  operation: "GET /api/metrics/signups?period=this-week",
  input: { metric: "signups", period: "this-week" },
  document: {
    openapi: "3.1.0",
    paths: {
      "/api/metrics/{metric}": {
        get: {
          operationId: "get_metric",
          description: "Get one approved product metric for a named period.",
          "x-webmcp-enabled": true,
          parameters: [
            { name: "metric", in: "path", required: true, schema: { type: "string", enum: ["signups", "activations"] } },
            { name: "period", in: "query", required: true, schema: { type: "string", enum: ["today", "this-week", "this-month"] } },
          ],
        },
      },
    },
  },
  async dispatch(request) {
    const url = new URL(request.url);
    return Response.json({ metric: url.pathname.split("/").at(-1), period: url.searchParams.get("period"), value: 1284, change: "+18%" });
  },
};
