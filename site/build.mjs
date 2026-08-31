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
const code = (value, id = `code-${Math.random().toString(36).slice(2)}`) => `<div class="code-block"><span class="code-language">Code</span><button class="copy" data-copy="${id}" aria-label="Copy code">Copy</button><pre tabindex="0"><code id="${id}">${highlightCode(value)}</code></pre></div>`;
const diagram = (value) => `<div class="code-block diagram"><pre tabindex="0"><code>${escapeHtml(value.trim())}</code></pre></div>`;
const current = (path, target) => path === target || (target !== "/" && path.startsWith(target)) ? ' aria-current="page"' : "";

function header(path) {
  return `<a class="skip" href="#content">Skip to content</a><header class="site-header"><div class="shell header-inner"><a class="brand" href="/"><i></i>Mulder</a><button class="menu-button" data-menu aria-expanded="false" aria-label="Open navigation">Menu</button><nav class="nav" data-navigation aria-label="Main navigation"><a href="/docs/"${current(path, "/docs/")}>Docs</a><a href="/examples/"${current(path, "/examples/")}>Examples</a><a href="/docs/security/"${current(path, "/docs/security/")}>Security</a><a href="/docs/reference/"${current(path, "/docs/reference/")}>Reference</a></nav><button class="search-button" data-search-open aria-label="Search documentation">⌕ <span>Search</span> <kbd>⌘K</kbd></button></div></header>`;
}

const footer = `<footer class="site-footer"><div class="shell footer-inner"><span>Mulder 0.1 · Local beta</span><div class="footer-links"><a href="/docs/browser-support/">Browser support</a><a href="/docs/security/">Security</a><a href="/docs/reference/">Reference</a></div></div></footer>`;
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

const home = `<div class="shell hero"><div class="eyebrow">Tools for the website you already run</div><h1>Your website already knows what it can do. <span>Let browser agents use it.</span></h1><p class="hero-copy">Mulder lets a browser agent use selected read-only parts of your API. Your existing API still handles each request. You do not need a separate MCP service.</p><div class="actions"><a class="button" href="/docs/quickstart/">Build your first tool</a><a class="button secondary" href="#demo">Watch the real call</a></div><div class="proof-line"><span>Existing API stays unchanged</span><span>You choose each read-only tool</span><span>API keys stay on your server</span></div><div class="demo-frame" id="demo"><div class="demo-bar"><i></i><i></i><i></i><span>Recorded result. The Chrome proof is checked separately.</span></div><video controls muted playsinline preload="none" poster="/demo-poster.svg" aria-label="Verified Mulder browser demo"><source src="/mulder-demo.mp4" type="video/mp4"></video></div></div>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>No extra MCP server to build.</h2><p>Some tools turn an OpenAPI file into a separate MCP server. Mulder adds selected tools to your website instead. A supported browser finds them when a person opens the page.</p></div><div class="flow-compare"><div class="compare"><div class="compare-label">TRADITIONAL</div>${diagram("OpenAPI -> build an MCP server\n-> deploy that server\n-> set up each agent")}</div><div class="compare good"><div class="compare-label">MULDER</div>${diagram("Existing website + OpenAPI\n-> choose safe GET operations\n-> browser finds the tools")}</div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Your website stays in control.</h2><p>Mulder does not replace your API. It adds only the tools you choose. It checks each input before your API receives a request. Your API keys stay on your server.</p></div><div class="cards"><a class="card" href="/docs/quickstart/"><span class="card-number">01</span><h3>Use your current API</h3><p>Your existing API continues to handle each request.</p></a><a class="card" href="/docs/browser-support/"><span class="card-number">02</span><h3>Skip agent setup</h3><p>A supported browser finds tools on the current page.</p></a><a class="card" href="/docs/security/"><span class="card-number">03</span><h3>Keep API keys private</h3><p>The browser calls your website. Your server calls the API.</p></a></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>From API description to browser call.</h2><p>Mulder reads your OpenAPI file and adds only the operations it can preserve. The build stops when an enabled operation uses an unsupported feature.</p></div><div class="steps"><div class="step"><b>01</b><h3>Read the file</h3><p>Mulder reads your OpenAPI 3.1 file.</p></div><div class="step"><b>02</b><h3>Choose a GET</h3><p>You enable each read-only operation yourself.</p></div><div class="step"><b>03</b><h3>Add the tools</h3><p>Your website tells the browser which tools exist.</p></div><div class="step"><b>04</b><h3>Call your API</h3><p>Your server checks the input and calls your current API.</p></div></div></div></section>
<section class="section section-rule"><div class="shell"><div class="section-head"><h2>Start with a question people already ask.</h2><p>Each example uses a read-only API request. Each example runs against normal application code.</p></div><div class="example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span></a>`).join("")}</div></div></section>
<section class="section"><div class="shell cta"><div><div class="eyebrow">Private beta</div><h2>Give your website its first browser tool.</h2><p>Start with one safe GET request. Keep the rest of your API unchanged.</p></div><a class="button" href="/docs/quickstart/">Open the ten-minute guide</a></div></section>`;

const overview = docsPage("/docs/", "Let browser agents use your website.", "Mulder adds selected read-only API tools to a supported browser.", `<h1>Overview</h1><p class="lead">Mulder is for teams that have a website, an API, and an OpenAPI file. It lets a browser agent use selected API operations from the website. You do not have to deploy a separate MCP server.</p><h2>What changes</h2><p>You add Mulder routes to your Worker. You then enable each OpenAPI operation with <code>x-webmcp-enabled: true</code>. A supported browser finds those tools when the person opens the page.</p><h2>What does not change</h2><ul><li>Your API implementation.</li><li>Your authentication and authorization rules.</li><li>Your business logic.</li><li>Your normal website routes.</li></ul><h2>Where Mulder fits</h2>${code("Browser agent\n    -> website tool\nMulder route\n    -> checked request\nExisting API", "fit-flow")}<div class="callout">OpenAPI describes the tools. The browser is the useful difference. It finds the tools on the website that the person already uses.</div><h2>Start small</h2><p>Choose one low-risk lookup. Complete the <a href="/docs/quickstart/">quickstart</a>. Read the <a href="/docs/security/">security guide</a> before you add another operation.</p>`);

const quickstart = docsPage("/docs/quickstart/", "Your first browser tool in ten minutes.", "Download the package, enable one GET operation, and run your Worker.", `<h1>Quickstart</h1><p class="lead">This guide starts in an empty directory. It creates one tool named <code>get_service_health</code>. The existing API code does not change.</p><div class="callout warning"><strong>Local beta:</strong> Download the checked package file from this documentation site.</div><h2>1. Download the starter</h2><p>Set <code>MULDER_SITE</code> to the address of this documentation site, then run:</p>${code(quickstartInstall, "quickstart-install")}<p>Set <code>CONSUMER_ORIGIN</code> to the local Wrangler address on port 8896. Open <code>$CONSUMER_ORIGIN/__mulder/</code> after Wrangler starts.</p><h2>2. Choose one operation</h2><p>The starter’s OpenAPI document has one approved read-only operation:</p>${code(optIn, "quickstart-opt-in")}<p>Mulder ignores an operation unless you set <code>x-webmcp-enabled: true</code>. The build stops if the operation uses a feature that Mulder does not support.</p><h2>3. Add Mulder to the Worker</h2>${code(integration, "quickstart-integration")}<p><code>companion.handle</code> handles the Mulder page and tool routes. All other requests continue to your existing API.</p><h2>4. Check the tool list</h2>${code('curl "$CONSUMER_ORIGIN/__mulder/manifest"', "quickstart-manifest")}<p>This command lists the tools that the browser can find. The list contains only <code>get_service_health</code>. The tool accepts a service and region. It cannot change data.</p><h2>5. Make the browser call</h2><p>Open the Mulder page in a Chrome build that supports WebMCP. Ask the browser agent:</p><div class="callout">Is checkout-api healthy in us-east?</div><p>The browser calls this tool:</p>${code('get_service_health({ service: "checkout-api", region: "us-east" })', "quickstart-call")}<p>The unchanged API receives <code>GET /api/services/checkout-api?region=us-east</code>.</p><h2>6. Add your API</h2><p>Replace the starter OpenAPI object and <code>existingApi</code> function with the versions from your application. Keep the Mulder setup the same.</p><h2>Before production</h2><p>Read the <a href="/docs/security/">security guide</a>. Mulder does not decide who can use your API. Your application must continue to check each user’s access. The browser also does not give Mulder a verified agent identity.</p>`);

const browserSupport = docsPage("/docs/browser-support/", "Browser support is early.", "Mulder uses WebMCP to add tools to a website. Most browsers do not support these tools yet.", `<h1>Browser support</h1><p class="lead">The checked proof uses Chrome for Testing 151. A browser without WebMCP can show the Mulder page. It cannot find or call the tools.</p><h2>Checked today</h2><table><thead><tr><th>Browser</th><th>Shows the page</th><th>Finds WebMCP tools</th></tr></thead><tbody><tr><td>Chrome for Testing 151</td><td>Yes</td><td>Verified</td></tr><tr><td>cmux WKWebView</td><td>Yes</td><td>No</td></tr><tr><td>Standard browser without WebMCP</td><td>Yes</td><td>Unavailable</td></tr></tbody></table><h2>What happens in other browsers</h2><p>The page remains a normal HTML page. Mulder loads a script from the same website. If <code>navigator.modelContext</code> is not available, Mulder does not add the tools. The rest of your website continues to work.</p><h2>What the demo proves</h2><p>The video shows the page before and after a call. A separate Chrome record proves that the browser found and called the tool. The video alone does not prove this.</p><h2>Test your integration</h2><p>Use the tool list while you develop. To prove that Chrome used WebMCP, record the <code>WebMCP.toolsAdded</code>, <code>WebMCP.toolInvoked</code>, and <code>WebMCP.toolResponded</code> events.</p>`);

const securityPage = docsPage("/docs/security/", "Keep control on your server.", "Mulder adds only the tools you choose. Your server checks each input and makes the API request.", `<h1>Security</h1><p class="lead">Mulder does not give your API key to the browser. The browser calls a Mulder route on your website. Your server checks the input and then calls your API.</p><h2>Four rules</h2><ol><li><strong>Choose each tool.</strong> An operation needs <code>x-webmcp-enabled: true</code>.</li><li><strong>Allow reads only.</strong> The build rejects enabled POST, PUT, PATCH, and DELETE operations.</li><li><strong>Check every input.</strong> Mulder rejects unknown, missing, invalid, and out-of-range values before it calls your API.</li><li><strong>Keep your access checks.</strong> Your API must still check what the current person can use.</li></ol><h2>Where the API key stays</h2>${code("Browser -> POST /__mulder/call/get_service_health\nServer checks the input\nServer adds the API key\nServer -> existing API", "credential-flow")}<p>Do not put API keys in the OpenAPI file, Mulder script, HTML, or tool description.</p><h2>What Mulder accepts</h2><p>Mulder accepts a small part of OpenAPI 3.1. It supports read-only GET operations with simple values in the path or query. It rejects request bodies, references, combined schemas, arrays, objects, header values, cookie values, and URL formats that it cannot preserve.</p><p>See the complete <a href="/docs/reference/#supported-subset">supported subset</a>.</p><h2>What Mulder does not prove</h2><ul><li>It cannot verify which browser agent made the call.</li><li>It does not replace your sign-in or access checks.</li><li>It does not make writes safe.</li><li>It does not support every OpenAPI feature.</li></ul><div class="callout warning">Mulder does not generate tools that change data. Keep POST, PUT, PATCH, and DELETE operations disabled.</div>`);

const reference = docsPage("/docs/reference/", "Two functions connect Mulder to your Worker.", "Use these functions to add the page and tool routes.", `<h1>API reference</h1><h2>createWebMcpCompanion</h2>${code(`createWebMcpCompanion(options: {
  document: OpenApiDocument;
  renderPage: () => Response | Promise<Response>;
  dispatch: (request: Request, tool: GeneratedTool) => Response | Promise<Response>;
  basePath?: string;
  resultSelector?: string;
  maxInputBytes?: number;
}): WebMcpCompanion`, "reference-create")}<p>Reads the OpenAPI file once. It returns the tool list and a <code>handle</code> function for Mulder routes.</p><h3>Routes</h3><table><thead><tr><th>Route</th><th>Purpose</th></tr></thead><tbody><tr><td><code>GET /__mulder/</code></td><td>Return your page and add the Mulder script.</td></tr><tr><td><code>GET /__mulder/manifest</code></td><td>List the tools that a browser can find.</td></tr><tr><td><code>GET /__mulder/bootstrap.js</code></td><td>Add the tools to a supported browser.</td></tr><tr><td><code>POST /__mulder/call/:name</code></td><td>Check the input and call one tool.</td></tr></tbody></table><h2>injectWebMcpBootstrap</h2>${code("injectWebMcpBootstrap(response: Response, bootstrapPath: string): Response", "reference-inject")}<p>Adds the Mulder script to an HTML response with Cloudflare HTMLRewriter.</p><h2 id="supported-subset">Supported OpenAPI subset</h2><ul><li>OpenAPI 3.1.</li><li>GET operations that you enable.</li><li>Simple path and query values on an operation.</li><li>String, boolean, integer, and number schemas written in the operation.</li><li>Standard path and query URL formats.</li><li>JSON responses.</li></ul><h3>Rejected</h3><ul><li>Request bodies and methods that change data.</li><li>Header and cookie parameters.</li><li>Arrays, objects, references, and combined schemas.</li><li>URL formats and body formats that Mulder does not support.</li><li>Missing schemas and unmatched path templates.</li></ul><h2>What the package contains</h2><p>The package has no code dependencies at run time. It exports the two Mulder functions and their public types. It does not include the demo Worker, experiments, write experiment, or browser test code.</p>`);

const examplesIndex = `<div class="shell page-hero"><div class="eyebrow">Runnable examples</div><h1>Start with a question someone already asks.</h1><p>Each example connects one useful question to one GET request. The API remains normal application code.</p></div><section class="section"><div class="shell example-grid">${examples.map((item) => `<a class="example-card" href="/examples/${item.slug}/"><span class="tag">${item.label}</span><h3>${item.title}</h3><blockquote>“${item.question}”</blockquote><span class="tool">${item.toolName}(…)</span><p>${item.operation}</p></a>`).join("")}</div></section><section class="section"><div class="shell cta"><div><h2>Build the smallest example first.</h2><p>The quickstart starts from an empty directory and one service-health lookup.</p></div><a class="button" href="/docs/quickstart/">Open quickstart</a></div></section>`;

function examplePage(item) {
  const operation = item.document.paths[Object.keys(item.document.paths)[0]].get;
  return `<div class="shell page-hero"><div class="eyebrow">${item.label} example</div><h1>${item.title}</h1><p>“${item.question}”</p></div><div class="shell docs-layout">${docsNav(`/examples/${item.slug}/`)}<article class="content"><h1>${item.toolName}</h1><p class="lead">The browser finds one tool on the website. The tool sends one request to the existing API.</p><h2>User request</h2><div class="callout">${item.question}</div><h2>Browser tool call</h2>${code(`${item.toolName}(${JSON.stringify(item.input, null, 2)})`, `${item.slug}-call`)}<h2>OpenAPI setting</h2>${code(JSON.stringify(operation, null, 2), `${item.slug}-openapi`)}<h2>Existing API request</h2>${code(item.operation, `${item.slug}-request`)}<h2>Why this is a fit</h2><p>This request only reads data. It uses simple values in the path or query. The website can check the current user’s access before the API returns data.</p><h2>What stays out</h2><p>The tool cannot change data. It does not create incidents, change inventory, update tickets, or edit metrics.</p><p><a href="/examples/">All examples</a></p></article></div>`;
}

const pageDefinitions = [
  ["/", "Browser tools for your existing API", "Let a browser agent use selected read-only API operations without another MCP server.", home],
  ["/docs/", "Overview", "Understand where Mulder fits and what stays unchanged.", overview],
  ["/docs/quickstart/", "Quickstart", "Build your first browser tool in ten minutes.", quickstart],
  ["/docs/browser-support/", "Browser support", "See which browsers can find and call Mulder tools.", browserSupport],
  ["/docs/security/", "Security", "Learn where API keys stay, how input checks work, and what Mulder does not support.", securityPage],
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
await cp(join(site, "src", "app.js"), join(out, "app.js"));
await cp(video, join(out, "mulder-demo.mp4"));
await writeFile(join(out, "search-index.json"), JSON.stringify(pages));
await writeFile(join(out, "robots.txt"), "User-agent: *\nAllow: /\n");
await writeFile(join(out, "404.html"), layout({ path: "/404", title: "Not found", description: "This page does not exist.", body: '<div class="shell not-found"><div class="eyebrow">404</div><h1>The page is not out there.</h1><p><a class="button" href="/">Return home</a></p></div>' }));
const svgNamespace = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
await writeFile(join(out, "og.svg"), `<svg xmlns="${svgNamespace}" width="1200" height="630"><rect width="1200" height="630" fill="#f8f8f5"/><circle cx="950" cy="120" r="18" fill="#c9511f"/><text x="80" y="110" fill="#667080" font-family="monospace" font-size="26" letter-spacing="7">MULDER</text><text x="80" y="280" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">Your website already knows</text><text x="80" y="370" fill="#111210" font-family="system-ui" font-weight="700" font-size="70">what it can do.</text><text x="80" y="480" fill="#111210" font-family="system-ui" font-weight="700" font-size="54">Let browser agents use it.</text></svg>`);
await writeFile(join(out, "demo-poster.svg"), `<svg xmlns="${svgNamespace}" width="1280" height="580"><rect width="1280" height="580" fill="#f8f8f5"/><text x="90" y="90" fill="#667080" font-family="monospace" font-size="18">OPENAPI FOR A BROWSER TOOL</text><text x="90" y="215" fill="#111210" font-family="system-ui" font-weight="700" font-size="66">Your API already has an</text><text x="90" y="300" fill="#111210" font-family="system-ui" font-weight="700" font-size="66">agent interface.</text><rect x="90" y="370" width="1100" height="120" rx="8" fill="#111210"/><text x="125" y="440" fill="#f8f8f5" font-family="monospace" font-size="24">Watch the verified browser call</text></svg>`);
await mkdir(join(out, "downloads", "starter"), { recursive: true });
for (const file of ["package.json", "tsconfig.json", "wrangler.jsonc", "api.ts", "index.ts"]) await cp(join(site, "starter", file), join(out, "downloads", "starter", file));
if (!tarball) throw new Error("MULDER_TARBALL is required");
await cp(tarball, join(out, "downloads", "mulder-0.1.0.tgz"));
console.log(`MULDER_SITE_BUILT:${pageDefinitions.length}:${basename(tarball)}`);
