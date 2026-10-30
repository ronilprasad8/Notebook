"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from "firebase/auth";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, type DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { BookOpen, Plus, LogOut, FileText, Search, Sparkles } from "lucide-react";

type Notebook = { id: string; title: string; createdAt?: DocumentData };
export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!auth) { setReady(true); return; }
    return onAuthStateChanged(auth, (next) => { setUser(next); setReady(true); });
  }, []);
  useEffect(() => {
    if (!db || !user) { setNotebooks([]); return; }
    const q = query(collection(db, "users", user.uid, "notebooks"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => { setNotebooks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notebook))); }, err => setError(err.message));
  }, [user]);
  async function login() { if (!auth) return; setError(""); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (e) { setError(e instanceof Error ? e.message : "Sign-in failed"); } }
  async function createNotebook(e: React.FormEvent) {
    e.preventDefault(); if (!db || !user || !title.trim()) return;
    setBusy(true); setError("");
    try { await addDoc(collection(db, "users", user.uid, "notebooks"), { title: title.trim().slice(0, 120), createdAt: serverTimestamp() }); setTitle(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not create notebook"); }
    finally { setBusy(false); }
  }
  return <main className="app">
    <header className="topbar"><div className="brand"><BookOpen size={23}/><strong>Notebook<span> Lite</span></strong></div><div className="topright"><span className="version">Your research workspace</span>{user && <button className="textButton" onClick={() => auth && signOut(auth)}><LogOut size={16}/> Sign out</button>}</div></header>
    <div className="content"><div className="hero"><span className="eyebrow"><Sparkles size={15}/> RESEARCH, ORGANIZED</span><h1>Your ideas deserve<br/><em>a better home.</em></h1><p>Keep notebooks in sync securely with your Google account. Upload sources to your notebooks. AI answers with citations are in development.</p></div>
    {!auth || !db ? <section className="panel"><h2>Firebase setup required</h2><p>Configure the NEXT_PUBLIC_FIREBASE_* variables to enable sign-in and notebooks. See the README for setup.</p></section> : !ready ? <p>Loading your workspace…</p> : !user ? <section className="panel signIn"><BookOpen size={28}/><h2>Start your research space</h2><p>Sign in to create and access your private notebooks across devices.</p><button className="primary" onClick={login}>Continue with Google</button></section> : <section className="workspace"><div className="sectionHead"><div><span className="eyebrow">LIBRARY</span><h2>Your notebooks</h2></div><span className="count">{notebooks.length} notebooks</span></div><form className="create" onSubmit={createNotebook}><label htmlFor="newNotebook" className="srOnly">Notebook name</label><input id="newNotebook" maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Name your new notebook..." required/><button className="primary" type="submit" disabled={busy || !title.trim()}><Plus size={17}/> Create notebook</button></form>{notebooks.length ? <div className="grid">{notebooks.map(book => <Link className="notebook" href={"/notebooks/" + encodeURIComponent(book.id)} key={book.id}><div className="bookIcon"><FileText size={22}/></div><h3>{book.title}</h3><p>Open notebook and manage sources</p></Link>)}</div> : <div className="empty"><Search size={27}/><h3>A fresh page for your ideas</h3><p>Create your first notebook to start organizing your research.</p></div>}</section>}
    {error && <p role="alert" className="error">{error}</p>}
    </div><footer>Notebook Lite · Built for focused research</footer>
  </main>;
}
