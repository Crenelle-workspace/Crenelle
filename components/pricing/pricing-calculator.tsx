"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Currency = "NGN" | "USD";

export function PricingCalculator() {
  const [currency, setCurrency] = useState<Currency>("NGN");
  const [ticketPrice, setTicketPrice] = useState<number>(15000);
  const [attendees, setAttendees] = useState<number>(120);

  // Switch defaults when changing currency
  const handleCurrencyChange = (newCurr: Currency) => {
    setCurrency(newCurr);
    if (newCurr === "USD") {
      setTicketPrice(35);
    } else {
      setTicketPrice(15000);
    }
  };

  const isNgn = currency === "NGN";
  const currencySymbol = isNgn ? "₦" : "$";

  // Calculations
  const grossSales = ticketPrice * attendees;
  const crenelleFee = grossSales * 0.03; // 3% flat fee

  // Estimated Paystack processing:
  // NGN: 1.5% + NGN 100 per transaction, capped at NGN 2000 per transaction
  // USD: 3.9% per transaction
  const estProcessingPerTx = isNgn
    ? Math.min(ticketPrice * 0.015 + (ticketPrice >= 2500 ? 100 : 0), 2000)
    : ticketPrice * 0.039;
  const totalProcessing = estProcessingPerTx * attendees;

  const netPayout = Math.max(0, grossSales - crenelleFee - totalProcessing);

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: isNgn ? 0 : 2,
      maximumFractionDigits: isNgn ? 0 : 2,
    }).format(num);
  };

  return (
    <div className="w-full max-w-full rounded-3xl border border-copper/30 bg-card/60 backdrop-blur-xl p-6 sm:p-8 md:p-12 shadow-xl space-y-8 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-foreground">Earnings Calculator</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Estimate your net bank payout with complete 3% fee transparency.
          </p>
        </div>

        {/* Currency Toggle */}
        <div className="flex items-center self-start sm:self-auto rounded-full bg-secondary/80 p-1 border border-border/50 shrink-0">
          <button
            type="button"
            onClick={() => handleCurrencyChange("NGN")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-bold transition-all",
              isNgn
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            NGN (₦)
          </button>
          <button
            type="button"
            onClick={() => handleCurrencyChange("USD")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-bold transition-all",
              !isNgn
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            USD ($)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Sliders and Controls */}
        <div className="space-y-6 w-full max-w-full">
          {/* Ticket Price */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-semibold">
              <label htmlFor="ticket-price-input" className="text-foreground">
                Ticket Price ({currency})
              </label>
              <span className="font-mono text-copper font-bold text-base">
                {currencySymbol}
                {formatAmount(ticketPrice)}
              </span>
            </div>
            <input
              id="ticket-price-input"
              type="range"
              min={isNgn ? 1000 : 5}
              max={isNgn ? 150000 : 300}
              step={isNgn ? 1000 : 5}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value))}
              className="w-full accent-[#BF8430] bg-secondary rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>{currencySymbol}{isNgn ? "1,000" : "5"}</span>
              <span>{currencySymbol}{isNgn ? "150,000" : "300"}</span>
            </div>
          </div>

          {/* Attendees Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-semibold">
              <label htmlFor="attendees-input" className="text-foreground">
                Expected Attendees
              </label>
              <span className="font-mono text-copper font-bold text-base">
                {attendees} guests
              </span>
            </div>
            <input
              id="attendees-input"
              type="range"
              min={10}
              max={1000}
              step={10}
              value={attendees}
              onChange={(e) => setAttendees(Number(e.target.value))}
              className="w-full accent-[#BF8430] bg-secondary rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
              <span>10 guests</span>
              <span>1,000 guests</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-copper/5 border border-copper/20 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-copper shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ticket sales settle directly into your verified bank account via Paystack on a standard T+1 schedule.
            </p>
          </div>
        </div>

        {/* Calculation Result Breakdown Card */}
        <div className="rounded-2xl border border-border/60 bg-background/80 p-6 md:p-8 space-y-6 shadow-inner w-full max-w-full">
          <div className="space-y-1">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Estimated Net Payout
            </p>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
              {currencySymbol}
              {formatAmount(netPayout)}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-border/40 text-xs font-sans">
            <div className="flex justify-between text-muted-foreground">
              <span>Gross Ticket Sales</span>
              <span className="font-mono font-semibold text-foreground">
                {currencySymbol}
                {formatAmount(grossSales)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Crenelle Platform Fee (3%)</span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                - {currencySymbol}
                {formatAmount(crenelleFee)}
              </span>
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Est. Paystack Processing</span>
              <span className="font-mono font-semibold text-muted-foreground">
                - {currencySymbol}
                {formatAmount(totalProcessing)}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-copper" />
              Direct Paystack Settlement
            </div>
            <a
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-copper hover:underline underline-offset-4"
            >
              Start Hosting <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
