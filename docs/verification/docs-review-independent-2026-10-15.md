# Independent documentation review — October 15, 2026

Freshly fetched main: `588e9c0097734f4e88efc4e45a46f6a5280ce064`.
Reviewed PR #12: `4e515635a6dcb9749e0621917635213441f303ff`.
App consumer inspected at main `4b7c1b0a440e6a88a76ba83d576c476edad0563d`.
The [earlier receipt](docs-review-2026-10-15.md) remains historical evidence;
its conclusions were checked against source and fresh execution.

## Findings and corrections

- **Material integration omission:** pricing's `cacheWrite` and energy's
  `cacheWrite` have different scopes. `src/pricing.ts` separates generic and
  TTL-specific cache writes under `cacheCreation`; `src/energy.ts` has one energy
  bucket. Passing a pricing event directly can silently omit all TTL writes.
  Document the explicit conversion in [the API contract](../api.md#energy).
  The app already maps `cacheCreationTokens` correctly in `footprint.server.ts`.
- **Missing evidence boundaries:** clarify in the pricing API that token-price
  estimates do not reconcile invoices or establish productivity, savings or ROI.
  The function accepts token counters and a rate artifact, with no evidence for
  those broader conclusions. This preserves the founder's spend-intelligence
  ambition without treating it as a capability of the calculation library.
- **Incomplete adoption description:** app server energy uses the package;
  carbon/water conversions and client calculations remain app-owned. The app's
  `footprint.server.test.ts` binds numerical compatibility. No deployed-runtime
  observation is claimed.
- **Identity/validation clarity:** the README table now distinguishes energy's
  method ID from its revision; the API notes accepted positive fractional energy
  counts, demonstrated by the existing retained boundary fixture.

No new clearly wrong/insecure runtime implementation was established. These are
documentation corrections, not changes to prices, entitlements, collection,
methodology or the business model. No hashed methods, artifacts, historical
receipts, package versions or runtime code changed.

## Reproduce

From the repository root, run:

```sh
npm run check
npm run test:published
node --test scripts/check-doc-links.test.mjs
node scripts/check-doc-links.mjs
```

The full gate passed on Linux, Node 24.21.0: 176 tests in seven files, typecheck,
documentation paths, ten byte-identical retained artifacts, and two isolated
installed consumers exercising all five exports, 32 energy cases and both
documented examples. The public 0.1.0 test passed with the same immutable tarball
SHA-256 as the earlier receipt. Thirteen link-checker cases passed. The final
local link/anchor check passed with no failures. Native Windows/macOS and the
optional Python comparison suite were not rerun locally.

To reproduce the omitted cache-write risk after `npm run build`, run this Node
module from the repository root (`node --input-type=module`, then the source):

```js
import { readFileSync } from "node:fs";
import { compileEnergyArtifact, replayEnergy } from "./dist/energy.js";
const artifact = compileEnergyArtifact(
  readFileSync("calculations/energy/parameters.v1.yaml", "utf8"),
);
const pricing = {
  input: 0, output: 0, cacheRead: 0, cacheCreation: 1000,
  cacheWrite: 0, cacheWrite5m: 1000, cacheWrite1h: 0,
};
const correct = replayEnergy(artifact, {
  ...pricing, cacheWrite: pricing.cacheCreation,
});
const wrong = replayEnergy(artifact, pricing);
console.log({ correct, wrong });
if (correct.value !== 0.00049 || wrong.value !== 0) {
  throw new Error("Unexpected retained arithmetic");
}
```

This synthetic probe passed: the correctly mapped central estimate is 0.00049
kWh; passing the generic subset yields zero. It demonstrates a documentation
hazard, not a defect in the app's existing mapping or independent energy accuracy.

## Remote and live evidence

Fresh PR inspection found all existing checks green and no human review comments.
The inline CodeQL comment on the earlier link checker was inspected separately:
alert 2's most recent PR instance is `fixed`; the current checker removes nested
tag fragments to a fixed point. A green workflow alone was not used to infer that.

Read-only GitHub API checks repeated the earlier release observation: calculations'
`npm` environment requires either `braydenyancy` or `alynes`, prevents self-review,
allows `v*` tags, and `NPM_PUBLISH_ENABLED` is `true`. CLI's environment has no
required reviewer. The extra calculations approval remains an owner decision;
the runbook correctly describes the live difference. No settings were changed.
The npm-side trusted-publisher configuration was not inspected.

[npm's primary trusted-publishing instructions](https://docs.npmjs.com/trusted-publishers/)
were fetched again: the workflow's Node 24 and npm >=11.5.1 meet its requirements,
and direct publishing permission is distinct from staging permission. No package
was published. Existing CI evidence belongs to the reviewed head; checks for the
correction commit must be read from its own PR run.
