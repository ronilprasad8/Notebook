# Notebook Lite

A lightweight research notebook app. The current release is a foundation, **not yet a complete AI document assistant**.

## Implemented
- Responsive Next.js dashboard
- Firebase Google sign-in and persisted authentication
- Per-user notebooks in Firestore with realtime updates
- Firestore rules limiting notebook reads/writes to the owner
- Notebook source workspace: paste text or import `.txt` / `.md` files up to 200 KB
- Realtime source library, plain-text reader, title/body search, confirmed source deletion
- Portable JSON export of notebook sources (download only; re-import is not implemented)

## Validation
Use Node.js 22.18+ and run `npm ci`, `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
GitHub Actions runs these checks on main/develop pushes and pull requests. Unit tests cover source normalization, UTF-8 size limits, invalid content, search, and export.

## Source storage and access
Text sources live at `users/{uid}/notebooks/{notebookId}/sources/{sourceId}` in Firestore. Deploy the repository's rules before testing the source workspace; notebook-only rules do not grant access to subcollections. With an authenticated Firebase CLI, run `firebase deploy --only firestore:rules --project notebook-a737a`.

Sources are immutable after creation and can be deleted only by their owner. Creation requires an existing notebook, bounded title/text fields, and a server timestamp. HTML and Markdown are displayed as plain text, never executed. The client enforces a 200,000-byte UTF-8 limit; rules also cap text length at 200,000 characters. There is no PDF extraction, semantic search, AI answering, or citation generation in this batch.

Before release, verify owner and non-owner access with the Firebase rules playground or emulator, then sign in and test create notebook → save source → reload → search → read → export → delete. Test two accounts to check isolation. A successful Vercel build alone does not prove authenticated Firestore operations work.

## Local setup
1. Run `npm install`.
2. Create a Firebase project and enable **Authentication > Google** and **Cloud Firestore**.
3. Copy `.env.example` to `.env.local` and fill in the Firebase web app settings.
4. Deploy `firestore.rules` before adding real users. Configure Firestore indexes if prompted.
5. Run `npm run dev`. Allow localhost and notebook.ronilprasad8.tech in Firebase Authentication authorized domains.

## Deployment
Connect ronilprasad8/Notebook to a Vercel Next.js project and supply the four NEXT_PUBLIC_FIREBASE_* environment variables. Add notebook.ronilprasad8.tech under Vercel Project Settings > Domains and apply Vercel's DNS instructions.

## Roadmap
- User-owned document upload to Firebase Storage with Storage rules
- Asynchronous ingestion using Cloud Tasks / Cloud Run or Firebase-triggered jobs, avoiding Vercel Function timeouts
- Text extraction, chunking, embeddings, retrieval, and source-grounded AI responses
- Quoted citations, notebook rename/deletion, and audit trails
- Firebase emulator security tests, integration tests, build verification, and monitoring

Firebase client config variables are public identifiers, but model-provider secrets and service-account keys must never be put in NEXT_PUBLIC_ variables. Firebase Auth persistence does not increase Vercel Function runtime limits.
