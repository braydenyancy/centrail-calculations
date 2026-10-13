import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const registry="https://registry.npmjs.org";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
export function assertStableAdvance(version, latest) {
  const parse=value=>/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value)?.slice(1).map(BigInt);
  const proposed=parse(version),current=parse(latest);
  assert.ok(proposed&&current,"Stable release comparison requires plain semver versions");
  const first=proposed.findIndex((value,i)=>value!==current[i]);
  assert.ok(first>=0&&proposed[first]>current[first],"A new stable publication must advance npm latest");
}
export function verifyRegistryBytes(metadata, bytes, report) {
  assert.equal(metadata.name,"@centrail/calculations");
  assert.equal(metadata.version,report.version);
  assert.equal(sha256(bytes),report.sha256,"Published bytes differ from the tested tarball");
  assert.equal(metadata.dist.shasum,createHash("sha1").update(bytes).digest("hex"));
  assert.equal(metadata.dist.integrity,"sha512-"+createHash("sha512").update(bytes).digest("base64"));
}
export async function registryState(report, fetcher=fetch) {
  assert.equal(report.name,"@centrail/calculations");
  const response=await fetcher(`${registry}/@centrail%2fcalculations/${encodeURIComponent(report.version)}`,{redirect:"error",signal:AbortSignal.timeout(30000)});
  if(response.status===404) {
    if(!report.version.includes("-")) {
      const tags=await fetcher(`${registry}/-/package/@centrail%2fcalculations/dist-tags`,{redirect:"error",signal:AbortSignal.timeout(30000)});
      assert.equal(tags.status,200,"Cannot establish current stable version");
      assertStableAdvance(report.version,(await tags.json()).latest);
    }
    return {exists:false};
  }
  assert.equal(response.status,200,"Registry lookup failed; do not interpret an outage as an unpublished version");
  const metadata=await response.json();
  const target=new URL(metadata.dist.tarball);
  assert.equal(target.origin,registry,"Tarball must remain on the public npm registry");
  assert.equal(target.username,"");assert.equal(target.password,"");
  const asset=await fetcher(target,{redirect:"error",signal:AbortSignal.timeout(30000)});
  assert.equal(asset.status,200);
  verifyRegistryBytes(metadata,Buffer.from(await asset.arrayBuffer()),report);
  assert.ok(metadata.dist.attestations?.provenance,"A new CI release must have provenance metadata");
  return {exists:true,version:metadata.version,sha256:report.sha256,provenance:metadata.dist.attestations.provenance,provenanceSignatureVerified:false};
}
async function main() {
  const [mode,path]=process.argv.slice(2);
  assert.ok(["preflight","verify"].includes(mode)&&path,"Use preflight|verify <pack-report.json>");
  const report=JSON.parse(await readFile(resolve(path),"utf8"));
  let state;
  for(let attempt=0;attempt<(mode==="verify"?6:1);attempt++) {
    state=await registryState(report);
    if(mode!=="verify"||state.exists) break;
    await new Promise(done=>setTimeout(done,1000));
  }
  if(mode==="preflight"&&process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT,`publish-needed=${!state.exists}\n`);
  if(mode==="verify") assert.ok(state.exists,"Published version not available from the registry");
  console.log(JSON.stringify(state));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
