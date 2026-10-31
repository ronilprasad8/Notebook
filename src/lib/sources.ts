export const MAX_SOURCE_BYTES = 200_000;
export type Source = { id: string; title: string; text: string };

export function prepareSource(title: string, text: string) {
  const cleanTitle = title.trim();
  const cleanText = text.replace(/\r\n?/g, '\n').trim();
  if (!cleanTitle || cleanTitle.length > 120) throw new Error('Use a source title between 1 and 120 characters.');
  if (!cleanText) throw new Error('This source has no readable text.');
  if (cleanText.includes('\0')) throw new Error('Only plain text and Markdown sources are supported.');
  if (new TextEncoder().encode(cleanText).length > MAX_SOURCE_BYTES) throw new Error('Sources must be smaller than 200 KB.');
  return { title: cleanTitle, text: cleanText };
}

export function searchSources(sources: Source[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return sources;
  return sources.filter(source => `${source.title}\n${source.text}`.toLocaleLowerCase().includes(needle));
}

export function exportSources(title: string, sources: Source[]) {
  return JSON.stringify({ format: 'notebook-lite', version: 1, title, sources: sources.map(({ title, text }) => ({ title, text })) }, null, 2);
}
