import test from "node:test";
import assert from "node:assert/strict";
import { MAX_SOURCE_BYTES, validateSourceFile, sourceStoragePath, sourceContentType } from "./source-policy.mjs";

const file = (name, size, type) => ({ name, size, type });

test("accepts supported documents", () => {
  assert.equal(validateSourceFile(file("notes.txt", 50, "text/plain")), null);
  assert.equal(validateSourceFile(file("notes.MD", 50, "text/markdown")), null);
  assert.equal(validateSourceFile(file("paper.pdf", 100, "application/pdf")), null);
});
test("rejects mismatched MIME, unsupported and empty files", () => {
  assert.match(validateSourceFile(file("malware.exe", 1, "application/octet-stream")), /Only/);
  assert.match(validateSourceFile(file("paper.pdf", 100, "text/plain")), /does not match/);
  assert.match(validateSourceFile(file("notes.txt", 0, "text/plain")), /non-empty/);
});
test("enforces upload size limit", () => {
  assert.equal(validateSourceFile(file("a.txt", MAX_SOURCE_BYTES, "text/plain")), null);
  assert.match(validateSourceFile(file("a.txt", MAX_SOURCE_BYTES + 1, "text/plain")), /10 MB/);
});
test("storage paths never include original filenames", () => {
  assert.equal(sourceStoragePath("user_1", "notebook-1", "doc_2", "private-notes.PDF"),
    "users/user_1/notebooks/notebook-1/sources/doc_2.pdf");
  assert.throws(() => sourceStoragePath("../other", "book", "doc", "a.txt"));
  assert.throws(() => sourceStoragePath("user", "book", "doc", "a.exe"));
});
test("content type follows validated extension", () => {
  assert.equal(sourceContentType("notes.md"), "text/markdown");
  assert.equal(sourceContentType("paper.pdf"), "application/pdf");
});
