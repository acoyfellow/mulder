export const example = {
  slug: "support",
  label: "Support",
  title: "Bring the current ticket into the conversation",
  question: "What is blocking support ticket 48392?",
  toolName: "get_support_ticket",
  operation: "GET /api/tickets/48392",
  input: { ticketId: "48392" },
  document: {
    openapi: "3.1.0",
    paths: {
      "/api/tickets/{ticketId}": {
        get: {
          operationId: "get_support_ticket",
          description: "Get the current state of one support ticket.",
          "x-webmcp-enabled": true,
          parameters: [
            { name: "ticketId", in: "path", required: true, schema: { type: "string", pattern: "^[0-9]+$" } },
          ],
        },
      },
    },
  },
  async dispatch(request) {
    const url = new URL(request.url);
    return Response.json({ ticketId: url.pathname.split("/").at(-1), status: "waiting_on_customer", blocker: "DNS ownership confirmation", updated: "8 minutes ago" });
  },
};
