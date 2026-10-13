import { createHash } from "node:crypto";
import { describe,expect,it } from "vitest";
import { assertStableAdvance,registryState,verifyRegistryBytes } from "../scripts/release-registry.mjs";
const bytes=Buffer.from("synthetic tested package");
const hash=(name,encoding="hex")=>createHash(name).update(bytes).digest(encoding);
const report={name:"@centrail/calculations",version:"0.1.1",sha256:hash("sha256")};
const metadata={name:report.name,version:report.version,dist:{tarball:"https://registry.npmjs.org/@centrail/calculations/-/calculations-0.1.1.tgz",shasum:hash("sha1"),integrity:"sha512-"+hash("sha512","base64"),attestations:{provenance:{predicateType:"https://slsa.dev/provenance/v1"}}}};
describe("immutable publication recovery",()=>{
  it("accepts exact tested bytes with matching registry checksums",()=>{
    expect(()=>verifyRegistryBytes(metadata,bytes,report)).not.toThrow();
    expect(()=>verifyRegistryBytes(metadata,Buffer.from("different bytes"),report)).toThrow();
  });
  it("refuses a matching version with a changed name or integrity",()=>{
    for(const changed of [{...metadata,name:"other"},{...metadata,version:"0.1.2"},{...metadata,dist:{...metadata.dist,integrity:"invalid"}}]) expect(()=>verifyRegistryBytes(changed,bytes,report)).toThrow();
  });
  it("only treats404 as unpublished, never registry failures",async()=>{
    let count=0;
    expect(await registryState(report,async()=>++count===1?new Response(null,{status:404}):Response.json({latest:"0.1.0"}))).toEqual({exists:false});
    await expect(registryState(report,async()=>new Response(null,{status:503}))).rejects.toThrow();
  });
  it("prevents stable-channel downgrade or reuse as a new release",()=>{
    expect(()=>assertStableAdvance("0.2.0","0.1.9")).not.toThrow();
    for(const version of ["0.1.0","0.1.1","invalid"]) expect(()=>assertStableAdvance(version,"0.1.1")).toThrow();
    expect(()=>assertStableAdvance("0.1.2","0.1.2-beta.1")).toThrow();
  });
  it("reuses an already published artifact with provenance metadata",async()=>{
    let count=0;
    const state=await registryState(report,async()=>++count===1?Response.json(metadata):new Response(bytes));
    expect(state).toMatchObject({exists:true,version:"0.1.1",provenanceSignatureVerified:false});
  });
  it("rejects redirected tarballs and missing provenance",async()=>{
    for(const changed of [{...metadata,dist:{...metadata.dist,tarball:"https://attacker.invalid/package.tgz"}},{...metadata,dist:{...metadata.dist,attestations:undefined}}]) {
      let count=0;
      await expect(registryState(report,async()=>++count===1?Response.json(changed):new Response(bytes))).rejects.toThrow();
    }
  });
});
