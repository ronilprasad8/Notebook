# Notebook Lite

A lightweight research notebook app. The current release is a foundation, **not yet a complete AI document assistant**.

## Implemented
- Responsive Next.js dashboard
- Firebase Google sign-in and persisted authentication
- Per-user notebooks in Firestore with realtime updates
- Firestore rules limiting notebook reads/writes to the owner

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
- Notebook detail view, source library, quoted citations, deletion and audit trails
- Firebase emulator security tests, integration tests, build verification, and monitoring

Firebase client config variables are public identifiers, but model-provider secrets and service-account keys must never be put in NEXT_PUBLIC_ variables. Firebase Auth persistence does not increase Vercel Function runtime limits.
