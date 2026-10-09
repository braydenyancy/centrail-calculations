import { describe, expect, it } from "vitest";
import { canonicalJson, parseJsonStrict, readMethodDocument, sha256 } from "../src/documents.js";

describe("retained calculation documents", () => {
  it.each(['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"nested":{"x":0,"x":1}}'])
    ("rejects ambiguous keys: %s", text => expect(() => parseJsonStrict(text)).toThrow("Duplicate"));
  it.each(['[1,]', '{"a":1,}', '01', 'NaN', '1e999', 'true false', '"unterminated', '---\nx: 2'])
    ("rejects unsupported data: %s", text => expect(() => parseJsonStrict(text)).toThrow());
  it("preserves decimal lexemes and treats prototype keys as data", () => {
    const result = parseJsonStrict('{"rate":1.230e-7,"__proto__":{"polluted":true}}', { numbersAsStrings: true });
    expect((result as Record<string, unknown>).rate).toBe("1.230e-7");
    expect(Object.getPrototypeOf(result)).toBe(null);
  });
  it("canonicalizes independent of key order without changing arrays", () => {
    expect(canonicalJson({ b: 2, a: [3, 1] })).toBe('{"a":[3,1],"b":2}\n');
    expect(sha256(canonicalJson({ a: 1, b: 2 }))).toBe(sha256(canonicalJson({ b: 2, a: 1 })));
    expect(() => canonicalJson({ a: undefined })).toThrow();
    expect(() => canonicalJson(new Array(2))).toThrow("holes");
  });
  it("validates metadata instead of treating prose as executable configuration", () => {
    const metadata = { schemaVersion: 1, id: "test", revision: "v1", title: "Test", kind: "pricing", inputUnit: "tokens", outputUnit: "USD", assumptions: [], exclusions: [] };
    expect(readMethodDocument(`---\n${JSON.stringify(metadata)}\n---\nExplanation`).metadata).toEqual(metadata);
    expect(() => readMethodDocument(`---\n${JSON.stringify({ ...metadata, script: "run" })}\n---\nExplanation`)).toThrow();
  });
});
