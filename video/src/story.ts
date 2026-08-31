export const story = {
  title: "Your website already has an API.",
  browserGap: ["Your OpenAPI file describes what it can do.", "The browser still sees only a page."],
  promise: "Mulder turns the operations you choose into browser tools.",
  choice: "You choose each tool.",
  question: "Is checkout-api healthy in us-east?",
  tool: "get_service_health",
  unchanged: ["Your existing API handled the request.", "Its code did not change."],
  boundaries: ["No separate MCP server.", "API keys stay on your server."],
  callToAction: "Give your website its first browser tool.",
  address: "mulder.coey.dev",
} as const;

export const timing = {
  title: [0, 120],
  browserGap: [108, 240],
  promise: [228, 360],
  choice: [348, 480],
  question: [468, 630],
  recording: [618, 810],
  unchanged: [798, 960],
  boundaries: [948, 1080],
  callToAction: [1068, 1200],
} as const;
