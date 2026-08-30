# Experiment 09: Tool-count limits

Status: tested ceiling passed

## Question

How many generated native WebMCP tools can Chrome 151 discover and invoke reliably on one page?

## Method

Isolated pages register increasing counts of identical read-only tools. Each run requires discovery of the final tool, checks the exact discovered count, and invokes the first and final tools.

## Result rule

The experiment records the largest tested count that passes. It does not claim the browser's absolute maximum unless a larger run fails deterministically.

## Result

Chrome 151 natively discovered exact sets of 10, 100, 500, 1,000, and 2,000 generated tools. At every count, native calls to the first and final tool completed with the expected index and value.

The 2,000-tool run completed in about 11.1 seconds. No failure boundary was found.

## Product consequence

Tool registration count is not the immediate technical limit below 2,000. A useful interface should still avoid publishing thousands of choices because agent selection quality and metadata size were not measured here.

Receipt: `RESULT.json`

Screenshot: `native.png`

Verifier: `node experiments/09-tool-count-limits/verify.mjs`
