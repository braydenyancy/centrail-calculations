import { describe, expect, it } from "vitest";
import { canonicalJson, parseJsonStrict, readMethodDocument, sha256 } from "../src/documents.js";

const metadata = { schemaVersion: 1, id: "test", revision: "v1", title: "Test", kind: "pricing", inputUnit: "tokens", outputUnit: "USD", assumptions: [], exclusions: [] };

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
    expect(readMethodDocument(`---\n${JSON.stringify(metadata)}\n---\nExplanation`).metadata).toEqual(metadata);
    expect(() => readMethodDocument(`---\n${JSON.stringify({ ...metadata, script: "run" })}\n---\nExplanation`)).toThrow();
  });
  it.each([
    ["LF", "\n", "\n", "\n"],
    ["CRLF", "\r\n", "\r\n", "\r\n"],
    ["mixed closing newline", "\n", "\n", "\r\n"],
    ["mixed metadata newline", "\r\n", "\r\n", "\n"],
  ])("preserves metadata and body bytes with %s delimiters", (_name, opening, beforeClosing, afterClosing) => {
    const body = "\r\nExplanation\n---\nMore explanation\r\n---\r\nFinal line\n";
    const document = `---${opening}${JSON.stringify(metadata)}${beforeClosing}---${afterClosing}${body}`;
    expect(readMethodDocument(document)).toEqual({ metadata, body });
  });
  it.each(["", "\n", " \t\r\n"])("rejects an empty or whitespace-only explanation: %j", body => {
    expect(() => readMethodDocument(`---\n${JSON.stringify(metadata)}\n---\n${body}`)).toThrow(/explanation/i);
  });
  it.each([
    "---\rmetadata\n---\nExplanation",
    ` ---\n${JSON.stringify(metadata)}\n---\nExplanation`,
    `---\n${JSON.stringify(metadata)}\n---Explanation`,
    `---\n${JSON.stringify(metadata)}\n----\nExplanation`,
    `---\n${JSON.stringify(metadata)}\n---`,
  ])("rejects malformed or incomplete delimiters: %j", document => {
    expect(() => readMethodDocument(document)).toThrow(/frontmatter/);
  });
  it("handles a large repeated-delimiter payload without changing the first boundary", () => {
    const repeated = "\n---\na".repeat(100_000);
    expect(() => readMethodDocument(`---\n\n---\n${repeated}`)).toThrow(/JSON/);
    const body = `Explanation${repeated}`;
    expect(readMethodDocument(`---\n${JSON.stringify(metadata)}\n---\n${body}`)).toEqual({ metadata, body });
    expect(() => readMethodDocument(`---\n${JSON.stringify(metadata)}${"\n----\na".repeat(100_000)}`)).toThrow(/frontmatter/);
  });
});
