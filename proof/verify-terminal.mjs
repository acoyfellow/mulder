import { existsSync, readFileSync } from "node:fs";

const status = JSON.parse(readFileSync("status.json", "utf8"));
if (status.state !== "exhausted") throw new Error(`not exhausted: ${status.state}`);
const experiments = JSON.parse(readFileSync("experiments/status.json", "utf8"));
if (experiments.length !== 10) throw new Error(`expected 10 experiments, got ${experiments.length}`);
for (const experiment of experiments) {
  if (!["proven", "falsified", "partial", "blocked"].includes(experiment.state)) throw new Error(`${experiment.id} is ${experiment.state}`);
  if (!experiment.receipt || !existsSync(experiment.receipt)) throw new Error(`${experiment.id} has no receipt`);
  if (!experiment.verifier || !existsSync(experiment.verifier)) throw new Error(`${experiment.id} has no verifier`);
}
if ((status.notProven ?? []).length !== 0) throw new Error("unresolved unknowns remain");
console.log("MULDER_EXHAUSTED");
