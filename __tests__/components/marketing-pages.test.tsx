import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AboutPage, { metadata as aboutMetadata } from "@/app/about/page";
import PricingPage, { metadata as pricingMetadata } from "@/app/pricing/page";
import FaqPage, { metadata as faqMetadata } from "@/app/faq/page";
import { PricingCalculator } from "@/components/pricing/pricing-calculator";
import { FaqClient } from "@/components/faq/faq-client";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Marketing & Trust Pages", () => {
  describe("About Page (/about)", () => {
    it("exports proper metadata and title", () => {
      expect(aboutMetadata.title).toContain("About Us");
      expect(aboutMetadata.description).toContain("Lagos, Nigeria");
    });

    it("renders founder and co-founder information correctly", () => {
      render(<AboutPage />);
      expect(screen.getByText("David Gbadamosi")).toBeDefined();
      expect(screen.getByText("Founder")).toBeDefined();
      expect(screen.getByText("Jeremiah Ogunleye")).toBeDefined();
      expect(screen.getByText("Co-Founder & Technical Lead")).toBeDefined();
      expect(screen.getByText("Crenelle Technologies")).toBeDefined();
    });

    it("renders company origin and trust metrics", () => {
      render(<AboutPage />);
      expect(screen.getByText("Our Origin Story")).toBeDefined();
      expect(screen.getByText("0")).toBeDefined();
      expect(screen.getByText("App Installs Needed")).toBeDefined();
      expect(screen.getByText("Gate Verification")).toBeDefined();
    });
  });

  describe("Pricing Page (/pricing)", () => {
    it("exports proper metadata and title", () => {
      expect(pricingMetadata.title).toContain("Pricing");
      expect(pricingMetadata.description).toContain("5% flat fee");
    });

    it("renders all three pricing tiers and feature table", () => {
      render(<PricingPage />);
      expect(screen.getByText("Free & Community")).toBeDefined();
      expect(screen.getByText("Paid Events")).toBeDefined();
      expect(screen.getByText("Enterprise & Scale")).toBeDefined();
      expect(screen.getByText("Compare Plan Features")).toBeDefined();
    });
  });

  describe("PricingCalculator Component", () => {
    it("calculates NGN earnings with 5% platform fee", () => {
      render(<PricingCalculator />);
      expect(screen.getByText("Calculate Your Event Earnings")).toBeDefined();
      expect(screen.getByText("Estimated Net Payout")).toBeDefined();
      expect(screen.getByText("Crenelle Platform Fee (5%)")).toBeDefined();
    });

    it("switches currency between NGN and USD", () => {
      render(<PricingCalculator />);
      const usdButton = screen.getByRole("button", { name: "USD ($)" });
      fireEvent.click(usdButton);
      expect(screen.getByText("Ticket Price (USD)")).toBeDefined();
    });
  });

  describe("FAQ Page (/faq) & FaqClient", () => {
    it("exports proper FAQ metadata and renders full page", () => {
      expect(faqMetadata.title).toContain("Frequently Asked Questions");
      render(<FaqPage />);
      expect(screen.getByText("Knowledge Base & Support")).toBeDefined();
    });

    it("renders categorized questions and filters on search", () => {
      render(<FaqClient />);
      expect(screen.getByText("How much does Crenelle cost to use?")).toBeDefined();

      const searchInput = screen.getByPlaceholderText(/Search questions/i);
      fireEvent.change(searchInput, { target: { value: "refund" } });

      expect(screen.getByText("What is Crenelle's refund policy?")).toBeDefined();
    });

    it("filters questions by category pill and searches reports", () => {
      render(<FaqClient />);
      const searchInput = screen.getByPlaceholderText(/Search questions/i);
      fireEvent.change(searchInput, { target: { value: "reports" } });

      expect(
        screen.getByText("Can I download post-event reports and export attendee data?")
      ).toBeDefined();
    });
  });

  describe("Navigation & Footer", () => {
    it("renders SiteHeader with all navigation links", () => {
      render(<SiteHeader />);
      expect(screen.getByText("Pricing")).toBeDefined();
      expect(screen.getByText("About")).toBeDefined();
      expect(screen.getByText("FAQ")).toBeDefined();
    });

    it("renders SiteFooter with structured Product and Company columns", () => {
      render(<SiteFooter />);
      expect(screen.getByText("Product")).toBeDefined();
      expect(screen.getByText("Company")).toBeDefined();
      expect(screen.getByText("About & Team")).toBeDefined();
      expect(screen.getByText("Pricing")).toBeDefined();
    });
  });
});
