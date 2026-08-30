export const example = {
  slug: "inventory",
  label: "Inventory",
  title: "Answer stock questions from the product page",
  question: "Is SKU-1042 available in the Portland warehouse?",
  toolName: "get_inventory",
  operation: "GET /api/inventory/SKU-1042?warehouse=portland",
  input: { sku: "SKU-1042", warehouse: "portland" },
  document: {
    openapi: "3.1.0",
    paths: {
      "/api/inventory/{sku}": {
        get: {
          operationId: "get_inventory",
          description: "Get stock for one product and warehouse.",
          "x-webmcp-enabled": true,
          parameters: [
            { name: "sku", in: "path", required: true, schema: { type: "string" } },
            { name: "warehouse", in: "query", required: true, schema: { type: "string" } },
          ],
        },
      },
    },
  },
  async dispatch(request) {
    const url = new URL(request.url);
    return Response.json({ sku: url.pathname.split("/").at(-1), warehouse: url.searchParams.get("warehouse"), available: 37, restockDate: null });
  },
};
