import { createHash } from "node:crypto";
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
if (!tarball) throw new Error("MULDER_TARBALL is required");
const tarballName = "acoyfellow-mulder-0.1.0.tgz";
const tarballSha256 = createHash("sha256").update(await readFile(tarball)).digest("hex");
const video = join(root, "demo", "mulder-demo.mp4");
const poster = join(root, "demo", "mulder-poster.png");
const pages = [];
const origin = "https://mulder.coey.dev";

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
function highlightCode(value) {
  const source = value.trim();
  const token = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:async|await|const|export|from|function|if|import|new|return|throw|typeof)\b)|(\b(?:true|false|null|undefined)\b)|(\b\d+(?:\.\d+)?\b)/g;
  let output = "";
  let cursor = 0;
  for (const match of source.matchAll(token)) {
    output += escapeHtml(source.slice(cursor, match.index));
    const kind = match[1] ? "string" : match[2] ? "keyword" : match[3] ? "literal" : "number";
    output += `<span class="token-${kind}">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHtml(source.slice(cursor));
}
function codeLanguage(value) {
  const source = value.trim();
  if (source.startsWith("{") || source.startsWith("[")) return "JSON";
  if (/^(mkdir|cd |curl |for |npm |bun )/m.test(source)) return "Shell";
  if (/\b(import|export|const|interface|async|Request|Response)\b/.test(source)) return "TypeScript";
  return "Code";
}
const code = (value, id = `code-${Math.random().toString(36).slice(2)}`) => `<div class="code-block"><span class="code-language">${codeLanguage(value)}</span><button class="copy" data-copy="${id}" aria-label="Copy code">Copy</button><pre tabindex="0"><code id="${id}">${highlightCode(value)}</code></pre></div>`;
const diagram = (value) => `<div class="code-block diagram"><pre tabindex="0"><code>${escapeHtml(value.trim())}</code></pre></div>`;
const current = (path, target) => path === target || (target !== "/" && path.startsWith(target)) ? ' aria-current="page"' : "";

function header(path) {
  return `<a class="skip" href="#content">Skip to content</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="/"><i></i>Mulder</a><button class="menu-button" data-menu aria-expanded="false" aria-label="Menu">Menu</button><nav class="nav" data-navigation aria-label="Main navigation"><a href="/docs/"${current(path, "/docs/")}>Docs</a><a href="/examples/"${current(path, "/examples/")}>Examples</a><a href="/docs/security/"${current(path, "/docs/security/")}>Security</a><a href="/docs/reference/"${current(path, "/docs/reference/")}>Reference</a></nav><button class="search-button" data-search-open aria-label="Search documentation">⌕ <span>Search</span> <kbd>⌘K</kbd></button></div></header>`;
}

const footer = `<footer class="site-footer"><div class="shell footer-inner"><span>Mulder 0.1 · Public preview · checked package</span><div class="footer-links"><a href="/docs/browser-support/">Browser support</a><a href="/docs/security/">Security</a><a href="/docs/reference/">Reference</a><a href="https://github.com/acoyfellow/mulder">Source</a></div></div></footer>`;
const search = `<dialog class="search-dialog" data-search-dialog><div class="search-top"><input type="search" aria-label="Search" placeholder="Search Mulder"><button data-search-close aria-label="Close search">Esc</button></div><div class="search-results" data-search-results><p>Start typing to search.</p></div></dialog>`;

function layout({ path, title, description, body }) {
  const canonical = new URL(path, origin).href;
  const structuredData = JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Mulder", applicationCategory: "DeveloperApplication", operatingSystem: "Web", description, url: canonical, codeRepository: "https://github.com/acoyfellow/mulder", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · Mulder</title><meta name="description" content="${escapeHtml(description)}"><meta name="application-name" content="Mulder"><meta name="theme-color" content="#f8f8f5"><meta name="color-scheme" content="light"><link rel="canonical" href="${canonical}"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png"><link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta property="og:type" content="website"><meta property="og:site_name" content="Mulder"><meta property="og:url" content="${canonical}"><meta property="og:title" content="${escapeHtml(title)} · Mulder"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="${origin}/social-card.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="An API document connected to a browser window"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)} · Mulder"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${origin}/social-card.jpg"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/enhancements.css"><script type="application/ld+json">${structuredData}</script><script type="module" src="/app.js"></script></head><body>${header(path)}<main id="content">${body}</main>${footer}${search}</body></html>`;
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
curl -O "$MULDER_SITE/downloads/${tarballName}"
curl -O "$MULDER_SITE/downloads/${tarballName}.sha256"
shasum -a 256 -c ${tarballName}.sha256
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
const integration = `import { createWebMcpCompanion } from "@acoyfellow/mulder";
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

const legacyHome = `<div class="shell hero"><div class="eyebrow">OpenAPI to WebMCP</div><h1>Turn your app’s OpenAPI file into <span>WebMCP tools.</span></h1><p class="hero-copy">Add Mulder to the app’s existing Worker. Choose which GET operations become tools. Users connect through the website.</p><div class="actions"><a class="button" href="/docs/quickstart/">Add Mulder to your Worker</a><a class="button secondary" href="#connect">See how users connect</a></div><div class="proof-line"><span>Uses your OpenAPI file</span><span>Runs in your existing Worker</span><span>Keeps your API in place</span></div><div class="demo-frame" id="demo"><div class="demo-bar"><i></i><i></i><i></i><span>See the complete flow.</span></div><video controls muted playsinline preload="metadata" poster="/demo-poster.png" aria-label="Mulder product overview"><source src="/mulder-demo.mp4" type="video/mp4"></video></div></div>
<section class="section section-rule" id="connect"><div class="shell"><div class="section-head"><h2>How users connect.</h2><p>A user opens your website in a supported browser. The browser finds the tools that Mulder added. Their browser agent calls a tool. Your existing API returns the result.</p></div><div class="flow-compare"><div class="compare"><div class="compare-label">IN YOUR APP</div>${diagram("OpenAPI file + existing Worker\n-> Mulder adds selected GET tools\n-> existing API handles each call")}</div><div class="compare good"><div class="compare-label">FOR YOUR USERS</div>${diagram("Open the website\n-> browser finds the tools\n-> browser agent calls one")}</div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>What Mulder changes.</h2><p>Mulder adds routes to your Worker. The routes publish the tool list, check each call, and send the request to your API. Your API code stays in place.</p></div><div class="cards"><a class="card" href="/docs/quickstart/"><span class="card-number">01</span><h3>Use the OpenAPI file</h3><p>Mulder reads the API description that your app already has.</p></a><a class="card" href="/docs/quickstart/"><span class="card-number">02</span><h3>Choose each tool</h3><p>You decide which read-only GET operations users can call.</p></a><a class="card" href="/docs/security/"><span class="card-number">03</span><h3>Keep your API</h3><p>Your existing API checks access and returns each result.</p></a></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>What happens after you add it.</h2><p>Mulder reads your OpenAPI file and adds only the operations it can preserve. The build stops when an enabled operation uses an unsupported feature.</p></div><div class="steps"><div class="step"><b>01</b><h3>Read the file</h3><p>Mulder reads your OpenAPI 3.1 file.</p></div><div class="step"><b>02</b><h3>Choose a GET</h3><p>You enable each read-only operation yourself.</p></div><div class="step"><b>03</b><h3>Add the tools</h3><p>Your website tells the browser which tools exist.</p></div><div class="step"><b>04</b><h3>Call your API</h3><p>Your server checks the input and calls your current API.</p></div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Start with a question people already ask.</h2><p>Each example uses a read-only API request. Each example runs against normal application code.</p></div><div class="example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span></a>`).join("")}</div></div></section>
<section class="section"><div class="shell cta"><div><div class="eyebrow">Public preview</div><h2>Add Mulder to your existing Worker.</h2><p>Start with one GET operation from your OpenAPI file.</p></div><a class="button" href="/docs/quickstart/">Open the ten-minute guide</a></div></section>`;

const legacyOverview = docsPage("/docs/", "OpenAPI to WebMCP in your existing Worker.", "Mulder turns selected GET operations into WebMCP tools for your users.", `<h2 class="content-title">Overview</h2><p class="lead">Mulder turns selected GET operations from an OpenAPI 3.1 file into WebMCP tools. Add it to your existing Worker. Users connect by opening your website in a supported browser.</p><h2>What changes</h2><p>Add Mulder to your existing Worker. It adds page and tool routes next to your current routes. You then enable each OpenAPI operation with <code>x-webmcp-enabled: true</code>. A supported browser finds those tools when the person opens the page.</p><h2>What does not change</h2><ul><li>Your API implementation.</li><li>Your authentication and authorization rules.</li><li>Your business logic.</li><li>Your normal website routes.</li></ul><h2>Where Mulder fits</h2>${code("Browser agent\n    -> website tool\nMulder route\n    -> checked request\nExisting API", "fit-flow")}<div class="callout">OpenAPI describes the tools. The browser is the useful difference. It finds the tools on the website that the person already uses.</div><h2>Start small</h2><p>Choose one low-risk lookup. Complete the <a href="/docs/quickstart/">quickstart</a>. Read the <a href="/docs/security/">security guide</a> before you add another operation.</p>`);

const legacyQuickstart = docsPage("/docs/quickstart/", "Your first browser tool in ten minutes.", "Download the package, enable one GET operation, and run your Worker.", `<h2 class="content-title">Quickstart</h2><p class="lead">This guide starts in an empty directory. It creates one tool named <code>get_service_health</code>. The existing API code does not change.</p><div class="callout warning"><strong>Public preview:</strong> Download the checked package file from this documentation site.</div><h2>1. Download the starter</h2><p>Set <code>MULDER_SITE</code> to the address of this documentation site, then run:</p>${code(quickstartInstall, "quickstart-install")}<p>Set <code>CONSUMER_ORIGIN</code> to the local Wrangler address on port 8896. Open <code>$CONSUMER_ORIGIN/__mulder/</code> after Wrangler starts.</p><h2>2. Choose one operation</h2><p>The starter’s OpenAPI document has one approved read-only operation:</p>${code(optIn, "quickstart-opt-in")}<p>Mulder ignores an operation unless you set <code>x-webmcp-enabled: true</code>. The build stops if the operation uses a feature that Mulder does not support.</p><h2>3. Add Mulder to the Worker</h2>${code(integration, "quickstart-integration")}<p><code>companion.handle</code> handles the Mulder page and tool routes. All other requests continue to your existing API.</p><h2>4. Check the tool list</h2>${code('curl "$CONSUMER_ORIGIN/__mulder/manifest"', "quickstart-manifest")}<p>This command lists the tools that the browser can find. The list contains only <code>get_service_health</code>. The tool accepts a service and region. It cannot change data.</p><h2>5. Make the browser call</h2><p>Open the Mulder page in a Chrome build that supports WebMCP. Ask the browser agent:</p><div class="callout">Is checkout-api healthy in us-east?</div><p>The browser calls this tool:</p>${code('get_service_health({ service: "checkout-api", region: "us-east" })', "quickstart-call")}<p>The unchanged API receives <code>GET /api/services/checkout-api?region=us-east</code>.</p><h2>6. Add your API</h2><p>Replace the starter OpenAPI object and <code>existingApi</code> function with the versions from your application. Keep the Mulder setup the same.</p><h2>Before production</h2><p>Read the <a href="/docs/security/">security guide</a>. Mulder does not decide who can use your API. Your application must continue to check each user’s access. The browser also does not give Mulder a verified agent identity.</p>`);

const browserSupport = docsPage("/docs/browser-support/", "Browser support is early.", "Mulder uses WebMCP to add tools to a website. Most browsers do not support these tools yet.", `<h2 class="content-title">Browser support</h2><p class="lead">The checked proof uses Chrome for Testing 151. A browser without WebMCP can show the Mulder page. It cannot find or call the tools.</p><h2>Checked today</h2><table><thead><tr><th>Browser</th><th>Shows the page</th><th>Finds WebMCP tools</th></tr></thead><tbody><tr><td>Chrome for Testing 151</td><td>Yes</td><td>Verified</td></tr><tr><td>cmux WKWebView</td><td>Yes</td><td>No</td></tr><tr><td>Standard browser without WebMCP</td><td>Yes</td><td>Unavailable</td></tr></tbody></table><h2>What happens in other browsers</h2><p>The page remains a normal HTML page. Mulder loads a script from the same website. If <code>navigator.modelContext</code> is not available, Mulder does not add the tools. The rest of your website continues to work.</p><h2>What the demo proves</h2><p>The video shows the page before and after a call. A separate Chrome record proves that the browser found and called the tool. The video alone does not prove this.</p><h2>Test your integration</h2><p>Use the tool list while you develop. To prove that Chrome used WebMCP, record the <code>WebMCP.toolsAdded</code>, <code>WebMCP.toolInvoked</code>, and <code>WebMCP.toolResponded</code> events.</p>`);

const legacySecurityPage = docsPage("/docs/security/", "Keep control on your server.", "Mulder adds only the tools you choose. Your server checks each input and makes the API request.", `<h2 class="content-title">Security</h2><p class="lead">Mulder does not give your API key to the browser. The browser calls a Mulder route on your website. Your server checks the input and then calls your API.</p><h2>Four rules</h2><ol><li><strong>Choose each tool.</strong> An operation needs <code>x-webmcp-enabled: true</code>.</li><li><strong>Allow reads only.</strong> The build rejects enabled POST, PUT, PATCH, and DELETE operations.</li><li><strong>Check every input.</strong> Mulder rejects unknown, missing, invalid, and out-of-range values before it calls your API.</li><li><strong>Keep your access checks.</strong> Your API must still check what the current person can use.</li></ol><h2>Where the API key stays</h2>${code("Browser -> POST /__mulder/call/get_service_health\nServer checks the input\nServer adds the API key\nServer -> existing API", "credential-flow")}<p>Do not put API keys in the OpenAPI file, Mulder script, HTML, or tool description.</p><h2>What Mulder accepts</h2><p>Mulder accepts a small part of OpenAPI 3.1. It supports read-only GET operations with simple values in the path or query. It rejects request bodies, references, combined schemas, arrays, objects, header values, cookie values, and URL formats that it cannot preserve.</p><p>See the complete <a href="/docs/reference/#supported-subset">supported subset</a>.</p><h2>What Mulder does not prove</h2><ul><li>It cannot verify which browser agent made the call.</li><li>It does not replace your sign-in or access checks.</li><li>It does not make writes safe.</li><li>It does not support every OpenAPI feature.</li></ul><div class="callout warning">Mulder does not generate tools that change data. Keep POST, PUT, PATCH, and DELETE operations disabled.</div>`);

const legacyReference = docsPage("/docs/reference/", "Two functions connect Mulder to your Worker.", "Use these functions to add the page and tool routes.", `<h2 class="content-title">API reference</h2><h2>createWebMcpCompanion</h2>${code(`createWebMcpCompanion(options: {
  document: OpenApiDocument;
  renderPage: () => Response | Promise<Response>;
  dispatch: (request: Request, tool: GeneratedTool) => Response | Promise<Response>;
  basePath?: string;
  resultSelector?: string;
  maxInputBytes?: number;
}): WebMcpCompanion`, "reference-create")}<p>Reads the OpenAPI file once. It returns the tool list and a <code>handle</code> function for Mulder routes.</p><h3>Routes</h3><table><thead><tr><th>Route</th><th>Purpose</th></tr></thead><tbody><tr><td><code>GET /__mulder/</code></td><td>Return your page and add the Mulder script.</td></tr><tr><td><code>GET /__mulder/manifest</code></td><td>List the tools that a browser can find.</td></tr><tr><td><code>GET /__mulder/bootstrap.js</code></td><td>Add the tools to a supported browser.</td></tr><tr><td><code>POST /__mulder/call/:name</code></td><td>Check the input and call one tool.</td></tr></tbody></table><h2>injectWebMcpBootstrap</h2>${code("injectWebMcpBootstrap(response: Response, bootstrapPath: string): Response", "reference-inject")}<p>Adds the Mulder script to an HTML response with Cloudflare HTMLRewriter.</p><h2 id="supported-subset">Supported OpenAPI subset</h2><ul><li>OpenAPI 3.1.</li><li>GET operations that you enable.</li><li>Simple path and query values on an operation.</li><li>String, boolean, integer, and number schemas written in the operation.</li><li>Standard path and query URL formats.</li><li>JSON responses.</li></ul><h3>Rejected</h3><ul><li>Request bodies and methods that change data.</li><li>Header and cookie parameters.</li><li>Arrays, objects, references, and combined schemas.</li><li>URL formats and body formats that Mulder does not support.</li><li>Missing schemas and unmatched path templates.</li></ul><h2>What the package contains</h2><p>The package has no code dependencies at run time. It exports the two Mulder functions and their public types. It does not include the demo Worker, experiments, write experiment, or browser test code.</p>`);

const homeTrace = `<div class="trace-grid"><div><span class="trace-label">OPENAPI</span>${code(`get: {
  operationId: "get_service_health",
  "x-webmcp-enabled": true
}`, "home-openapi")}</div><div><span class="trace-label">BROWSER TOOL</span>${code(`get_service_health({
  service: "checkout-api",
  region: "us-east"
})`, "home-tool")}</div><div><span class="trace-label">EXISTING API</span>${code("GET /api/services/checkout-api?region=us-east", "home-request")}</div></div>`;

const home = `<div class="shell hero hero-current"><div class="eyebrow">OpenAPI to WebMCP</div><h1>Turn your existing API into <span>browser-native tools.</span></h1><p class="hero-copy">Mulder compiles selected OpenAPI operations into WebMCP tools. Your Worker keeps authentication, authorization, approval, and execution.</p><div class="actions"><a class="button" href="/docs/quickstart/">Build your first tool</a><a class="button secondary" href="#demo">See the complete flow</a></div><div class="proof-line"><span>One OpenAPI source</span><span>Fail-closed compilation</span><span>Your API keeps control</span></div>${homeTrace}</div>
<section class="section section-rule" id="connect"><div class="shell"><div class="section-head"><h2>One contract, two browser-facing adapters.</h2><p>Mulder generates the same names and input schemas for native WebMCP and remote MCP. Reads call your API normally. Writes must enter an approval-managed path.</p></div><div class="flow-compare"><div class="compare"><div class="compare-label">YOUR APP</div>${diagram("OpenAPI 3.1\n-> select operations\n-> generate tools")}</div><div class="compare good"><div class="compare-label">YOUR AUTHORITY</div>${diagram("authenticate user\n-> authorize request\n-> approve writes\n-> execute existing API")}</div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>See the real integration.</h2><p>The checked demo shows browser discovery and a tool call. The generated tool list is ordinary JSON you can inspect before opening a supported browser.</p></div><div class="demo-frame" id="demo"><div class="demo-bar"><i></i><i></i><i></i><span>Mulder’s checked browser proof</span></div><video controls muted playsinline preload="metadata" poster="/demo-poster.png" aria-label="Mulder product overview"><source src="/mulder-demo.mp4" type="video/mp4"></video></div><div class="actions section-actions"><a class="button secondary" href="/demo/manifest.json">Inspect the generated tool list</a><a class="button secondary" href="/docs/browser-support/">Check browser support</a></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Start with a question people already ask.</h2><p>Begin with a low-risk lookup. Add a write only when your application has an explicit approval flow.</p></div><div class="example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span></a>`).join("")}</div></div></section>
<section class="section"><div class="shell cta"><div><div class="eyebrow">Public preview</div><h2>Add Mulder without replacing your API.</h2><p>Compile one operation, inspect its tool definition, then prove it in a supported browser.</p></div><a class="button" href="/docs/quickstart/">Open the ten-minute guide</a></div></section>`;

const overview = docsPage("/docs/", "OpenAPI tools without giving up your API.", "Mulder compiles selected operations while your application keeps authority.", `<h2 class="content-title">Overview</h2><p class="lead">Mulder turns selected OpenAPI 3.1 operations into WebMCP tools. It generates descriptors and request construction; your application continues to own identity, policy, approval, execution, and result filtering.</p><h2>What Mulder does</h2><ul><li>Generates deterministic tool names and input schemas.</li><li>Rejects enabled operations it cannot preserve safely.</li><li>Publishes same-origin discovery and call routes.</li><li>Separates direct reads from approval-managed writes.</li></ul><h2>What stays in your app</h2><ul><li>Authentication and authorization.</li><li>Write approval and idempotency.</li><li>API credentials and cookies.</li><li>Business logic and response filtering.</li></ul><h2>Where it fits</h2>${diagram("Browser agent\n  -> Mulder tool route\n  -> validated input\n  -> your policy and API") }<div class="callout">Tool annotations describe risk. They do not grant authority.</div>`);

const quickstart = docsPage("/docs/quickstart/", "Your first browser tool in ten minutes.", "Install the checked preview package, enable one GET operation, and run your Worker.", `<h2 class="content-title">Quickstart</h2><p class="lead">This starts with one read-only tool named <code>get_service_health</code>. Your existing API implementation stays unchanged.</p><div class="callout warning"><strong>Public preview:</strong> The package is not yet published to npm. The downloaded archive is pinned and verified with SHA-256 before installation.</div><h2>1. Install the checked starter</h2><p>Set <code>MULDER_SITE</code> to this documentation origin, then run:</p>${code(quickstartInstall, "quickstart-install")}<h2>2. Enable one operation</h2>${code(optIn, "quickstart-opt-in")}<p>Mulder ignores operations without <code>x-webmcp-enabled: true</code> and stops the build when an enabled operation uses an unsupported feature.</p><h2>3. Add Mulder to the Worker</h2>${code(integration, "quickstart-integration")}<h2>4. Inspect the manifest</h2>${code('curl "$CONSUMER_ORIGIN/__mulder/manifest"', "quickstart-manifest")}<p>Confirm the list contains only the tools you intended to expose.</p><h2>5. Ask the browser</h2><div class="callout">Is checkout-api healthy in us-east?</div>${code('get_service_health({ service: "checkout-api", region: "us-east" })', "quickstart-call")}<p>Your API receives <code>GET /api/services/checkout-api?region=us-east</code>.</p><h2>Before production</h2><p>Read the <a href="/docs/security/">security guide</a>. Mulder validates shape and fidelity; it does not decide who may use your API.</p>`);

const securityPage = docsPage("/docs/security/", "Keep authority in your application.", "Mulder validates tool calls; your server authenticates, authorizes, approves, and executes them.", `<h2 class="content-title">Security</h2><p class="lead">The browser receives tool descriptions, not API credentials. Every call returns to your same-origin Worker, where your application applies its normal security policy.</p><h2>Authority boundaries</h2><ol><li><strong>Discovery.</strong> Only operations with <code>x-webmcp-enabled: true</code> become tools.</li><li><strong>Validation.</strong> Mulder rejects unknown, missing, invalid, and out-of-range input.</li><li><strong>Authentication.</strong> Your application identifies the current user or session.</li><li><strong>Authorization.</strong> Your application decides which resources that identity may access.</li><li><strong>Approval.</strong> A write also needs <code>x-webmcp-approval-required: true</code> and a <code>prepareWrite</code> implementation.</li><li><strong>Execution.</strong> Your existing API performs the operation and filters the result.</li></ol><h2>Reads and writes</h2>${diagram("GET -> validate -> authorize -> dispatch\nPOST or DELETE -> validate -> authorize -> prepareWrite -> approved execution") }<div class="callout warning">Annotations such as <code>readOnlyHint</code> and <code>destructiveHint</code> are hints, not authorization.</div><h2>Credential custody</h2><p>Keep API keys, cookies, capabilities, and approval secrets on the server or in the browser’s normal secure session. Do not place them in OpenAPI descriptions, HTML, tool results, or tool annotations.</p><h2>What Mulder does not prove</h2><ul><li>Which browser agent made a call.</li><li>That a signed-in user may access a requested resource.</li><li>That a write was approved by a person.</li><li>That an API response is safe to expose.</li></ul>`);

const reference = docsPage("/docs/reference/", "Public compiler and Worker APIs.", "Generate descriptors, build faithful requests, or add the complete companion to a Worker.", `<h2 class="content-title">API reference</h2><h2>generateTools</h2>${code("generateTools(document: OpenApiDocument): GeneratedTool[]", "reference-generate")}<p>Compiles explicitly enabled operations into deterministic descriptors. Unsupported enabled operations fail the build.</p><h2>buildRequest</h2>${code("buildRequest(tool: GeneratedTool, input: Record<string, unknown>, origin: string): Request", "reference-build")}<p>Validates input and constructs the path, query, and optional JSON body described by the operation.</p><h2>createWebMcpCompanion</h2>${code(`createWebMcpCompanion(options: {
  document: OpenApiDocument;
  renderPage: () => Response | Promise<Response>;
  dispatch: (request: Request, tool: GeneratedTool) => Response | Promise<Response>;
  prepareWrite?: (request: Request, tool: GeneratedTool, input: Record<string, unknown>) => Response | Promise<Response>;
  basePath?: string;
  resultSelector?: string;
  maxInputBytes?: number;
}): WebMcpCompanion`, "reference-create")}<p>Provides the page, manifest, bootstrap, and call routes. If any generated tool changes data, <code>prepareWrite</code> is required.</p><h3>Routes</h3><table><thead><tr><th>Route</th><th>Purpose</th></tr></thead><tbody><tr><td><code>GET /__mulder/</code></td><td>Return your page and add the bootstrap.</td></tr><tr><td><code>GET /__mulder/manifest</code></td><td>List browser-visible tools.</td></tr><tr><td><code>GET /__mulder/bootstrap.js</code></td><td>Register tools in a supported browser.</td></tr><tr><td><code>POST /__mulder/call/:name</code></td><td>Validate and route one call.</td></tr></tbody></table><h2>injectWebMcpBootstrap</h2>${code("injectWebMcpBootstrap(response: Response, bootstrapPath: string): Response", "reference-inject")}<h2 id="supported-subset">Supported OpenAPI subset</h2><ul><li>OpenAPI 3.1 with inline schemas.</li><li>Enabled GET operations with scalar path and query parameters.</li><li>Enabled POST operations with one <code>application/json</code> body.</li><li>Enabled DELETE operations without a body.</li><li>Bounded object and array schemas inside POST bodies.</li><li>String, boolean, integer, and number constraints.</li></ul><p>POST and DELETE require both <code>x-webmcp-enabled: true</code> and <code>x-webmcp-approval-required: true</code>.</p><h3>Rejected</h3><ul><li>PUT and PATCH.</li><li>Header and cookie parameters.</li><li>References, combined schemas, and undeclared object properties.</li><li>Unsupported URL styles, media types, and unmatched path templates.</li></ul>`);

const examplesIndex = `<div class="shell page-hero"><div class="eyebrow">Runnable examples</div><h1>Start with a question someone already asks.</h1><p>Each example connects one useful question to one GET request. The API remains normal application code.</p></div><section class="section"><div class="shell example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span><p>${item.operation}</p></a>`).join("")}</div></section><section class="section"><div class="shell cta"><div><h2>Build the smallest example first.</h2><p>The quickstart starts from an empty directory and one service-health lookup.</p></div><a class="button" href="/docs/quickstart/">Open quickstart</a></div></section>`;

function examplePage(item) {
  const operation = item.document.paths[Object.keys(item.document.paths)[0]].get;
  return `<div class="shell page-hero"><div class="eyebrow">${item.label} example</div><h1>${item.title}</h1><p>“${item.question}”</p></div><div class="shell docs-layout">${docsNav(`/examples/${item.slug}/`)}<article class="content"><h2 class="content-title">${item.toolName}</h2><p class="lead">The browser finds one tool on the website. The tool sends one request to the existing API.</p><h2>User request</h2><div class="callout">${item.question}</div><h2>Browser tool call</h2>${code(`${item.toolName}(${JSON.stringify(item.input, null, 2)})`, `${item.slug}-call`)}<h2>OpenAPI setting</h2>${code(JSON.stringify(operation, null, 2), `${item.slug}-openapi`)}<h2>Existing API request</h2>${code(item.operation, `${item.slug}-request`)}<h2>Why this is a fit</h2><p>This request only reads data. It uses simple values in the path or query. The website can check the current user’s access before the API returns data.</p><h2>What stays out</h2><p>The tool cannot change data. It does not create incidents, change inventory, update tickets, or edit metrics.</p><p><a href="/examples/">All examples</a></p></article></div>`;
}

const pageDefinitions = [
  ["/", "OpenAPI to browser-native tools", "Compile selected OpenAPI operations into WebMCP tools while your application keeps authority.", home],
  ["/docs/", "Overview", "Understand where Mulder fits and what stays unchanged.", overview],
  ["/docs/quickstart/", "Quickstart", "Build your first browser tool in ten minutes.", quickstart],
  ["/docs/browser-support/", "Browser support", "See which browsers can find and call Mulder tools.", browserSupport],
  ["/docs/security/", "Security", "Learn how validation, authentication, authorization, approval, and execution remain separated.", securityPage],
  ["/docs/reference/", "API reference", "Read the complete Mulder package and route reference.", reference],
  ["/examples/", "Examples", "Explore four API examples that you can run.", examplesIndex],
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
await cp(join(site, "src", "enhancements.css"), join(out, "enhancements.css"));
await cp(join(site, "src", "app.js"), join(out, "app.js"));
await cp(join(site, "src", "sw.js"), join(out, "sw.js"));
await cp(join(site, "assets", "icons"), join(out, "icons"), { recursive: true });
await cp(join(site, "assets", "social-card.jpg"), join(out, "social-card.jpg"));
await cp(video, join(out, "mulder-demo.mp4"));
await cp(poster, join(out, "demo-poster.png"));
await writeFile(join(out, "search-index.json"), JSON.stringify(pages));
await writeFile(join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map((page) => `<url><loc>${new URL(page.path, origin).href}</loc></url>`).join("")}</urlset>`);
await writeFile(join(out, "manifest.webmanifest"), JSON.stringify({ name: "Mulder", short_name: "Mulder", description: "Compile selected OpenAPI operations into browser-native tools.", id: "/", start_url: "/", scope: "/", display: "standalone", display_override: ["window-controls-overlay", "standalone", "minimal-ui"], background_color: "#f8f8f5", theme_color: "#f8f8f5", categories: ["developer", "productivity"], icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] }, null, 2));
await writeFile(join(out, "404.html"), layout({ path: "/404", title: "Not found", description: "This page does not exist.", body: '<div class="shell not-found"><div class="eyebrow">404</div><h1>The page is not out there.</h1><p><a class="button" href="/">Return home</a></p></div>' }));
const svgNamespace = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
await writeFile(join(out, "og.svg"), `<svg xmlns="${svgNamespace}" width="1200" height="630"><rect width="1200" height="630" fill="#f8f8f5"/><circle cx="950" cy="120" r="18" fill="#c9511f"/><text x="80" y="110" fill="#667080" font-family="monospace" font-size="26" letter-spacing="7">MULDER</text><text x="80" y="280" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">Your website already knows</text><text x="80" y="370" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">what it can do.</text><text x="80" y="480" fill="#111210" font-family="system-ui" font-weight="700" font-size="54">Let browser agents use it.</text></svg>`);
await mkdir(join(out, "downloads", "starter"), { recursive: true });
for (const file of ["package.json", "tsconfig.json", "wrangler.jsonc", "api.ts", "index.ts"]) await cp(join(site, "starter", file), join(out, "downloads", "starter", file));
await cp(tarball, join(out, "downloads", tarballName));
await writeFile(join(out, "downloads", `${tarballName}.sha256`), `${tarballSha256}  ${tarballName}\n`);
await mkdir(join(out, "demo"), { recursive: true });
await writeFile(join(out, "demo", "manifest.json"), JSON.stringify({ tools: [{ name: "get_service_health", description: "Get the health of one service in one region.", inputSchema: { type: "object", properties: { service: { type: "string" }, region: { type: "string" } }, required: ["service", "region"], additionalProperties: false }, annotations: { readOnlyHint: true, destructiveHint: false } }] }, null, 2));
console.log(`MULDER_SITE_BUILT:${pageDefinitions.length}:${basename(tarball)}`);
