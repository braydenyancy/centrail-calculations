import { readFileSync } from "node:fs";
import { loadPricingArtifact, replayPricing } from "@centrail/calculations/pricing";

const artifactPath = process.argv[2];
if (!artifactPath) {
  throw new Error("Usage: node examples/pricing.mjs <pricing-artifact.json>");
}

const artifact = loadPricingArtifact(readFileSync(artifactPath, "utf8"));
// Synthetic normalized usage; the supplied catalog remains subject to review.
const event = {
  provider: "openai",
  model: "chat-latest",
  input: 0,
  output: 0,
  cacheRead: 1,
  cacheCreation: 0,
  cacheWrite: 0,
  cacheWrite5m: 0,
  cacheWrite1h: 0,
  completeness: "complete",
};

console.log(JSON.stringify({
  status: "review-only-example",
  frozen: replayPricing(artifact, "token-rates-v1", [event, event]),
  live: replayPricing(artifact, "token-buckets-v3", [event, event]),
}, null, 2));
