export const example = {
  slug: "operations",
  label: "Operations",
  title: "Find the incident before the alert storm",
  question: "Which production services are unhealthy in us-east?",
  toolName: "get_service_health",
  operation: "GET /api/services/health?environment=production&region=us-east",
  input: { environment: "production", region: "us-east" },
  document: {
    openapi: "3.1.0",
    paths: {
      "/api/services/health": {
        get: {
          operationId: "get_service_health",
          description: "List service health for one environment and region.",
          "x-webmcp-enabled": true,
          parameters: [
            { name: "environment", in: "query", required: true, schema: { type: "string", enum: ["staging", "production"] } },
            { name: "region", in: "query", required: true, schema: { type: "string" } },
          ],
        },
      },
    },
  },
  async dispatch(request) {
    const url = new URL(request.url);
    return Response.json({ healthy: 18, unhealthy: ["checkout-api", "events-worker"], environment: url.searchParams.get("environment"), region: url.searchParams.get("region") });
  },
};
