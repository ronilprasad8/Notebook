"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { exportSources, MAX_SOURCE_BYTES, prepareSource, searchSources, type Source } from '@/lib/sources';

export default function SourceWorkspace({ uid, notebookId, title }: { uid: string; notebookId: string; title: string }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceTitle, setSourceTitle] = useState('');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!db) return;
    return onSnapshot(query(collection(db, 'users', uid, 'notebooks', notebookId, 'textSources'), orderBy('createdAt', 'desc')), snapshot => {
      setSources(snapshot.docs.map(item => ({ id: item.id, title: String(item.data().title ?? ''), text: String(item.data().text ?? '') })));
      setLoading(false);
    }, () => { setLoading(false); setError('Sources could not be loaded. Check your connection and Firestore access rules.'); });
  }, [uid, notebookId]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!db || busy) return;
    setError(''); setBusy(true);
    try {
      const source = prepareSource(sourceTitle, text);
      const saved = await addDoc(collection(db, 'users', uid, 'notebooks', notebookId, 'textSources'), { ...source, createdAt: serverTimestamp() });
      setSourceTitle(''); setText(''); setSelected(saved.id);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save source.'); }
    finally { setBusy(false); }
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setError(''); setBusy(true);
    try {
      if (!/\.(txt|md)$/i.test(file.name)) throw new Error('Choose a .txt or .md file.');
      if (file.size > MAX_SOURCE_BYTES) throw new Error('Sources must be smaller than 200 KB.');
      const source = prepareSource(file.name.slice(0, 120), await file.text());
      setSourceTitle(source.title); setText(source.text);
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not read file.'); }
    finally { setBusy(false); }
  }
  async function remove(source: Source) {
    if (!db || busy || !window.confirm(`Delete source "${source.title}"? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try { await deleteDoc(doc(db, 'users', uid, 'notebooks', notebookId, 'textSources', source.id)); if (selected === source.id) setSelected(null); }
    catch { setError('Could not delete source. Please try again.'); }
    finally { setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportSources(title, sources)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'notebook-sources.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const active = sources.find(source => source.id === selected);
  const results = searchSources(sources, search);
  return <section className="workspace">
    <div className="sectionHead"><h2>Text sources</h2><button className="textButton" onClick={download} disabled={!sources.length || loading}>Export sources</button></div>
    <p>Collect text and Markdown sources. Search your original material and read it here.</p>
    <form className="sourceForm" onSubmit={save}>
      <h3>Add a source</h3>
      <label htmlFor="textSourceFile">Import .txt or .md (up to 200 KB)</label>
      <input id="textSourceFile" type="file" accept=".txt,.md,text/plain,text/markdown" disabled={busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void importFile(file); }}/>
      <label htmlFor="sourceTitle">Source title</label><input id="sourceTitle" value={sourceTitle} maxLength={120} required disabled={busy} onChange={event => setSourceTitle(event.target.value)}/>
      <label htmlFor="sourceText">Source text</label><textarea id="sourceText" rows={8} value={text} required disabled={busy} onChange={event => setText(event.target.value)} placeholder="Paste your research notes or import a file above"/>
      <button className="primary" disabled={busy || !text.trim() || !sourceTitle.trim()}>{busy ? 'Working…' : 'Save source'}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    <label htmlFor="sourceSearch">Search source titles and text</label><input className="sourceSearch" id="sourceSearch" type="search" value={search} onChange={event => setSearch(event.target.value)}/>
    <p role="status">{loading ? 'Loading sources…' : `${results.length} of ${sources.length} sources`}</p>
    {!loading && !sources.length && <p>No sources yet. Add your first source above.</p>}
    {!!sources.length && !results.length && <p>No sources match your search.</p>}
    <div className="grid">{results.map(source => <article className="notebook" key={source.id}><h3>{source.title}</h3><p>{source.text.slice(0, 140)}{source.text.length > 140 ? '…' : ''}</p><button className="textButton" onClick={() => setSelected(source.id)}>Read source</button><button className="textButton" disabled={busy} onClick={() => void remove(source)}>Delete source</button></article>)}</div>
    {active && <section className="sourceReader" aria-label="Source reader"><div className="sectionHead"><h3>{active.title}</h3><button className="textButton" onClick={() => setSelected(null)}>Close source</button></div><pre>{active.text}</pre></section>}
  </section>;
}
