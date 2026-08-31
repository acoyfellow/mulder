import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { example as operations } from "./examples/operations.mjs";
import { example as inventory } from "./examples/inventory.mjs";
import { example as support } from "./examples/support.mjs";
import { example as analytics } from "./examples/analytics.mjs";

const site = dirname(fileURLToPath(import.meta.url));
const root = dirname(site);
const out = join(site, "dist");
const examples = [operations, inventory, support, analytics];
const tarball = process.env.MULDER_TARBALL;
const video = join(root, "demo", "mulder-demo.mp4");
const pages = [];

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const code = (value, id = `code-${Math.random().toString(36).slice(2)}`) => `<div class="code-block"><button class="copy" data-copy="${id}">Copy</button><pre id="${id}"><code>${escapeHtml(value.trim())}</code></pre></div>`;
const current = (path, target) => path === target || (target !== "/" && path.startsWith(target)) ? ' aria-current="page"' : "";

function header(path) {
  return `<a class="skip" href="#content">Skip to content</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="/"><i></i>Mulder</a><button class="menu-button" data-menu aria-expanded="false" aria-label="Open navigation">Menu</button><nav class="nav" data-navigation aria-label="Main navigation"><a href="/docs/"${current(path, "/docs/")}>Docs</a><a href="/examples/"${current(path, "/examples/")}>Examples</a><a href="/docs/security/"${current(path, "/docs/security/")}>Security</a><a href="/docs/reference/"${current(path, "/docs/reference/")}>Reference</a></nav><button class="search-button" data-search-open aria-label="Search documentation">⌕ <span>Search</span> <kbd>⌘K</kbd></button></div></header>`;
}

const footer = `<footer class="site-footer"><div class="shell footer-inner"><span>Mulder 0.1 · Private browser-native beta</span><div class="footer-links"><a href="/docs/browser-support/">Browser support</a><a href="/docs/security/">Security</a><a href="/docs/reference/">Reference</a></div></div></footer>`;
const search = `<dialog class="search-dialog" data-search-dialog><div class="search-top"><input type="search" aria-label="Search" placeholder="Search Mulder"><button data-search-close aria-label="Close search">Esc</button></div><div class="search-results" data-search-results><p>Start typing to search.</p></div></dialog>`;

function layout({ path, title, description, body }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Mulder</title><meta name="description" content="${escapeHtml(description)}"><meta property="og:title" content="${escapeHtml(title)} · Mulder"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="/og.svg"><meta name="theme-color" content="#06100a"><link rel="stylesheet" href="/styles.css"><script type="module" src="/app.js"></script></head><body>${header(path)}<main id="content">${body}</main>${footer}${search}</body></html>`;
}

const docsGroups = [
  ["Start", [["Overview", "/docs/"], ["Quickstart", "/docs/quickstart/"], ["Browser support", "/docs/browser-support/"]]],
  ["Understand", [["Security", "/docs/security/"], ["API reference", "/docs/reference/"], ["Examples", "/examples/"]]],
];
function docsNav(path) {
  return `<aside class="docs-nav" aria-label="Documentation navigation">${docsGroups.map(([group, links]) => `<h2>${group}</h2>${links.map(([label, href]) => `<a href="${href}"${current(path, href)}>${label}</a>`).join("")}`).join("")}</aside>`;
}
function docsPage(path, title, description, content) {
  return `<div class="shell page-hero"><div class="eyebrow">Documentation</div><h1>${title}</h1><p>${description}</p></div><div class="shell docs-layout">${docsNav(path)}<article class="content">${content}</article></div>`;
}

const quickstartInstall = `mkdir my-first-mulder-tool
cd my-first-mulder-tool
curl -O "$MULDER_SITE/downloads/mulder-0.1.0.tgz"
for file in package.json tsconfig.json wrangler.jsonc api.ts index.ts; do
  curl -O "$MULDER_SITE/downloads/starter/$file"
done
npm install
npm run check
npm run dev`;
const optIn = `get: {
  operationId: "get_service_health",
  description: "Get the health of one service in one region.",
  "x-webmcp-enabled": true,
  parameters: [
    { name: "service", in: "path", required: true, schema: { type: "string" } },
    { name: "region", in: "query", required: true, schema: { type: "string" } }
  ]
}`;
const integration = `import { createWebMcpCompanion } from "mulder";
import { existingApi } from "./api";

const companion = createWebMcpCompanion({
  document: openApiDocument,
  renderPage: () => new Response(pageHtml, {
    headers: { "content-type": "text/html; charset=utf-8" }
  }),
  dispatch: (request) => existingApi(request)
});

export default {
  async fetch(request: Request) {
    return await companion.handle(request) ?? existingApi(request);
  }
};`;

const home = `<div class="shell hero"><div class="eyebrow">Browser-native tools from the API you already have</div><h1>Your website already knows what it can do. <span>Let browser agents use it.</span></h1><p class="hero-copy">Mulder turns approved OpenAPI operations into native browser tools. Keep your API, authentication, and business logic. Do not build or operate another MCP server.</p><div class="actions"><a class="button" href="/docs/quickstart/">Build your first tool →</a><a class="button secondary" href="#demo">Watch the real call</a></div><div class="proof-line"><span>Existing API stays unchanged</span><span>Explicit read-only opt-in</span><span>Credentials stay server-side</span></div><div class="demo-frame" id="demo"><div class="demo-bar"><i></i><i></i><i></i><span>Visual result of a separately verified native Chrome call</span></div><a class="demo-link" href="/demo/" aria-label="Watch the verified Mulder demo"><img src="/demo-poster.svg" alt="Mulder demo before the native call"><strong>▶ Watch the verified call</strong></a></div></div>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Not another generated MCP server.</h2><p>OpenAPI conversion is common. Mulder puts the approved tools in the website the person is already using. The browser discovers them from the page. There is no separate service for every user to find and configure.</p></div><div class="flow-compare"><div class="compare"><div class="compare-label">TRADITIONAL</div>${code("OpenAPI → generated MCP server\n→ deploy another service\n→ configure each agent", "traditional-flow")}</div><div class="compare good"><div class="compare-label">MULDER</div>${code("Existing website + OpenAPI\n→ approve safe operations\n→ browser discovers native tools", "mulder-flow")}</div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>The website stays in control.</h2><p>Mulder is a narrow bridge. It does not replace your API. It publishes only the operations you approve, validates input before dispatch, and lets your server keep custody of credentials.</p></div><div class="cards"><a class="card" href="/docs/quickstart/"><span class="card-number">01</span><h3>No second implementation</h3><p>Your existing handler remains the source of truth.</p></a><a class="card" href="/docs/browser-support/"><span class="card-number">02</span><h3>No agent setup</h3><p>A compatible browser discovers tools from the current page.</p></a><a class="card" href="/docs/security/"><span class="card-number">03</span><h3>No credential handoff</h3><p>The page calls a same-origin route. Your server calls the API.</p></a></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>From document to native call.</h2><p>One explicit path connects the OpenAPI document to the browser. Unsupported semantics stop the build instead of becoming weaker tools.</p></div><div class="steps"><div class="step"><b>01</b><h3>Read</h3><p>Mulder reads an OpenAPI 3.1 document.</p></div><div class="step"><b>02</b><h3>Approve</h3><p>You mark specific read-only operations.</p></div><div class="step"><b>03</b><h3>Publish</h3><p>Your page registers native browser tools.</p></div><div class="step"><b>04</b><h3>Dispatch</h3><p>Your server validates and calls the unchanged API.</p></div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Useful where work already happens.</h2><p>Each example uses the supported read-only subset. Each one runs against an ordinary API handler.</p></div><div class="example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span></a>`).join("")}</div></div></section>
<section class="section"><div class="shell cta"><div><div class="eyebrow">Private beta</div><h2>Give your website its first browser tool.</h2><p>Start with one safe GET operation. Keep everything else unchanged.</p></div><a class="button" href="/docs/quickstart/">Open the ten-minute guide →</a></div></section>`;

const overview = docsPage("/docs/", "Make an existing website agent-ready.", "Mulder publishes a safe part of your existing API as native tools in a compatible browser.", `<h1>Overview</h1><p class="lead">Mulder is for teams that already have a website, an API behind it, and an OpenAPI document. It lets the website expose approved capabilities to browser agents without a separate MCP deployment.</p><h2>What changes</h2><p>You add a companion route to your Worker and opt in individual OpenAPI operations with <code>x-webmcp-enabled: true</code>. A compatible browser discovers those operations as native tools while the person is on the page.</p><h2>What does not change</h2><ul><li>Your API implementation.</li><li>Your authentication and authorization rules.</li><li>Your business logic.</li><li>Your normal website routes.</li></ul><h2>Where Mulder fits</h2>${code("Browser agent\n    ↓ native website-defined tool\nMulder companion route\n    ↓ validated same-origin request\nExisting API handler", "fit-flow")}<div class="callout">OpenAPI is the source material, not the product. The useful difference is browser discovery from the current website.</div><h2>Start small</h2><p>Choose one low-risk lookup. Complete the <a href="/docs/quickstart/">quickstart</a>, then review the <a href="/docs/security/">security boundary</a> before adding another operation.</p>`);

const quickstart = docsPage("/docs/quickstart/", "Your first browser tool in ten minutes.", "Install the private beta artifact, approve one GET operation, and run the companion Worker.", `<h1>Quickstart</h1><p class="lead">This guide starts from an empty directory. It creates one tool named <code>get_service_health</code> and leaves the existing API handler unchanged.</p><div class="callout warning"><strong>Private beta:</strong> Mulder is not on the public npm registry. This local documentation server provides the checked package artifact.</div><h2>1. Download the starter</h2><p>Set <code>MULDER_SITE</code> to this documentation site’s origin, then run:</p>${code(quickstartInstall, "quickstart-install")}<p>Set <code>CONSUMER_ORIGIN</code> to the local Wrangler address on port 8896. Open <code>$CONSUMER_ORIGIN/__mulder/</code> after Wrangler starts.</p><h2>2. See the explicit opt-in</h2><p>The starter’s OpenAPI document has one approved read-only operation:</p>${code(optIn, "quickstart-opt-in")}<p>Mulder ignores operations without <code>x-webmcp-enabled: true</code>. Unsupported enabled operations fail compilation.</p><h2>3. Connect the companion</h2>${code(integration, "quickstart-integration")}<p><code>companion.handle</code> owns the manifest, bootstrap, page, and guarded call routes. Every other request continues to the existing API.</p><h2>4. Inspect what the browser receives</h2>${code('curl "$CONSUMER_ORIGIN/__mulder/manifest"', "quickstart-manifest")}<p>The manifest contains exactly <code>get_service_health</code>. It has scalar <code>service</code> and <code>region</code> inputs and a read-only annotation.</p><h2>5. Make the native call</h2><p>Open the companion page in a WebMCP-capable Chrome build. Ask the browser agent:</p><div class="callout">Is checkout-api healthy in us-east?</div><p>The native tool call becomes:</p>${code('get_service_health({ service: "checkout-api", region: "us-east" })', "quickstart-call")}<p>The unchanged API receives <code>GET /api/services/checkout-api?region=us-east</code>.</p><h2>6. Add your API</h2><p>Replace the starter OpenAPI object and <code>existingApi</code> function with your application’s existing versions. Keep the companion boundary the same.</p><h2>Before production</h2><p>Read the <a href="/docs/security/">security guide</a>. Mulder does not provide user authorization or agent identity. Your application must continue to enforce access.</p>`);

const browserSupport = docsPage("/docs/browser-support/", "Browser support is early.", "Mulder targets native website-defined WebMCP tools. That browser surface is not yet universal.", `<h1>Browser support</h1><p class="lead">The checked native proof uses Chrome for Testing 151 with the WebMCP DevTools domain. Normal browsers without WebMCP can still render the companion page, but they cannot discover or invoke its native tools.</p><h2>Checked today</h2><table><thead><tr><th>Surface</th><th>Page</th><th>Native tools</th></tr></thead><tbody><tr><td>Chrome for Testing 151</td><td>Yes</td><td>Verified</td></tr><tr><td>cmux WKWebView</td><td>Yes</td><td>No native WebMCP claim</td></tr><tr><td>Standard browser without WebMCP</td><td>Yes</td><td>Unavailable</td></tr></tbody></table><h2>Progressive behavior</h2><p>The page remains a normal HTML document. Mulder injects an external same-origin module. If <code>navigator.modelContext</code> is unavailable, registration does not occur. Your existing website routes remain available.</p><h2>What the demo proves</h2><p>The video shows the page before and after a call. A separate Chrome receipt proves native discovery and invocation. The pixels alone are not native WebMCP evidence.</p><h2>Test your integration</h2><p>Use the manifest for development inspection. Use real <code>WebMCP.toolsAdded</code>, <code>WebMCP.toolInvoked</code>, and <code>WebMCP.toolResponded</code> events for a native claim.</p>`);

const securityPage = docsPage("/docs/security/", "Keep authority on your server.", "Mulder limits the generated surface, validates inputs, and dispatches through application-owned server code.", `<h1>Security</h1><p class="lead">Mulder does not give the browser your API credential. The browser calls a same-origin Mulder route. Your server validates the tool input and dispatches the API request.</p><h2>Four boundaries</h2><ol><li><strong>Explicit publication.</strong> An operation needs <code>x-webmcp-enabled: true</code>.</li><li><strong>Read-only generation.</strong> Enabled POST, PUT, PATCH, and DELETE operations fail compilation.</li><li><strong>Input validation.</strong> Unknown, missing, malformed, and out-of-range values stop before dispatch.</li><li><strong>Application authorization.</strong> Your handler remains responsible for the current person’s access.</li></ol><h2>Credential custody</h2>${code("Browser → POST /__mulder/call/get_service_health\nServer validates input\nServer adds its own credential\nServer → existing API", "credential-flow")}<p>Do not place secrets in the OpenAPI document, bootstrap module, HTML, or browser tool descriptor.</p><h2>Fail-closed subset</h2><p>Mulder currently accepts OpenAPI 3.1 read-only GET operations with inline scalar path and query parameters. It rejects request bodies, references, composition, arrays, objects, header parameters, cookie parameters, and unsupported serialization.</p><p>See the complete <a href="/docs/reference/#supported-subset">supported subset</a>.</p><h2>What Mulder does not prove</h2><ul><li>It does not provide a verified browser-agent identity.</li><li>It does not replace user authentication.</li><li>It does not make arbitrary write effects safe.</li><li>It does not support every OpenAPI document.</li></ul><div class="callout warning">Generated writes are not part of the package. Keep mutating operations disabled.</div>`);

const reference = docsPage("/docs/reference/", "Small public surface. Strict input.", "The package exports two functions and the types needed to create a companion.", `<h1>API reference</h1><h2>createWebMcpCompanion</h2>${code(`createWebMcpCompanion(options: {
  document: OpenApiDocument;
  renderPage: () => Response | Promise<Response>;
  dispatch: (request: Request, tool: GeneratedTool) => Response | Promise<Response>;
  basePath?: string;
  resultSelector?: string;
  maxInputBytes?: number;
}): WebMcpCompanion`, "reference-create")}<p>Compiles the document once. It returns an immutable public tool list and a <code>handle</code> function for companion routes.</p><h3>Routes</h3><table><thead><tr><th>Route</th><th>Purpose</th></tr></thead><tbody><tr><td><code>GET /__mulder/</code></td><td>Render the supplied page and inject the bootstrap module.</td></tr><tr><td><code>GET /__mulder/manifest</code></td><td>Return public tool descriptors.</td></tr><tr><td><code>GET /__mulder/bootstrap.js</code></td><td>Register tools in a compatible browser.</td></tr><tr><td><code>POST /__mulder/call/:name</code></td><td>Validate input and dispatch one tool.</td></tr></tbody></table><h2>injectWebMcpBootstrap</h2>${code("injectWebMcpBootstrap(response: Response, bootstrapPath: string): Response", "reference-inject")}<p>Injects an external module before the response body through Cloudflare HTMLRewriter.</p><h2 id="supported-subset">Supported OpenAPI subset</h2><ul><li>OpenAPI 3.1.</li><li>Explicitly enabled GET operations.</li><li>Operation-level scalar path and query parameters.</li><li>Inline string, boolean, integer, and number schemas.</li><li>Simple path and form query serialization.</li><li>JSON adapter responses.</li></ul><h3>Rejected</h3><ul><li>Request bodies and mutating methods.</li><li>Header and cookie parameters.</li><li>Arrays, objects, references, and composition.</li><li>Unsupported styles and media types.</li><li>Missing schemas and unmatched path templates.</li></ul><h2>Package boundary</h2><p>The ESM package has no runtime dependencies. It exports companion behavior and public types. It does not export the demonstration Worker, experiments, Durable Object write primitive, or proof harness.</p>`);

const examplesIndex = `<div class="shell page-hero"><div class="eyebrow">Runnable examples</div><h1>Start with a question someone already asks.</h1><p>Each example maps one useful question to one approved GET operation. The API handler remains ordinary application code.</p></div><section class="section"><div class="shell example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span><p>${item.operation}</p></a>`).join("")}</div></section><section class="section"><div class="shell cta"><div><h2>Build the smallest example first.</h2><p>The quickstart starts from an empty directory and one service-health lookup.</p></div><a class="button" href="/docs/quickstart/">Open quickstart →</a></div></section>`;

function examplePage(item) {
  const operation = item.document.paths[Object.keys(item.document.paths)[0]].get;
  return `<div class="shell page-hero"><div class="eyebrow">${item.label} example</div><h1>${item.title}</h1><p>“${item.question}”</p></div><div class="shell docs-layout">${docsNav(`/examples/${item.slug}/`)}<article class="content"><h1>${item.toolName}</h1><p class="lead">The browser discovers one website-defined tool. The tool dispatches one request to the existing API handler.</p><h2>User request</h2><div class="callout">${item.question}</div><h2>Native tool call</h2>${code(`${item.toolName}(${JSON.stringify(item.input, null, 2)})`, `${item.slug}-call`)}<h2>OpenAPI opt-in</h2>${code(JSON.stringify(operation, null, 2), `${item.slug}-openapi`)}<h2>Existing API request</h2>${code(item.operation, `${item.slug}-request`)}<h2>Why this is a fit</h2><p>This is a bounded read. It needs only scalar path or query inputs. The website can apply the current user’s normal authorization before the API returns data.</p><h2>What stays out</h2><p>Mutating operations remain absent. The tool does not create incidents, change inventory, update tickets, or edit metrics.</p><p><a href="/examples/">← All examples</a></p></article></div>`;
}

const demoPage = `<div class="shell page-hero"><div class="eyebrow">Verified browser demo</div><h1>One native tool. One unchanged API call.</h1><p>The recording browser shows the result. A separate Chrome-for-Testing receipt verifies native WebMCP discovery and invocation.</p></div><section class="section"><div class="shell"><div class="demo-frame"><div class="demo-bar"><i></i><i></i><i></i><span>get_weather · exact native discovery set</span></div><video controls autoplay muted playsinline preload="metadata" poster="/demo-poster.svg"><source src="/mulder-demo.mp4" type="video/mp4"></video></div><div class="proof-line"><span>Only get_weather discovered</span><span>Completed native response</span><span>Exactly one API arrival</span></div><div class="callout">The video is the visible story. The native Chrome event receipt is the authority for the WebMCP claim.</div></div></section>`;

const pageDefinitions = [
  ["/", "Browser-native tools for your existing API", "Turn approved OpenAPI operations into native browser tools without another MCP server.", home],
  ["/demo/", "Verified demo", "Watch one native browser tool call an unchanged API.", demoPage],
  ["/docs/", "Overview", "Understand where Mulder fits and what stays unchanged.", overview],
  ["/docs/quickstart/", "Quickstart", "Build your first native browser tool in ten minutes.", quickstart],
  ["/docs/browser-support/", "Browser support", "See which browser surfaces support Mulder's native tools.", browserSupport],
  ["/docs/security/", "Security", "Understand credential custody, validation, and Mulder's limits.", securityPage],
  ["/docs/reference/", "API reference", "Read the complete Mulder package and route reference.", reference],
  ["/examples/", "Examples", "Explore four runnable browser-native API examples.", examplesIndex],
  ...examples.map((item) => [`/examples/${item.slug}/`, `${item.label} example`, item.title, examplePage(item)]),
];

async function emit(path, title, description, body) {
  const destination = path === "/" ? join(out, "index.html") : join(out, path, "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, layout({ path, title, description, body }));
  pages.push({ path, title, description, text: body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 2000) });
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const definition of pageDefinitions) await emit(...definition);
await cp(join(site, "src", "styles.css"), join(out, "styles.css"));
await cp(join(site, "src", "app.js"), join(out, "app.js"));
await cp(video, join(out, "mulder-demo.mp4"));
await writeFile(join(out, "search-index.json"), JSON.stringify(pages));
await writeFile(join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
await writeFile(join(out, "404.html"), layout({ path: "/404", title: "Not found", description: "This page does not exist.", body: '<div class="shell not-found"><div class="eyebrow">404</div><h1>The page is not out there.</h1><p><a class="button" href="/">Return home</a></p></div>' }));
const svgNamespace = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
await writeFile(join(out, "og.svg"), `<svg xmlns="${svgNamespace}" width="1200" height="630"><rect width="1200" height="630" fill="#f8f8f5"/><circle cx="950" cy="120" r="18" fill="#c9511f"/><text x="80" y="110" fill="#667080" font-family="monospace" font-size="26" letter-spacing="7">MULDER</text><text x="80" y="280" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">Your website already knows</text><text x="80" y="370" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">what it can do.</text><text x="80" y="480" fill="#111210" font-family="system-ui" font-weight="700" font-size="54">Let browser agents use it.</text></svg>`);
await writeFile(join(out, "demo-poster.svg"), `<svg xmlns="${svgNamespace}" width="1280" height="580"><rect width="1280" height="580" fill="#f8f8f5"/><text x="90" y="90" fill="#667080" font-family="monospace" font-size="18">OPENAPI → NATIVE BROWSER TOOL</text><text x="90" y="215" fill="#111210" font-family="system-ui" font-weight="700" font-size="66">Your API already has an</text><text x="90" y="300" fill="#111210" font-family="system-ui" font-weight="700" font-size="66">agent interface.</text><rect x="90" y="370" width="1100" height="120" rx="8" fill="#111210"/><text x="125" y="440" fill="#f8f8f5" font-family="monospace" font-size="24">▶ Watch the verified native call</text></svg>`);
await mkdir(join(out, "downloads", "starter"), { recursive: true });
for (const file of ["package.json", "tsconfig.json", "wrangler.jsonc", "api.ts", "index.ts"]) await cp(join(site, "starter", file), join(out, "downloads", "starter", file));
if (!tarball) throw new Error("MULDER_TARBALL is required");
await cp(tarball, join(out, "downloads", "mulder-0.1.0.tgz"));
console.log(`MULDER_SITE_BUILT:${pageDefinitions.length}:${basename(tarball)}`);
