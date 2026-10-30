export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const formats = Object.freeze({
  pdf: ["application/pdf"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", ""],
});

/** @param {{ name: string; size: number; type: string }} file */
export function validateSourceFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !Object.hasOwn(formats, extension)) {
    return "Only PDF, TXT and Markdown files are supported.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "Choose a non-empty file.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "Files must be 10 MB or smaller.";
  }
  if (!formats[extension].includes(file.type)) {
    return "The file type does not match its extension.";
  }
  return null;
}

/** @param {string} name */
export function sourceContentType(name) {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension === "pdf" ? "application/pdf" :
    extension === "md" ? "text/markdown" : "text/plain";
}

/** @param {string} uid @param {string} notebookId @param {string} sourceId @param {string} fileName */
export function sourceStoragePath(uid, notebookId, sourceId, fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !Object.hasOwn(formats, extension)) {
    throw new Error("Unsupported source extension");
  }
  for (const id of [uid, notebookId, sourceId]) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("Invalid storage identifier");
  }
  return `users/${uid}/notebooks/${notebookId}/sources/${sourceId}.${extension}`;
}
