import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// This is an explicit network check of one immutable historical publication.
const root = fileURLToPath(new URL("../", import.meta.url));
const name = "@centrail/calculations";
const version = "0.1.0";
const registry = "https://registry.npmjs.org";
const expectedSha256 = "ee7c8f3e90a7f586e7e0cdf1e9916793d334522bdb0b0c19f38034dae930356e";
const npmCli = process.env.npm_execpath;
if (!npmCli || /\.(?:cmd|bat)$/i.test(npmCli)) throw new Error("Run through npm run test:published.");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--out" || !args[1])) throw new Error("Usage: npm run test:published -- [--out receipt.json]");
const output = args[1] ? resolve(args[1]) : undefined;
const temporary = mkdtempSync(join(tmpdir(), "centrail public registry consumer "));
const environment = {};
// The consumer never inherits HOME, npm credentials, npm config or Node injection.
for (const key of Object.keys(process.env)) {
  if (/^(?:PATH|SystemRoot|windir|ComSpec|PATHEXT|TEMP|TMP|TMPDIR)$/i.test(key)) environment[key] = process.env[key];
}
environment.HOME = temporary;
environment.USERPROFILE = temporary;
const fetchBytes = async (url) => {
  assert.equal(new URL(url).origin, registry, "Only the public npm registry may be fetched");
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `Registry response for ${url}`);
  return Buffer.from(await response.arrayBuffer());
};
const run = (args, cwd) => execFileSync(process.execPath, args, {
  cwd, env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120_000,
});
const hash = (algorithm, bytes, encoding = "hex") => createHash(algorithm).update(bytes).digest(encoding);
const filesUnder = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  assert.equal(entry.isSymbolicLink(), false, `Unexpected installed symlink: ${path}`);
  return entry.isDirectory() ? filesUnder(path) : [path];
});

try {
  run([join(root, "scripts", "build.mjs")], root);
  const fetchedAt = new Date().toISOString();
  const metadata = JSON.parse(await fetchBytes(`${registry}/@centrail%2fcalculations/${version}`));
  assert.equal(metadata.name, name);
  assert.equal(metadata.version, version);
  const tarball = await fetchBytes(metadata.dist.tarball);
  const checksums = { sha1: hash("sha1", tarball), sha256: hash("sha256", tarball), integrity: `sha512-${hash("sha512", tarball, "base64")}` };
  assert.equal(checksums.sha1, metadata.dist.shasum);
  assert.equal(checksums.integrity, metadata.dist.integrity);
  assert.equal(checksums.sha256, expectedSha256, "Published bytes differ from the retained 0.1.0 receipt");
  const consumer = join(temporary, "consumer");
  mkdirSync(join(consumer, "fixtures"), { recursive: true });
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "centrail-published-consumer", private: true, type: "module" }));
  for (const config of ["user.npmrc", "global.npmrc"]) writeFileSync(join(temporary, config), "");
  run([npmCli, "install", `${name}@${version}`, "--ignore-scripts", "--no-audit", "--no-fund", "--registry", registry,
    "--cache", join(temporary, "cache"), "--userconfig", join(temporary, "user.npmrc"), "--globalconfig", join(temporary, "global.npmrc"),
    "--fetch-retries=0", "--fetch-timeout=30000"], consumer);
  const installed = join(consumer, "node_modules", "@centrail", "calculations");
  assert.equal(lstatSync(installed).isSymbolicLink(), false);
  const lock = JSON.parse(readFileSync(join(consumer, "package-lock.json"), "utf8"));
  const installedLock = lock.packages["node_modules/@centrail/calculations"];
  assert.equal(Object.keys(lock.packages).length, 2, "Published package must have no runtime dependencies");
  assert.equal(installedLock.version, version);
  assert.equal(installedLock.integrity, checksums.integrity);
  assert.equal(installedLock.resolved, metadata.dist.tarball);
  const subpaths = ["documents", "pricing", "energy", "workflow", "catalog-observations"];
  const expectedFiles = [...subpaths.flatMap((subpath) => [`dist/${subpath}.js`, `dist/${subpath}.d.ts`]), "package.json", "README.md", "LICENSE", "NOTICE"].sort();
  assert.deepEqual(filesUnder(installed).map((path) => relative(installed, path).split(/[/\\]/).join("/")).sort(), expectedFiles);
  const contentMatches = [];
  for (const file of expectedFiles.filter((file) => !["README.md", "package.json"].includes(file))) {
    assert.deepEqual(readFileSync(join(installed, file)), readFileSync(join(root, file)), `Published/current content mismatch: ${file}`);
    contentMatches.push(file);
  }
  const publishedPackage = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
  const currentPackage = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const scriptsMatch = JSON.stringify(publishedPackage.scripts) === JSON.stringify(currentPackage.scripts);
  delete publishedPackage.scripts;
  delete currentPackage.scripts;
  assert.deepEqual(publishedPackage, currentPackage, "Published package contract changed beyond development scripts");
  const readmeMatches = readFileSync(join(installed, "README.md")).equals(readFileSync(join(root, "README.md")));
  for (const [from, to] of [
    ["energy/proposal-2026-10-08/artifact.json", "energy.json"], ["energy/parameters.v1.yaml", "parameters.v1.yaml"],
    ["energy/fixtures/legacy.v2.json", "legacy.v2.json"], ["pricing/proposal-2026-10-08/artifact.json", "pricing.json"], ["pricing/METHOD.md", "pricing-METHOD.md"],
  ]) copyFileSync(join(root, "calculations", from), join(consumer, "fixtures", to));
  copyFileSync(join(root, "tests", "fixtures", "package-consumer.mjs"), join(consumer, "consumer.mjs"));
  const contract = JSON.parse(run(["consumer.mjs"], consumer));
  const examples = {};
  for (const subpath of ["energy", "pricing"]) {
    copyFileSync(join(root, "examples", `${subpath}.mjs`), join(consumer, `${subpath}-example.mjs`));
    examples[subpath] = JSON.parse(run([`${subpath}-example.mjs`, join(consumer, "fixtures", subpath === "energy" ? "parameters.v1.yaml" : "pricing.json")], consumer));
  }
  assert.deepEqual(examples.energy.estimate, { low: 0.0000915, value: 0.000897, high: 0.00149799 });
  assert.equal(examples.pricing.frozen.usdExact, "0.000002");
  assert.equal(examples.pricing.live.usdExact, "0.000001");
  const report = {
    schemaVersion: 1, fetchedAt, completedAt: new Date().toISOString(), name, version, node: process.version, registry,
    checksums, tarball: metadata.dist.tarball, verifiedRuntimeSource: "94b9dbf60507c8beab82a583101d3074a3dd2c16",
    contentMatches, packageContractMatches: true, developmentScriptsMatch: scriptsMatch,
    documentation: { readmeMatches, assessment: readmeMatches ? "README matches" : "README changed after publication; runtime, declarations and package contract match" },
    installedIntegrityVerified: true, runtimeDependencyCount: 0, contract, examples,
    provenance: { npmGitHead: metadata.gitHead ?? null, attestations: metadata.dist.attestations ?? null, assessment: "Content verification does not establish CI publication provenance or production adoption." },
  };
  if (output) {
    mkdirSync(resolve(output, ".."), { recursive: true });
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
