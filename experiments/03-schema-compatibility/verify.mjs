import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const result = JSON.parse(readFileSync("experiments/03-schema-compatibility/RESULT.json", "utf8"));
if (result.browser !== "Chrome/151.0.7922.34") throw new Error("browser mismatch");
if (result.cases.length !== 10) throw new Error("schema corpus incomplete");
for (const item of result.cases) {
  if (!item.registered || !item.discovered || !item.invoked || item.status !== "Completed") throw new Error(`${item.label} lacks native evidence`);
}
if (result.invalidInputChecks.length !== 4) throw new Error("invalid input controls incomplete");
if (result.invalidInputChecks.some((item) => item.rejected || item.status !== "Completed")) throw new Error("browser validation result changed");
if (result.validationVerdict !== "chrome-does-not-enforce-all-tested-constraints") throw new Error("validation verdict mismatch");
const bytes = readFileSync("experiments/03-schema-compatibility/native.png");
const digest = createHash("sha256").update(bytes).digest("hex");
if (result.screenshot?.sha256 !== digest) throw new Error("screenshot mismatch");
console.log("MULDER_SCHEMA_COMPATIBILITY_OK");
