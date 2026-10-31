import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareSource, searchSources, exportSources, MAX_SOURCE_BYTES } from '../src/lib/sources.ts';

test('normalizes imported text without changing paragraphs', () => {
  assert.deepEqual(prepareSource(' Notes ', ' a\r\nb\rc '), { title: 'Notes', text: 'a\nb\nc' });
});
test('rejects empty, binary, oversized and untitled sources', () => {
  for (const [title, text] of [['', 'text'], ['x'.repeat(121), 'text'], ['Notes', '  '], ['Notes', 'a\0b'], ['Notes', 'é'.repeat(MAX_SOURCE_BYTES / 2 + 1)]]) {
    assert.throws(() => prepareSource(title, text));
  }
});
test('accepts the exact UTF-8 size limit', () => {
  assert.equal(prepareSource('Notes', 'é'.repeat(MAX_SOURCE_BYTES / 2)).text.length, MAX_SOURCE_BYTES / 2);
});
test('search matches source title or body, ignoring case and surrounding spaces', () => {
  const sources = [{ id: 'a', title: 'Mars', text: 'Red planet' }, { id: 'b', title: 'Earth', text: 'Blue planet' }];
  assert.deepEqual(searchSources(sources, ' RED '), [sources[0]]);
  assert.deepEqual(searchSources(sources, 'earth'), [sources[1]]);
  assert.deepEqual(searchSources(sources, '  '), sources);
  assert.deepEqual(searchSources(sources, 'Venus'), []);
});
test('export preserves source content without including internal IDs', () => {
  const saved = JSON.parse(exportSources('Research', [{ id: 'private-id', title: 'A', text: '<script>\n# Text' }]));
  assert.equal(saved.version, 1);
  assert.deepEqual(saved.sources, [{ title: 'A', text: '<script>\n# Text' }]);
});
