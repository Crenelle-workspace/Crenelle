"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  user?: unknown;
  className?: string;
}

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#process", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader({ user, className }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href.startsWith("/#")) {
      return pathname === "/" && false;
    }
    return pathname === href;
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4 border-b border-border/45 bg-background/80 backdrop-blur-xl transition-all",
        className
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* ── Brand Logo ── */}
        <Link href="/" className="flex items-center gap-3 group" aria-label="Crenelle — home">
          <Image
            src="/Brand Logos/CRENELLE FULLH W.png"
            alt="Crenelle"
            width={160}
            height={36}
            className="h-7 md:h-8 w-auto hidden dark:block object-contain"
            priority
          />
          <Image
            src="/Brand Logos/CRENELLE FULLH B.png"
            alt="Crenelle"
            width={160}
            height={36}
            className="h-7 md:h-8 w-auto block dark:hidden object-contain"
            priority
          />
        </Link>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden md:flex items-center gap-8 font-sans text-xs font-semibold" aria-label="Main Navigation">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isLinkActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative py-1 transition-colors duration-200 group",
                  active
                    ? "text-copper font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-0.5 bg-copper transition-all duration-300",
                    active ? "w-full" : "w-0 group-hover:w-full"
                  )}
                />
              </Link>
            );
          })}
        </nav>

        {/* ── Desktop Actions ── */}
        <div className="hidden md:flex items-center gap-4">
          <ModeToggle />
          <Link
            href={user ? "/events" : "/login"}
            className="inline-flex items-center justify-center rounded-full bg-foreground text-background font-sans text-xs font-bold px-6 py-2.5 hover:bg-copper hover:text-white transition-colors duration-300 shadow-sm"
          >
            {user ? "Go to Dashboard" : "Sign In"}
          </Link>
        </div>

        {/* ── Mobile Menu Toggle Button ── */}
        <div className="flex md:hidden items-center gap-3">
          <ModeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="w-9 h-9 rounded-lg border border-border/60 flex items-center justify-center text-foreground hover:text-copper hover:border-copper/40 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 mt-4 pt-4 pb-6 space-y-4 animate-in fade-in-50 slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 font-sans text-sm font-semibold">
            {NAV_LINKS.map(({ href, label }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-2 py-1.5 rounded-md transition-colors",
                    active
                      ? "text-copper bg-copper/10 font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-2 border-t border-border/30">
            <Link
              href={user ? "/events" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-sans text-xs font-bold py-3 hover:bg-copper hover:text-white transition-colors"
            >
              {user ? "Go to Dashboard" : "Sign In"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
