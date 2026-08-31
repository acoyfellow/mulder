# Contributing

Mulder is an early public preview. Small fixes, documentation changes, and tests are welcome.

## Set up the project

```sh
bun install --frozen-lockfile
bun run check
```

Use Node.js 24 or later and the Bun version recorded in `bun.lock`.

## Make a change

Keep generated tools read-only. Do not add support for an OpenAPI feature unless Mulder can preserve its meaning exactly. Add a denial test for unsupported input and a success test for supported input.

Run these checks before you open a pull request:

```sh
bun run typecheck
bun test
bun run proof
bash proof/website-ready.sh
```

The complete browser checks require macOS, Chrome for Testing, Node.js, Bun, Wrangler, `sandbox-exec`, `lsof`, `curl`, and `openssl`. State which checks you could not run.

## Change the website

Edit files in `site/`. Keep sentences short. Use one term for each thing. Build and inspect both desktop and mobile layouts.

## Change the video

Edit the story in `video/src/story.ts`. Preview it with `bun run video:studio`. Do not add music, footage, fonts, or images without a license that permits public use.
