import Image from "next/image";
import Link from "next/link";
import { Instagram, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Site footer.
 *
 * Shared by every public surface (landing page, and later /privacy, /terms and
 * the public event pages), so it only ever needs changing in one place.
 *
 * Design tokens follow design.md §7: dark glass surface (`bg-card/40` with a
 * `border-t border-border/40`), copper hover accents, monospace metadata line.
 *
 * Deliberately kept small. A footer full of links to pages that do not exist
 * reads worse than a short honest one — so this only lists what is real. Add
 * columns back as the pages appear (see LEGAL_LINKS below).
 *
 * Section anchors are absolute (`/#features`) so they still resolve when this
 * footer renders on a page other than the landing page.
 */

// ── Values to confirm before this goes live ──────────────────────────────────
// TODO: replace with the real address.
const CONTACT_EMAIL = "hello@crenelle.org";

// ⚠️ PLACEHOLDER URLS — these are guesses at the handle, NOT confirmed accounts.
// Replace every one before this ships, or visitors will be sent to a profile
// that does not exist (or to someone else's). Set an href to "#" to hide that
// icon entirely.
const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/company/crenelle", icon: "linkedin" as const },
  { label: "Instagram", href: "https://www.instagram.com/crenelle", icon: "instagram" as const },
  { label: "TikTok", href: "https://www.tiktok.com/@crenelle", icon: "tiktok" as const },
];

const EXPLORE_LINKS: Array<[string, string]> = [
  // Overview/Showcase were dropped on purpose: anyone reading the footer has
  // already scrolled past every section, so those were circular navigation.
  ["/#features", "Features"],
  ["/#process", "How it works"],
];

// Re-add this column once /privacy and /terms actually exist. Linking to a 404
// costs more trust than omitting the link entirely.
// const LEGAL_LINKS: Array<[string, string]> = [
//   ["/privacy", "Privacy policy"],
//   ["/terms", "Terms & conditions"],
// ];

/** Lucide dropped its brand icons, so TikTok is inlined. */
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.03 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function SocialIcon({
  icon,
  className,
}: {
  icon: "instagram" | "linkedin" | "tiktok";
  className?: string;
}) {
  if (icon === "tiktok") return <TikTokIcon className={className} />;
  if (icon === "instagram") return <Instagram className={className} />;
  return <Linkedin className={className} />;
}

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
      {children}
    </h3>
  );
}

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();
  const socials = SOCIAL_LINKS.filter((s) => s.href !== "#");

  return (
    <footer
      className={cn(
        "relative border-t border-border/40 bg-card/40 px-6 md:px-12 pt-16 pb-10 overflow-hidden",
        className
      )}
    >
      {/* Ambient copper glow — matches the page atmosphere (design.md §4) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center select-none"
      >
        <div className="w-[70vw] h-[18vw] rounded-full bg-copper/5 blur-[150px] translate-y-1/2" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          {/* ── Brand ── */}
          <div className="md:col-span-6 space-y-6">
            <Link href="/" className="inline-flex items-center" aria-label="Crenelle — home">
              <Image
                src="/Brand Logos/CRENELLE FULLH W.png"
                alt="Crenelle"
                width={180}
                height={40}
                className="h-7 w-auto hidden dark:block object-contain"
              />
              <Image
                src="/Brand Logos/CRENELLE FULLH B.png"
                alt="Crenelle"
                width={180}
                height={40}
                className="h-7 w-auto block dark:hidden object-contain"
              />
            </Link>

            <p className="font-sans text-sm text-muted-foreground leading-relaxed max-w-sm">
              QR access control and guest management for events. Issue passes,
              scan at the door, and know exactly who came — no hardware
              required.
            </p>

            {socials.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-copper hover:border-copper/40 transition-colors duration-300"
                  >
                    <SocialIcon icon={s.icon} className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Explore ── */}
          <div className="md:col-span-3 space-y-4">
            <ColumnHeading>Explore</ColumnHeading>
            <ul className="space-y-2.5">
              {EXPLORE_LINKS.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="font-sans text-sm text-muted-foreground hover:text-copper transition-colors duration-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Get in touch ── */}
          <div className="md:col-span-3 space-y-4">
            <ColumnHeading>Get in touch</ColumnHeading>
            <div className="space-y-2.5">
              <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                Running an event and want a hand setting it up? Talk to us.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-block font-sans text-sm font-semibold text-foreground hover:text-copper transition-colors duration-300 break-all"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-14 pt-8 border-t border-border/40">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            © {year} Crenelle. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}
