interface JsonLdProps {
  /** A single schema.org object, or an array rendered as separate graph nodes. */
  data: Record<string, unknown> | Record<string, unknown>[]
}

// Characters JSON.stringify leaves intact but which are unsafe inside an inline
// <script>: HTML-significant < > &, plus the U+2028/U+2029 line separators.
// Written with unicode escapes so no raw separator byte lives in this source.
const UNSAFE_SCRIPT_CHARS = /[<>&\u2028\u2029]/g

/**
 * Escape a JSON string for safe embedding in an inline <script> element.
 *
 * JSON.stringify does NOT escape <, >, &, or the U+2028/U+2029 line separators,
 * so organiser-supplied text containing a literal closing script tag would
 * otherwise break out of the tag and enable stored XSS. Replacing those
 * characters with their unicode-escape forms keeps the payload valid JSON while
 * making a tag breakout impossible.
 */
function serializeForScript(data: unknown): string {
  return JSON.stringify(data).replace(
    UNSAFE_SCRIPT_CHARS,
    (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'),
  )
}

/**
 * Renders a JSON-LD <script> for structured data. Content is escaped so
 * organiser-supplied event text cannot break out of the script tag.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeForScript(data) }}
    />
  )
}
