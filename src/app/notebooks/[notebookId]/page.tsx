"use client";

import SourceWorkspace from "@/app/SourceWorkspace";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, type User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, FileText, UploadCloud, BookOpen } from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { sourceContentType, sourceStoragePath, validateSourceFile } from "@/lib/source-policy.mjs";

type Notebook = { title: string };
type Source = { id: string; name: string; status: string; sizeBytes: number; contentType: string };

export default function NotebookPage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [notebookReady, setNotebookReady] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth) { setAuthReady(true); return; }
    return onAuthStateChanged(auth, next => { setUser(next); setAuthReady(true); },
      err => { setError(err.message); setAuthReady(true); });
  }, []);

  useEffect(() => {
    setNotebook(null);
    setNotebookReady(false);
    setSources([]);
    if (!db || !user || !notebookId) return;
    const notebookRef = doc(db, "users", user.uid, "notebooks", notebookId);
    const unsubNotebook = onSnapshot(notebookRef, snap => {
      setNotebook(snap.exists() ? { title: String(snap.data().title) } : null);
      setNotebookReady(true);
    }, err => { setError(err.message); setNotebookReady(true); });
    const sourcesQuery = query(collection(notebookRef, "sources"), orderBy("createdAt", "desc"));
    const unsubSources = onSnapshot(sourcesQuery, snap => {
      setSources(snap.docs.map(item => ({ id: item.id, ...item.data() } as Source)));
    }, err => setError(err.message));
    return () => { unsubNotebook(); unsubSources(); };
  }, [user, notebookId]);

  async function signIn() {
    if (!auth) return;
    setError("");
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not sign in"); }
  }

  async function uploadSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !db || !storage || !notebook || !file || busy) return;
    const problem = validateSourceFile(file);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    setMessage("");
    const sourceRef = doc(collection(db, "users", user.uid, "notebooks", notebookId, "sources"));
    const storagePath = sourceStoragePath(user.uid, notebookId, sourceRef.id, file.name);
    const objectRef = ref(storage, storagePath);
    let uploaded = false;
    try {
      await uploadBytes(objectRef, file, { contentType: sourceContentType(file.name) });
      uploaded = true;
      await setDoc(sourceRef, {
        name: file.name, contentType: sourceContentType(file.name),
        sizeBytes: file.size, storagePath, status: "uploaded", createdAt: serverTimestamp(),
      });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setMessage("Source uploaded. Processing and AI answers are not available yet.");
    } catch (err) {
      if (uploaded) {
        try { await deleteObject(objectRef); } catch { /* retry cleanup during maintenance */ }
      }
      setError(err instanceof Error ? err.message : "Source upload failed");
    } finally {
      setBusy(false);
    }
  }

  return <main className="app">
    <header className="topbar"><Link href="/" className="brand"><BookOpen size={23}/><strong>Notebook<span> Lite</span></strong></Link><Link href="/" className="textButton"><ArrowLeft size={16}/> All notebooks</Link></header>
    <div className="content notebookPage">
      {!auth || !db ? <section className="panel"><h1>Firebase setup required</h1><p>Configure Firebase to open notebooks.</p></section>
        : !authReady ? <p role="status">Checking your session…</p>
        : !user ? <section className="panel"><h1>Sign in to continue</h1><p>Only the owner can access this notebook.</p><button className="primary" onClick={signIn}>Continue with Google</button></section>
        : !notebookReady ? <p role="status">Loading notebook…</p>
        : !notebook ? <section className="panel"><h1>Notebook not found</h1><p>This notebook does not exist or is not accessible.</p><Link href="/" className="textButton">Return to your library</Link></section>
        : <section className="workspace">
          <div className="notebookHeading"><span className="eyebrow">YOUR NOTEBOOK</span><h1>{notebook.title}</h1><p>Upload research sources. AI-powered analysis and citations are in development.</p></div>
          <div className="sectionHead"><div><span className="eyebrow">SOURCES</span><h2>Source library</h2></div><span className="count">{sources.length} sources</span></div>
          {!storage ? <p role="alert" className="error">Add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET to enable source uploads.</p> :
          <form className="uploadForm" onSubmit={uploadSource}>
            <label htmlFor="sourceFile">PDF, TXT or Markdown (up to 10 MB)</label>
            <input id="sourceFile" ref={fileInput} type="file" accept=".pdf,.txt,.md" required disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)}/>
            <button type="submit" className="primary" disabled={!file || busy}><UploadCloud size={17}/>{busy ? "Uploading…" : "Upload source"}</button>
          </form>}
          {sources.length ? <ul className="sourceList">{sources.map(source => <li key={source.id} className="sourceItem"><FileText size={20}/><div><strong>{source.name}</strong><p>{(source.sizeBytes / 1024).toFixed(1)} KB · {source.status === "uploaded" ? "Awaiting processing" : source.status}</p></div></li>)}</ul> :
          <div className="empty"><FileText size={27}/><h3>No sources yet</h3><p>Upload a PDF, text or Markdown document to get started.</p></div>}
          <SourceWorkspace key={`${user.uid}/${notebookId}`} uid={user.uid} notebookId={notebookId} title={notebook.title}/>
        </section>}
      {error && <p role="alert" className="error">{error}</p>}
      {message && <p role="status" className="success">{message}</p>}
    </div>
    <footer>Notebook Lite · Your sources stay in your workspace</footer>
  </main>;
}
