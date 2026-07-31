# Crenelle Project Rules & Invariants

## Serverless & API Execution
- **Always Await Async Operations in API Routes & Server Actions**: Never leave async side-effects (email delivery, notifications, webhooks, DB sync) floating or un-awaited (e.g. `sendEmail().catch(...)` without `await`) in Vercel/Next.js handlers.
- **Function Freezing**: Serverless function environments freeze immediately when the response is returned. Ensure all side-effect tasks are fully awaited or explicitly handled via structured background job queues.

## Testing & Quality Assurance
- **Supabase Test Mocks**: When creating or updating mocks for the Supabase admin/server client in `__tests__`, ensure mock objects support `.rpc()` procedure calls alongside standard table operations (`.from()`, `.select()`, `.insert()`).

## Visual Design & UI Invariants
- **High-Contrast Text Over Dark Overlays**: Whenever text is rendered inside a component with a permanent dark background or image gradient overlay, NEVER use generic theme variables (`text-foreground`, `text-muted-foreground`) which resolve to dark charcoal text in Light Mode. Always use explicit light text classes (`text-stone-100` / `text-white` for headings, `text-stone-300` for descriptions).
- **Vibrant Status Colors (Green & Red)**: Green and red status indicators, counts, and badges outside landing page graphics MUST use high-contrast, vivid shades — never faded, dull, or low-opacity muted tones.
  - Success / Accepted / Admitted: Use vibrant emerald (`text-emerald-600 dark:text-emerald-400` or `#10B981`).
  - Error / Rejected / Denied: Use vibrant red (`text-red-600 dark:text-red-400` or `#EF4444`).

## Media & Client Image Processing
- **Standard MIME Types**: Always use standard MIME types (e.g., `image/jpeg`, never non-standard `image/jpg`).
- **Honest Fallbacks**: If client-side image compression or canvas rendering is bypassed (e.g., non-Safari HEIC uploads), preserve the exact file extension (`.heic`) and accurate MIME type (`image/heic`) rather than mislabeling original bytes.

