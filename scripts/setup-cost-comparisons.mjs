import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const flags = {};
for (let index = 0; index < args.length; index += 2) {
  assert.ok(["--out", "--python"].includes(args[index]) && args[index + 1] && !flags[args[index]], "Usage: npm run prepare:cost-comparisons -- [--out empty-directory] [--python python-executable]");
  flags[args[index]] = args[index + 1];
}
const output = flags["--out"] ? resolve(flags["--out"]) : join(root, "artifacts", "cost-comparisons", "environment");
mkdirSync(output, { recursive: true });
assert.equal(readdirSync(output).length, 0, "Setup refuses to overwrite an existing directory");
const npmCli = process.env.npm_execpath;
assert.ok(npmCli && !/\.(?:cmd|bat)$/i.test(npmCli), "Run setup through npm");
const environment = {};
for (const key of Object.keys(process.env)) if (/^(?:PATH|SystemRoot|windir|ComSpec|PATHEXT|TEMP|TMP|TMPDIR)$/i.test(key)) environment[key] = process.env[key];
environment.HOME = join(output, "home");
environment.USERPROFILE = environment.HOME;
mkdirSync(environment.HOME);
const run = (command, args, cwd = output) => execFileSync(command, args, { cwd, env: environment, stdio: "inherit", timeout: 300_000 });
const venv = join(output, "python");
run(flags["--python"] ?? (process.platform === "win32" ? "python.exe" : "python3"), ["-m", "venv", venv]);
const python = join(venv, process.platform === "win32" ? "Scripts" : "bin", process.platform === "win32" ? "python.exe" : "python");
run(python, ["-m", "pip", "install", "--isolated", "--no-cache-dir", "--index-url", "https://pypi.org/simple", "-r", join(root, "scripts", "comparison-litellm-requirements.txt")]);
const langfuse = join(output, "langfuse");
mkdirSync(langfuse);
run("git", ["init", "--quiet"], langfuse);
run("git", ["config", "core.autocrlf", "false"], langfuse);
run("git", ["fetch", "--depth", "1", "https://github.com/langfuse/langfuse.git", "a27d317564faa31c0f069595aa4825d1fda880ec"], langfuse);
run("git", ["checkout", "--detach", "FETCH_HEAD"], langfuse);
const decimal = join(output, "decimal");
mkdirSync(decimal);
writeFileSync(join(decimal, "package.json"), JSON.stringify({ private: true }));
for (const file of ["user.npmrc", "global.npmrc"]) writeFileSync(join(output, file), "");
run(process.execPath, [npmCli, "install", "decimal.js@10.6.0", "--ignore-scripts", "--no-audit", "--no-fund", "--registry", "https://registry.npmjs.org", "--userconfig", join(output, "user.npmrc"), "--globalconfig", join(output, "global.npmrc"), "--cache", join(output, "npm-cache")], decimal);
const configuration = { "--python": python, "--langfuse": langfuse, "--decimal": join(decimal, "node_modules", "decimal.js", "decimal.mjs") };
writeFileSync(join(output, "configuration.json"), `${JSON.stringify(configuration, null, 2)}\n`);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifest = {
  schemaVersion: 1, preparedAt: new Date().toISOString(), node: process.version,
  python: execFileSync(python, ["--version"], { env: environment, encoding: "utf8" }).trim(),
  pythonDependencies: execFileSync(python, ["-m", "pip", "freeze"], { env: environment, encoding: "utf8" }).trim().split(/\r?\n/),
  requirementsSha256: hash(readFileSync(join(root, "scripts", "comparison-litellm-requirements.txt"))),
  langfuseCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: langfuse, env: environment, encoding: "utf8" }).trim(),
  decimal: JSON.parse(readFileSync(join(decimal, "package-lock.json"), "utf8")).packages["node_modules/decimal.js"],
  limitations: ["Python dependency versions are pinned, not distribution-file hashes; this is not a supply-chain attestation.", "Native macOS and Windows execution remain unverified."],
};
writeFileSync(join(output, "preparation.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Preparation complete. Run npm run test:cost-comparisons -- --config "${join(output, "configuration.json")}"`);
