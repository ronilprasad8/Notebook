# Notebook Lite architecture and rollout

## What works in the development branch

- Firebase Authentication with Google sign-in and browser session persistence.
- Per-user notebook records in Cloud Firestore.
- Notebook detail pages with PDF, TXT and Markdown uploads to Firebase Storage (10 MB max).
- Source metadata stored in Firestore with an explicit `uploaded` status.
- Firestore and Storage rules that restrict access by authenticated Firebase UID.

**Not implemented yet:** extraction, embeddings, retrieval, AI answers, background workers, source deletion, notebook deletion, or a verified production release. Uploading a source does not make it searchable.

## Security and data model

`users/{uid}/notebooks/{notebookId}` holds `title` and `createdAt`.

`users/{uid}/notebooks/{notebookId}/sources/{sourceId}` holds `name`, `contentType`, `sizeBytes`, `storagePath`, `status`, and `createdAt`.

Storage objects use `users/{uid}/notebooks/{notebookId}/sources/{sourceId}.{pdf|txt|md}`. The original filename is not part of the object path. Source metadata status cannot be changed by browser clients; a trusted backend must use the Admin SDK after processing.

Deploy both `firestore.rules` and `storage.rules` to Firebase **before** enabling user uploads. Run emulator tests to verify owner access, cross-user denials, file-size limits and disallowed content types. The rules in this repository have not yet been validated against the Firebase emulator.

The browser checks file extension, MIME type and size for usability. Firebase rules are the security boundary. Uploads are limited to 10 MB; files are untrusted, even when MIME types appear correct.

## Proposed ingestion pipeline (not deployed)

1. A client uploads a file to Storage and creates a source record.
2. A Firebase-triggered handler validates the event, ensures a matching owner-scoped source record, and enqueues an idempotent job.
3. Cloud Tasks calls a private Cloud Run worker with an authenticated service identity. Do not run PDF parsing, OCR or embedding jobs inside Vercel request handlers.
4. The worker extracts and sanitizes text, chunks it, creates embeddings and stores an index keyed by owner, notebook and source.
5. A trusted backend verifies the Firebase ID token and notebook ownership, retrieves only authorized chunks, then calls a model with the source passages.
6. Answers return structured source IDs and passage references. If evidence is insufficient, return an explicit uncertainty message rather than fabricated citations.

Workers must bound document size, page count, runtime, concurrency and model usage; retry transient failures with backoff and a dead-letter policy. Use source ID and object generation as an idempotency key. Never log raw document text or authentication tokens. Keep model API keys and service credentials server-side.

## Deployment checklist

- Connect the GitHub repository to the Vercel project and deploy a preview from `develop`.
- Set the five `NEXT_PUBLIC_FIREBASE_*` variables in **Preview** and **Production** as needed; values currently set only for Development will not reach preview or production builds.
- Enable Google provider and authorize the deployed hostname in Firebase Authentication.
- Create Firestore and Storage resources and deploy the rules; test with two distinct accounts.
- Run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Review the preview, then merge only after checks pass. Configure `notebook.ronilprasad8.tech` as the production domain.

Firebase browser session persistence is unrelated to Vercel Function duration limits. Use asynchronous workers for long-running tasks.
