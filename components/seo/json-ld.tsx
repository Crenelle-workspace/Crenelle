interface JsonLdProps {
  /** A single schema.org object, or an array rendered as separate graph nodes. */
  data: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * Renders a JSON-LD `<script>` for structured data.
 *
 * The payload is JSON-encoded (not string-interpolated), so it is safe from
 * markup injection even when it contains organiser-supplied event text.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
