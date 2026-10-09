import { readFileSync } from "node:fs";
import { compileEnergyArtifact, replayEnergy } from "@centrail/calculations/energy";

const parameterPath = process.argv[2];
if (!parameterPath) {
  throw new Error("Usage: node examples/energy.mjs <parameters.v1.yaml>");
}

const artifact = compileEnergyArtifact(readFileSync(parameterPath, "utf8"));
// Synthetic usage; an omitted model exercises the retained default factor.
const estimate = replayEnergy(artifact, {
  input: 1_000,
  output: 250,
  cacheRead: 500,
  cacheWrite: 0,
});

console.log(JSON.stringify({
  methodId: artifact.parameters.methodId,
  methodRevision: artifact.parameters.methodRevision,
  parameterRevision: artifact.parameterRevision,
  unit: "kWh",
  rangeMeaning: "scenario-bounds",
  estimate,
}, null, 2));
