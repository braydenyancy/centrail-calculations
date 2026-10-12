import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { runInNewContext } from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { importLiteLLMPricing, replayPricing } from "../dist/pricing.js";
import { sha256 } from "../dist/documents.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const flags = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  assert.ok(["--python", "--langfuse", "--decimal", "--config", "--out"].includes(flag) && process.argv[index + 1] && !flags[flag], "Usage: npm run test:cost-comparisons -- --config configuration.json [--out receipt.json], or supply --python, --langfuse and --decimal");
  flags[flag] = resolve(process.argv[index + 1]);
}
if (!flags["--config"] && !["--python", "--langfuse", "--decimal"].some((flag) => flags[flag])) flags["--config"] = join(root, "artifacts", "cost-comparisons", "environment", "configuration.json");
flags["--out"] ??= join(root, "artifacts", "cost-comparisons", "report.json");
if (flags["--config"]) {
  const configuration = JSON.parse(readFileSync(flags["--config"], "utf8"));
  assert.deepEqual(Object.keys(configuration).sort(), ["--decimal", "--langfuse", "--python"]);
  for (const [flag, value] of Object.entries(configuration)) {
    assert.ok(typeof value === "string" && value && !flags[flag], "Configuration cannot override supplied flags");
    flags[flag] = resolve(value);
  }
}
for (const flag of ["--python", "--langfuse", "--decimal"]) assert.ok(flags[flag], `Missing ${flag}; competitors never silently skip`);
const pinnedCommit = "a27d317564faa31c0f069595aa4825d1fda880ec";
assert.equal(execFileSync("git", ["rev-parse", "HEAD"], { cwd: flags["--langfuse"], encoding: "utf8" }).trim(), pinnedCommit);
const sourcePath = join(flags["--langfuse"], "worker", "src", "services", "IngestionService", "index.ts");
const langfuseSource = readFileSync(sourcePath, "utf8");
assert.equal(sha256(langfuseSource), "ae759f5ad82514745340ed6d78ff47763de0b6e2e955b9b816445c5bd85f8e07", "Pinned Langfuse calculator source changed");
// Execute exact upstream method and dependency constants, stripping types only.
// This isolates the calculator, not Langfuse's DB ingestion/usage normalization.
const methodStart = langfuseSource.indexOf("  static calculateUsageCosts(");
const methodEnd = langfuseSource.indexOf("\n  private async getClickhouseRecord", methodStart);
const constantsStart = langfuseSource.indexOf("const TTL_CACHE_CREATION_USAGE_TYPES =");
const constantsEnd = langfuseSource.indexOf("\n\nconst immutableEntityKeys", constantsStart);
assert.ok(methodStart >= 0 && methodEnd > methodStart && constantsStart >= 0 && constantsEnd > constantsStart);
assert.equal(sha256(readFileSync(flags["--decimal"], "utf8")), "45e6ecc0a500fee6439acdf67ee2e9322aab57e6ea0409ef52993dedbba8cf19", "Pinned Decimal implementation changed");
const { default: Decimal } = await import(pathToFileURL(flags["--decimal"]).href);
const decimalPackage = JSON.parse(readFileSync(new URL("./package.json", pathToFileURL(flags["--decimal"])), "utf8"));
assert.equal(decimalPackage.version, "10.6.0");
const isolated = `${langfuseSource.slice(constantsStart, constantsEnd)}\nclass IngestionService {\n${langfuseSource.slice(methodStart, methodEnd)}\n}\nIngestionService;`;
const IngestionService = runInNewContext(stripTypeScriptTypes(isolated), { Decimal }, { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });

const fixtureBytes = readFileSync(join(root, "tests", "fixtures", "cost-comparisons.synthetic.json"), "utf8");
const cases = JSON.parse(fixtureBytes);
assert.equal(cases.length, 7);
const environment = {};
for (const key of Object.keys(process.env)) if (/^(?:PATH|SystemRoot|windir|ComSpec|PATHEXT|TEMP|TMP|TMPDIR)$/i.test(key)) environment[key] = process.env[key];
environment.LITELLM_LOCAL_MODEL_COST_MAP = "True";
const isolatedDirectory = mkdtempSync(join(tmpdir(), "centrail offline calculator "));
const isolatedCwd = join(isolatedDirectory, "consumer");
mkdirSync(isolatedCwd);
environment.HOME = isolatedDirectory;
environment.USERPROFILE = isolatedDirectory;
environment.CENTRAIL_TEST_DOTENV_PATH = join(isolatedDirectory, ".env");
writeFileSync(environment.CENTRAIL_TEST_DOTENV_PATH, "OPENAI_API_KEY=synthetic-parent-env-sentinel\n");
let litellm;
try {
  litellm = JSON.parse(execFileSync(flags["--python"], [join(root, "scripts", "comparison-litellm.py")], {
    cwd: isolatedCwd, input: JSON.stringify(cases), env: environment, encoding: "utf8", timeout: 120_000, stdio: ["pipe", "pipe", "pipe"],
  }));
} finally {
  rmSync(isolatedDirectory, { recursive: true, force: true });
}
assert.equal(litellm.networkAttempts, 0);
assert.equal(litellm.parentDotenvNotLoaded, true);
const rows = [];
for (const item of cases) {
  const source = JSON.stringify(item.source ? { [item.model]: item.source } : {});
  const artifact = importLiteLLMPricing(source, { asOf: "2026-10-12", source: { id: "generated-comparison", revision: "0".repeat(40), sha256: sha256(source), retainedAt: "generated", license: "Apache-2.0", notice: "Invented numerical test rates; zero revision is a synthetic test sentinel, not an upstream commit or provider price" } });
  const event = { ...item.usage, provider: item.provider, model: item.model, cacheCreation: item.usage.cacheWrite5m + item.usage.cacheWrite1h, cacheWrite: 0, completeness: "complete" };
  const centrail = replayPricing(artifact, "token-buckets-v3", [event]);
  const frozen = replayPricing(artifact, "token-rates-v1", [event]);
  const mappings = { input: "input_cost_per_token", output: "output_cost_per_token", input_cached: "cache_read_input_token_cost", input_cache_creation_5m: "cache_creation_input_token_cost", input_cache_creation_1h: "cache_creation_input_token_cost_above_1hr" };
  const prices = Object.entries(mappings).filter(([, field]) => item.source?.[field] != null).map(([usageType, field]) => ({ usageType, price: new Decimal(item.source[field]) }));
  const langfuse = IngestionService.calculateUsageCosts(prices, {}, { input: item.usage.input, output: item.usage.output, input_cached: item.usage.cacheRead, input_cache_creation_5m: item.usage.cacheWrite5m, input_cache_creation_1h: item.usage.cacheWrite1h });
  const competitor = litellm.results.find((result) => result.id === item.id);
  assert.ok(competitor);
  if (item.comparable) {
    assert.equal(competitor.error, undefined, `${item.id}: LiteLLM calculator rejected comparable case`);
    for (const [name, value] of [["LiteLLM", competitor.usd], ["Langfuse", langfuse.total_cost]]) assert.ok(Number.isFinite(value) && Math.abs(value - centrail.usd) <= 1e-12, `${item.id}: ${name} ${value} versus Centrail ${centrail.usd}`);
  } else if (item.id === "unknown-model") {
    assert.equal(centrail.coverage, "unpriced");
    assert.equal(competitor.error, "ModelNotMappedError", "Unknown-model comparison requires a genuine model-mapping error");
    assert.equal(langfuse.total_cost, undefined);
  } else {
    assert.equal(centrail.coverage, "partial");
    assert.ok(Number.isFinite(competitor.usd), "Missing-rate behavior must be observable");
    assert.ok(Math.abs(competitor.usd - 0.0001) <= 1e-12, "LiteLLM missing cache rate falls back to its base input rate");
    assert.ok(Math.abs(langfuse.total_cost - centrail.usd) <= 1e-12);
  }
  rows.push({ id: item.id, comparable: item.comparable, centrail, frozenUsd: frozen.usdExact, litellm: competitor, langfuse });
}
assert.equal(rows.find((row) => row.id === "rounding").frozenUsd, "0.000001");
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), cases: cases.length, comparable: cases.filter((item) => item.comparable).length, toleranceUsd: 1e-12,
  fixturesSha256: sha256(fixtureBytes), fixtures: cases, competitors: { litellm: { version: litellm.version, function: "completion_cost", networkDisabled: true, networkAttempts: litellm.networkAttempts, parentDotenvNotLoaded: litellm.parentDotenvNotLoaded }, langfuse: { commit: pinnedCommit, sourceSha256: sha256(langfuseSource), methodSha256: sha256(langfuseSource.slice(methodStart, methodEnd)), function: "IngestionService.calculateUsageCosts", scope: "Exact isolated source method; excludes normalization, model matching, tier selection and DB ingestion", decimalVersion: decimalPackage.version } }, rows };
mkdirSync(dirname(flags["--out"]), { recursive: true });
writeFileSync(flags["--out"], `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
