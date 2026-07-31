import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteFooter } from "@/components/landing/site-footer";
import { cn } from "@/lib/utils";

/**
 * Shared shell and typography primitives for long-form legal pages.
 *
 * These documents are dense, so the type is tuned for reading rather than for
 * the marketing page's display scale: a narrow measure (max-w-3xl), generous
 * line-height, and muted body text against high-contrast headings.
 *
 * The primitives exist so /privacy and /terms cannot drift apart visually — add
 * a new legal page and it inherits the same rhythm for free.
 */

export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center" aria-label="Crenelle — home">
            <Image
              src="/Brand Logos/CRENELLE FULLH W.png"
              alt="Crenelle"
              width={160}
              height={36}
              className="h-5 w-auto hidden dark:block object-contain"
              priority
            />
            <Image
              src="/Brand Logos/CRENELLE FULLH B.png"
              alt="Crenelle"
              width={160}
              height={36}
              className="h-5 w-auto block dark:hidden object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-sans text-xs font-bold text-muted-foreground hover:text-copper transition-colors duration-300"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to site
          </Link>
        </div>
      </header>

      {/* ── Document ── */}
      <main className="flex-1 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 flex justify-center select-none"
        >
          <div className="w-[60vw] h-[16vw] rounded-full bg-copper/5 blur-[150px] -translate-y-1/2" />
        </div>

        <article className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <header className="mb-12 pb-8 border-b border-border/40">
            <h1 className="font-sans text-4xl md:text-5xl font-black tracking-tight leading-[1.05] text-foreground">
              {title}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60 mt-5">
              Last updated {lastUpdated}
            </p>
            {intro && <div className="mt-6">{intro}</div>}
          </header>

          {children}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Numbered top-level section heading. */
export function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="font-sans text-xl md:text-2xl font-bold tracking-tight text-foreground mt-14 mb-4 scroll-mt-24 first:mt-0"
    >
      {children}
    </h2>
  );
}

/** Sub-heading within a section. */
export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-base font-bold tracking-tight text-foreground mt-8 mb-3">
      {children}
    </h3>
  );
}

export function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-sans text-sm md:text-[15px] text-muted-foreground leading-[1.75] mb-4",
        className
      )}
    >
      {children}
    </p>
  );
}

/** Emphasised callout for the clauses people most need to notice. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-copper/50 bg-copper/5 pl-5 pr-4 py-4 rounded-r-xl mb-5">
      <p className="font-sans text-sm md:text-[15px] text-foreground/90 leading-[1.75]">
        {children}
      </p>
    </div>
  );
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-2 mb-5 font-sans text-sm md:text-[15px] text-muted-foreground leading-[1.7]">
      {children}
    </ul>
  );
}

export function LI({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

/**
 * Two-column reference table. Kept to two columns on purpose — three or more
 * becomes unreadable on a phone, which is where most guests will read this.
 */
export function LegalTable({
  headings,
  rows,
}: {
  headings: [string, string];
  rows: Array<[React.ReactNode, React.ReactNode]>;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-card/60">
            {headings.map((h) => (
              <th
                key={h}
                className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80 px-4 py-3 align-top"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border/40">
              <td className="font-sans text-[13px] md:text-sm font-semibold text-foreground px-4 py-3.5 align-top w-2/5">
                {row[0]}
              </td>
              <td className="font-sans text-[13px] md:text-sm text-muted-foreground px-4 py-3.5 align-top leading-relaxed">
                {row[1]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Inline link styled for body copy. */
export function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-copper font-semibold hover:underline underline-offset-4"
    >
      {children}
    </Link>
  );
}
