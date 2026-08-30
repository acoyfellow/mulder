import { createWebMcpCompanion } from "../dist/public.js";
import { example as operations } from "../site/examples/operations.mjs";
import { example as inventory } from "../site/examples/inventory.mjs";
import { example as support } from "../site/examples/support.mjs";
import { example as analytics } from "../site/examples/analytics.mjs";

const examples = [operations, inventory, support, analytics];
const testOrigin = ["https:", "", "example.test"].join("/");
for (const example of examples) {
  const arrivals = [];
  const companion = createWebMcpCompanion({
    document: example.document,
    renderPage: () => new Response("<html><body></body></html>"),
    async dispatch(request) {
      arrivals.push(`${request.method} ${new URL(request.url).pathname}${new URL(request.url).search}`);
      return example.dispatch(request);
    },
  });
  const names = companion.tools.map(({ name }) => name);
  if (JSON.stringify(names) !== JSON.stringify([example.toolName])) throw new Error(`${example.slug}: wrong tools ${JSON.stringify(names)}`);
  const response = await companion.handle(new Request(`${testOrigin}/__mulder/call/${example.toolName}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(example.input) }));
  if (!response?.ok) throw new Error(`${example.slug}: call failed ${response?.status}`);
  if (JSON.stringify(arrivals) !== JSON.stringify([example.operation])) throw new Error(`${example.slug}: wrong arrival ${JSON.stringify(arrivals)}`);
  const body = await response.json();
  if (!body || typeof body !== "object") throw new Error(`${example.slug}: invalid response`);
}
console.log(`MULDER_SITE_EXAMPLES_OK:${examples.length}`);
