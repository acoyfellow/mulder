# Experiment 08: Specification drift

Status: proven locally

## Question

Can a live page add a replacement generated tool and remove the old tool when its OpenAPI contract changes?

## Hypothesis

Native WebMCP emits an addition for the replacement tool and a removal for the retired tool. A call through the retired descriptor fails after removal.

## Pass

- Chrome natively discovers version one.
- The same page registers and Chrome discovers version two.
- Both versions complete a native positive-control call before retirement.
- The page retires version one through its registration signal.
- Chrome emits native removal for version one.
- A later native call to version one fails.

## Result

One live page registered version one, then registered version two after a delay. Chrome emitted native additions for both tools. Both completed native positive-control calls with their distinct input schemas and outputs.

The page aborted version one's registration signal. Chrome emitted native removal for version one. A later native invocation of version one failed with `Tool not found`.

## Boundary

This proves explicit add and retire behavior. Mulder does not yet watch an OpenAPI URL, choose versioned names, or migrate in-flight calls automatically.

Receipt: `RESULT.json`

Screenshot: `native.png`

Verifier: `node experiments/08-specification-drift/verify.mjs`
