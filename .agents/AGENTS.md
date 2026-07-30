# Crenelle Project Rules & Invariants

## Serverless & API Execution
- **Always Await Async Operations in API Routes & Server Actions**: Never leave async side-effects (email delivery, notifications, webhooks, DB sync) floating or un-awaited (e.g. `sendEmail().catch(...)` without `await`) in Vercel/Next.js handlers.
- **Function Freezing**: Serverless function environments freeze immediately when the response is returned. Ensure all side-effect tasks are fully awaited or explicitly handled via structured background job queues.

## Testing & Quality Assurance
- **Supabase Test Mocks**: When creating or updating mocks for the Supabase admin/server client in `__tests__`, ensure mock objects support `.rpc()` procedure calls alongside standard table operations (`.from()`, `.select()`, `.insert()`).
