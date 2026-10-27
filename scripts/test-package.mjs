import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import { build } from "esbuild";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { typescriptCli } from "./typescript-cli.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const npmCli = process.env.npm_execpath;
if (!npmCli || /\.(?:cmd|bat)$/i.test(npmCli)) throw new Error("Run this check through npm run test:package.");
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== "--out" || !args[1])) throw new Error("Usage: npm run test:package -- [--out directory]");
const output = args[1] ? resolve(args[1]) : undefined;
const temporary = mkdtempSync(join(tmpdir(), "centrail packed consumer "));
const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (/^npm_config_/i.test(key) || key === "NODE_PATH" || key === "NODE_OPTIONS") delete environment[key];
}
const userConfig = join(temporary, "user.npmrc");
const globalConfig = join(temporary, "global.npmrc");
writeFileSync(userConfig, "");
writeFileSync(globalConfig, "");
const npm = (args, cwd) => execFileSync(process.execPath, [npmCli, ...args, "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--userconfig", userConfig, "--globalconfig", globalConfig, "--cache", join(temporary, "npm-cache")], {
  cwd, env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
});
const node = (args, cwd) => execFileSync(process.execPath, args, { cwd, env: environment, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

try {
  const packageInfo = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(packageInfo.name, "@centrail/calculations");
  assert.deepEqual(packageInfo.dependencies, { "@noble/hashes": "2.4.0" });
  for (const field of ["optionalDependencies", "peerDependencies"]) assert.equal(Object.keys(packageInfo[field] ?? {}).length, 0, field);
  const hashPackage = join(root, "node_modules", "@noble", "hashes");
  const hashInfo = JSON.parse(readFileSync(join(hashPackage, "package.json"), "utf8"));
  assert.equal(hashInfo.version, packageInfo.dependencies["@noble/hashes"]);
  assert.equal(Object.keys(hashInfo.dependencies ?? {}).length, 0);
  const hashPack = JSON.parse(npm(["pack", "--json", "--pack-destination", temporary], hashPackage))[0];
  const hashTarball = join(temporary, hashPack.filename);
  const subpaths = ["documents", "pricing", "energy", "workflow", "catalog-observations"];
  assert.deepEqual(Object.keys(packageInfo.exports).sort(), subpaths.map((name) => `./${name}`).sort());
  const packed = JSON.parse(npm(["pack", "--json", "--pack-destination", temporary], root));
  assert.equal(packed.length, 1);
  const pack = packed[0];
  assert.equal(basename(pack.filename), pack.filename);
  assert.deepEqual(pack.files.map(({ path }) => path).sort(), [
    ...subpaths.flatMap((name) => [`dist/${name}.js`, `dist/${name}.d.ts`]),
    "package.json", "README.md", "LICENSE", "NOTICE",
  ].sort(), "The tarball must contain only declared code, declarations and public notices");
  const tarball = join(temporary, pack.filename);
  const cases = [];
  for (const consumerName of ["cli consumer", "server consumer", "browser consumer"]) {
    const consumer = join(temporary, consumerName);
    mkdirSync(join(consumer, "fixtures"), { recursive: true });
    writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: consumerName.replace(" ", "-"), private: true, type: "module" }));
    npm(["install", "--engine-strict", "--package-lock=false", tarball, hashTarball], consumer);
    const installed = join(consumer, "node_modules", "@centrail", "calculations");
    assert.equal(lstatSync(installed).isSymbolicLink(), false, "A linked checkout is not a packed installation");
    assert.deepEqual(readdirSync(join(consumer, "node_modules", "@centrail")), ["calculations"]);
    for (const [from, to] of [
      ["energy/proposal-2026-10-08/artifact.json", "energy.json"],
      ["energy/parameters.v1.yaml", "parameters.v1.yaml"],
      ["energy/fixtures/legacy.v2.json", "legacy.v2.json"],
      ["pricing/proposal-2026-10-08/artifact.json", "pricing.json"],
      ["pricing/METHOD.md", "pricing-METHOD.md"],
    ]) copyFileSync(join(root, "calculations", from), join(consumer, "fixtures", to));
    for (const extension of ["mjs", "mts"]) copyFileSync(join(root, "tests", "fixtures", `package-consumer.${extension}`), join(consumer, `consumer.${extension}`));
    const results = JSON.parse(node(["consumer.mjs"], consumer));
    writeFileSync(join(consumer, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", lib: ["ES2022"], module: "NodeNext", moduleResolution: "NodeNext", strict: true, noEmit: true, types: [], typeRoots: [] },
      files: ["consumer.mts"],
    }));
    node([typescriptCli, "-p", join(consumer, "tsconfig.json")], consumer);
    for (const name of ["energy", "pricing"]) copyFileSync(join(root, "examples", `${name}.mjs`), join(consumer, `${name}-example.mjs`));
    const energyExample = JSON.parse(node(["energy-example.mjs", join(consumer, "fixtures", "parameters.v1.yaml")], consumer));
    assert.equal(energyExample.methodRevision, "token-energy-v2");
    assert.equal(energyExample.unit, "kWh");
    assert.ok(Number.isFinite(energyExample.estimate.value));
    const pricingExample = JSON.parse(node(["pricing-example.mjs", join(consumer, "fixtures", "pricing.json")], consumer));
    assert.equal(pricingExample.frozen.usdExact, "0.000002");
    assert.equal(pricingExample.live.usdExact, "0.000001");
    let browser;
    if (consumerName === "browser consumer") {
      copyFileSync(join(root, "tests", "fixtures", "browser-consumer.mjs"), join(consumer, "browser.mjs"));
      const bundle = await build({
        absWorkingDir: consumer, entryPoints: ["browser.mjs"], bundle: true,
        platform: "browser", format: "iife", target: "es2022", write: false, metafile: true,
      });
      assert.equal(Object.values(bundle.metafile.outputs).flatMap((entry) => entry.imports).length, 0, "No external imports or Node polyfills");
      const code = bundle.outputFiles[0].text;
      // Node's structuredClone returns host-realm prototypes. Use null-prototype
      // plain records at this test boundary so the sandbox's strict JSON-data
      // checks see plain data, while retaining native numeric/clone semantics.
      const cloneIntoSandbox = (value) => {
        const clone = structuredClone(value);
        const visit = (item) => {
          if (!item || typeof item !== "object") return;
          if (Object.getPrototypeOf(item) === Object.prototype) Object.setPrototypeOf(item, null);
          for (const child of Object.values(item)) visit(child);
        };
        visit(clone);
        return clone;
      };
      const context = { TextEncoder, structuredClone: cloneIntoSandbox };
      runInNewContext(code, context, { timeout: 10_000 });
      browser = JSON.parse(JSON.stringify(context.result));
      assert.equal(browser.energyModels, 32);
      assert.equal(browser.tamperChecks, 3);
      assert.equal(browser.preparedSnapshot, true);
      if (output) { mkdirSync(output, { recursive: true }); writeFileSync(join(output, "browser-consumer.js"), code); }
    }
    cases.push({ consumer: consumerName, ...results, declarationsWithoutAmbientNodeTypes: true, documentedExamplesExecuted: true, ...(browser ? { browser } : {}) });
  }
  const report = {
    name: pack.name, version: pack.version, filename: pack.filename, node: process.version,
    shasum: pack.shasum, integrity: pack.integrity,
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"),
    files: pack.files.map(({ path }) => path), consumers: cases,
  };
  if (output) {
    mkdirSync(output, { recursive: true });
    assert.equal(readdirSync(output).filter((name) => name.endsWith(".tgz")).length, 0, "Output directory already contains a tarball");
    copyFileSync(tarball, join(output, pack.filename));
    writeFileSync(join(output, "pack-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
