"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Mail,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const FAQ_DATA: FaqItem[] = [
  // ── Category: Tickets & Pricing ──
  {
    id: "pricing-cost",
    category: "Tickets & Pricing",
    question: "How much does Crenelle cost to use?",
    answer:
      "Crenelle is 100% free for free and RSVP events — including unlimited guests, QR passes, email invitations, reminders, and browser scanner links. For paid ticket sales, we charge a simple 5% platform commission per ticket plus standard Paystack processing. There are no monthly subscription fees, setup costs, or contracts.",
  },
  {
    id: "pricing-processing-fee",
    category: "Tickets & Pricing",
    question: "Who pays the payment processing fee?",
    answer:
      "Payment processing is powered directly by Paystack. Depending on your configuration, Paystack fees can be absorbed by the organizer or passed on transparently at checkout. You see the exact gross volume and net payout breakdown directly in your event financial dashboard.",
  },
  {
    id: "pricing-free-limits",
    category: "Tickets & Pricing",
    question: "Is there a limit on how many free guests I can register?",
    answer:
      "No. There are no artificial attendee limits on free events. Whether you are hosting an intimate 20-person salon or a 1,000-person community meetup, you can issue passes and scan everyone at the door for free.",
  },

  // ── Category: Payouts & Banking ──
  {
    id: "payouts-timing",
    category: "Payouts & Banking",
    question: "When and how do I receive ticket payouts?",
    answer:
      "Ticket revenues are settled directly into your connected bank account via Paystack's automated settlement infrastructure. In Nigeria (NGN), Paystack settles on a standard T+1 schedule (the next business day). For other currencies and international accounts, settlement follows Paystack's standard regional schedule.",
  },
  {
    id: "payouts-bank-connect",
    category: "Payouts & Banking",
    question: "How do I connect my bank account to receive payouts?",
    answer:
      "Go to Settings > Payments in your Crenelle dashboard. Select your bank, enter your account number, and Crenelle instantly creates and links your Paystack subaccount. All subsequent ticket sales automatically route net revenues to that account.",
  },
  {
    id: "payouts-currencies",
    category: "Payouts & Banking",
    question: "Which currencies and countries are supported?",
    answer:
      "Through Paystack integration, Crenelle supports payments and settlements in Nigerian Naira (NGN), US Dollar (USD), Ghanaian Cedi (GHS), Kenyan Shilling (KES), and South African Rand (ZAR). Organizers across Africa and globally can sell tickets to local and international attendees.",
  },

  // ── Category: Refunds & Cancellations ──
  {
    id: "refunds-policy",
    category: "Refunds & Cancellations",
    question: "What is Crenelle's refund policy?",
    answer:
      "Event organizers set and maintain their own refund policies. Because ticket funds settle directly to your bank account, you have full control over approving and issuing refunds to your attendees. When a refund is granted, the corresponding QR entry pass is automatically revoked to prevent door entry.",
  },
  {
    id: "refunds-cancellation",
    category: "Refunds & Cancellations",
    question: "What happens if my event is cancelled or rescheduled?",
    answer:
      "If you need to postpone or cancel an event, you can send an automated email broadcast to all registered guests with a single click from your event dashboard. For paid events, you can initiate refunds to all ticket holders directly.",
  },
  {
    id: "refunds-disputes",
    category: "Refunds & Cancellations",
    question: "How are chargebacks and payment disputes handled?",
    answer:
      "In the rare event of a payment chargeback, Paystack provides an evidence submission flow. We retain detailed transaction references, timestamps, and pass delivery audit trails so you have proof of purchase and credential issuance.",
  },

  // ── Category: Door Access & Scanning ──
  {
    id: "access-no-app",
    category: "Door Access & Scanning",
    question: "Do ushers and gate staff need to download an app or log in?",
    answer:
      "No! This is one of Crenelle's biggest advantages. You generate a secure Scanner Link in your dashboard and share it over WhatsApp or SMS. Gate staff simply click the link in any mobile phone browser (Safari, Chrome) to start scanning QR codes immediately — no passwords, app stores, or training required.",
  },
  {
    id: "access-duplicates",
    category: "Door Access & Scanning",
    question: "Can a guest share their QR pass with someone else or reuse it?",
    answer:
      "No. Each QR pass is completely unique. Once scanned and admitted at the door, any duplicate attempt to scan the same pass immediately flashes a bright RED warning showing 'TICKET ALREADY USED' along with the exact time of the original check-in.",
  },
  {
    id: "access-party-size",
    category: "Door Access & Scanning",
    question: "How do group tickets and party sizes work at check-in?",
    answer:
      "A single pass can be set for 1 to any number of guests (e.g. VIP Table of 4). When scanned, ushers can admit the full group or check in members one by one as they arrive. The scanner automatically keeps count across all gates so no one enters past your limit.",
  },
  {
    id: "access-offline",
    category: "Door Access & Scanning",
    question: "What happens if internet connectivity at the venue is weak?",
    answer:
      "The scanner is built to be lightweight and fast, processing passes instantly even on slow mobile data or weak venue Wi-Fi so lines never stall at the door.",
  },

  // ── Category: Guest Management & Invites ──
  {
    id: "guests-csv-import",
    category: "Guest Management & Invites",
    question: "Can I import an existing guest list from a spreadsheet?",
    answer:
      "Yes! You can upload an Excel/CSV file containing guest names, emails, phone numbers, and party sizes. Crenelle automatically creates guest profiles and lets you send out personalized QR invitations with one click.",
  },
  {
    id: "guests-custom-email",
    category: "Guest Management & Invites",
    question: "Can I customize the email invitations with my brand?",
    answer:
      "Yes. You can upload custom event cover banners, choose curated email color themes, and configure your organization's custom sender name and reply-to email address so invitations feel completely native to your brand.",
  },
  {
    id: "guests-open-vs-closed",
    category: "Guest Management & Invites",
    question: "What is the difference between Open and Closed events?",
    answer:
      "Closed events are invite-only: only attendees on your curated guest list receive invitations and access passes. Open events provide a public registration page where anyone can RSVP or purchase tickets, with optional approval rules to screen attendees before passes are issued.",
  },
  {
    id: "guests-reports-export",
    category: "Guest Management & Invites",
    question: "Can I download post-event reports and export attendee data?",
    answer:
      "Yes! You can download full CSV/Excel exports of your guest list with exact check-in times and entrance gates. You can also generate a 1-click executive PDF summary report featuring arrival rate charts, peak check-in windows, ticket revenue breakdowns, and registration survey summaries to share with your team or sponsors.",
  },

  // ── Category: Security & Privacy ──
  {
    id: "security-privacy",
    category: "Security & Privacy",
    question: "Is guest personal data secure and private?",
    answer:
      "Yes. Your attendee data belongs entirely to you. We operate under strict privacy standards, and we never sell, share, or use your guests' contact details to promote other events.",
  },
  {
    id: "security-cohosts",
    category: "Security & Privacy",
    question: "Can I invite team members and co-hosts with restricted permissions?",
    answer:
      "Yes. You can invite team members with specific roles: Viewer (view live attendance numbers), Scanner Manager (manage door checkpoints and scanner links), or Co-Organiser (full event management).",
  },
];

const CATEGORIES = [
  "All",
  "Tickets & Pricing",
  "Payouts & Banking",
  "Refunds & Cancellations",
  "Door Access & Scanning",
  "Guest Management & Invites",
  "Security & Privacy",
];

export function FaqClient() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("pricing-cost");

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-10 w-full max-w-full overflow-hidden">
      {/* ── Search & Filter Controls ── */}
      <div className="space-y-6 max-w-3xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search questions (e.g. payouts, refund policy, scanner link, currencies)..."
            className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-card/70 border border-border/60 text-sm font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-copper/50 focus:border-copper transition-all shadow-md"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono uppercase text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter Pills Container */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max px-1">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 border",
                    active
                      ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                      : "bg-card/40 border-border/40 text-muted-foreground hover:text-foreground hover:border-copper/40"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FAQ List ── */}
      <div className="max-w-3xl mx-auto space-y-3.5 w-full">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-16 rounded-3xl border border-dashed border-border/60 p-8 space-y-3">
            <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-base font-bold text-foreground">No matching questions found</p>
            <p className="text-xs text-muted-foreground">
              Try searching with different keywords, or reach out to our team directly.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-copper hover:underline underline-offset-4 pt-2"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = expandedId === faq.id;
            return (
              <div
                key={faq.id}
                className={cn(
                  "rounded-2xl border transition-all duration-300 overflow-hidden",
                  isOpen
                    ? "border-copper/40 bg-card/80 shadow-md ring-1 ring-copper/20"
                    : "border-border/50 bg-card/40 hover:border-border/80"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="w-full px-6 py-4.5 flex items-center justify-between text-left gap-4"
                  aria-expanded={isOpen}
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-copper font-bold">
                      {faq.category}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground shrink-0 transition-transform duration-300",
                      isOpen && "rotate-180 bg-copper/10 text-copper border-copper/30"
                    )}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/30">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Direct Support Contact Card ── */}
      <div className="max-w-3xl mx-auto rounded-3xl border border-copper/30 bg-linear-to-br from-copper/10 to-card/60 p-6 sm:p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl w-full">
        <div className="space-y-1.5 text-center sm:text-left">
          <h4 className="text-lg sm:text-xl font-bold text-foreground">Still have a question?</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            We respond promptly to organizer inquiries regarding custom events, bulk volume, and gate logistics.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
          <a
            href="mailto:support@crenelle.org"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-border/60 bg-card text-xs font-bold text-foreground hover:text-copper hover:border-copper/40 transition-colors shadow-sm"
          >
            <Mail className="w-3.5 h-3.5 text-copper" />
            Email Us
          </a>
          <a
            href="https://wa.me/2349014724115"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
