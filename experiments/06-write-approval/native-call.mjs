import { writeFileSync } from "node:fs";

const browserPath = process.env.BROWSER_PATH;
const modulePath = process.env.WEBMCP_PROOF_MODULE;
const outputPath = process.env.OUTPUT_PATH;
if (!browserPath || !modulePath || !outputPath) throw new Error("BROWSER_PATH, WEBMCP_PROOF_MODULE, and OUTPUT_PATH are required");
const { runWebMcpProof } = await import(modulePath);
const options = {
  browserPath,
  url: "http://127.0.0.1:8891/experiments/approval",
  requiredToolNames: ["create_case_file"],
  calls: [{ toolName: "create_case_file", input: { title: "Project Mulder", classification: "secret" } }],
  inspectExpression: `document.querySelector('#approval-result')?.textContent`,
};
if (process.env.SCREENSHOT_PATH) options.screenshotPath = process.env.SCREENSHOT_PATH;
const receipt = await runWebMcpProof(options);
if (receipt.screenshot) receipt.screenshot.path = process.env.SCREENSHOT_PATH;
writeFileSync(outputPath, JSON.stringify(receipt));
