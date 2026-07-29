# Crenelle Landing Page — Design System & Architecture Specification (`design.md`)

This document presents a comprehensive analysis and architectural reference of the design system, UI components, typography, color palette, interactive behaviors, and visual language used on the **Crenelle Landing Page**.

---

## 1. Executive Summary & Design Philosophy

The Crenelle landing page is built with an **editorial dark luxury aesthetic** combined with modern **glassmorphism**, **copper accent colorways**, high-contrast typography, and **tactile micro-interactions**.

### Design Principles
1. **Tactile Elegance**: High-end materials inspired by dark glass (`bg-card/40 backdrop-blur-xl`), copper metallic highlights (`#BF8430`), and soft ambient lighting mesh glows.
2. **Interactive Proof-of-Capability**: Rather than static text descriptions, features are demonstrated through interactive mini-applications embedded directly into Bento grid cards (e.g. live currency switcher, interactive email dispatch simulation, seat capacity meter, and animated timeline canvas).
3. **Immersive Depth & Motion**: Spring-physics animations powered by `framer-motion`, mouse-driven 3D tilt perspective (`TiltEventCard`), and hover-reactive spotlight glows (`SpotlightCard`).
4. **Pristine Dark & Light Mode Cohesion**: Automatic theme adaptation leveraging Tailwind custom variables, dark/light brand logos, and subtle border lines (`rgba(238,234,227,0.14)`).

---

## 2. Color Palette & Token System

### Core Palette Tokens (`globals.css`)

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `--color-ink` | `#0C0B09` | Dark mode base background (`--background`) |
| `--color-lead` | `#171512` | Dark card surface base (`--card`) |
| `--color-graphite`| `#231F1A` | Dark inset card surface (`.card-inset`) |
| `--color-charcoal`| `#2F2B25` | Dark neutral borders and muted containers |
| `--color-smoke` | `#6E6A62` | Subtle caption text & low-emphasis icons |
| `--color-ash` | `#9E9890` | Muted metadata and draft status pills |
| `--color-cream` | `#D9D4CB` | Secondary text in dark mode |
| `--color-parchment`| `#EEEAE3` | Primary foreground text in dark mode (`--foreground`) |
| `--color-white` | `#F7F5F1` | Bright text highlights |
| `--color-copper` | `#BF8430` | Primary brand accent color, focus rings, primary highlights |
| `--color-copper-light`| `#D4A050`| Hover state for copper elements, status text |
| `--color-copper-dim` | `#8A5F22` | Border glows and subtle copper fills |
| `--color-moss` | `#3A5F3B` | Admitted / Live status background & indicators |
| `--color-ember` | `#7A2E18` | Destructive actions, denied status pills |

### Semantic Status Badges
- **Admitted / Live**: Emerald / Moss background (`bg-emerald-500/10 border-emerald-500/20 text-emerald-400`)
- **VIP / Published**: Gold / Copper highlight (`text-[#BF8430] border-[#BF8430]/40`)
- **Pending / Capacity Alert**: Amber background (`bg-amber-500/10 border-amber-500/20 text-amber-500`)
- **Classes / Formats**: Category pills with rounded-full pill geometry (`rounded-full px-2.5 py-0.5 text-[9px] uppercase font-bold tracking-wider`)

---

## 3. Typography & Hierarchy

Crenelle utilizes a curated font hierarchy to balance editorial prestige with technological precision:

- **Primary Body Font**: `Inter` / System UI Sans (`font-sans`)
- **Display Headings**: High-weight display typography (`font-black`, `tracking-tight`, `leading-[1.02]`)
- **Technical & Metadata**: Monospace font (`font-mono`) used for serial numbers (`PASS-84726-REG`), timestamps (`10:04:12`), rates, and webhook logs.

### Headings Scale
- **Hero Title (`h1`)**: `text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.02] tracking-tight`
- **Section Titles (`h2`)**: `text-3xl md:text-5xl font-black leading-tight tracking-tight`
- **Card Titles (`h3`)**: `text-xl font-bold font-sans` or `text-lg font-bold`
- **Body & Captions**: `text-sm text-muted-foreground leading-relaxed`, metadata at `text-[9px]` to `text-xs`.

---

## 4. Visual Layering & Atmosphere

The background of the landing page uses three decorative layers to create visual depth:

1. **Ambient Glow Spheres**: 
   - Top-left copper mesh: `w-[60vw] h-[60vw] rounded-full bg-copper/8 dark:bg-copper/5 blur-[140px]`
   - Top-right amber glow: `w-[50vw] h-[50vw] rounded-full bg-amber-500/6 blur-[120px]`
   - Bottom-left copper accent: `w-[60vw] h-[60vw] rounded-full bg-copper-light/5 blur-[160px]`
2. **Architectural Grid Lines Overlay**:
   - Subtle geometric grid background using `linear-gradient` with `bg-size-[6rem_6rem]` and low opacity (`opacity-35 dark:opacity-10`).
3. **Film Grain Texture (`.grain::after`)**:
   - Global SVG fractal noise overlay with `opacity: 0.045` providing a tangible photographic texture across dark surfaces.

---

## 5. Page Layout & Section Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ 1. HEADER / NAV (Fixed Backdrop Blur + Brand Logo + CTAs)   │
├─────────────────────────────────────────────────────────────┤
│ 2. IMMERSIVE SPLIT HERO SECTION                             │
│    Left: Value Prop + Action CTAs                           │
│    Right: InteractiveTicketStack (3D Fan Hover Passes)      │
├─────────────────────────────────────────────────────────────┤
│ 3. EVENT FORMAT BENTO GRID SHOWCASE (#showcase)             │
│    TiltEventCard Grid: Salons, Raves, Dinners, Workshops    │
├─────────────────────────────────────────────────────────────┤
│ 4. CAPABILITIES BENTO SHOWCASE (#features)                  │
│    FeaturesGrid: Paystack Multi-Currency, Outbox, Capacity  │
├─────────────────────────────────────────────────────────────┤
│ 5. ACCESS SCANNER INFO (#process)                           │
│    4 Masked Image Cards: Zero Config, Shield, Hub, Expiry   │
├─────────────────────────────────────────────────────────────┤
│ 6. OPERATIONAL PIPELINE (Process Timeline)                  │
│    Vertical Timeline Stepper + Live Interactive Canvas      │
├─────────────────────────────────────────────────────────────┤
│ 7. FINAL CALL-TO-ACTION (CTA)                               │
│    Centric Headline + Ambient Glow + Primary CTA Button     │
├─────────────────────────────────────────────────────────────┤
│ 8. FOOTER                                                   │
│    Brand Mark + Copyright + Operational Navigation Links    │
└─────────────────────────────────────────────────────────────┘
```

---

### Section 1: Header / Navigation
- **Behavior**: Fixed top bar (`fixed top-0 left-0 right-0 z-50`) with translucent glass backdrop (`bg-background/60 backdrop-blur-lg border-b border-border/45`).
- **Brand Logo**: Dual-mode logo image (`/Brand Logos/CRENELLE FULLH W.png` for dark mode, `CRENELLE FULLH B.png` for light mode).
- **Navigation Links**: Anchor links (`#showcase`, `#features`, `#process`) with hover bottom copper underline animation (`group-hover:w-full transition-all duration-300`).
- **Actions**: `ModeToggle` component (dark/light theme toggle) and dynamic Auth CTA button (`Sign In` or `Go to Dashboard`).

---

### Section 2: Immersive Split Hero Section
- **Left Column**:
  - Main Headline: *"Gathering is an art. Host it flawlessly."*
  - Supporting Copy: Highlights event cards, Paystack payouts, email invites, and door check-ins.
  - Primary CTA: Rounded pill button (`bg-foreground text-background font-bold rounded-full hover:bg-copper hover:text-white transition-all`).
  - Secondary CTA: Text link *"Explore formats"*.
- **Right Column (`InteractiveTicketStack`)**:
  - A stacked set of three event passes:
    1. **Art Salon Exhibition Pass** (Regular Admission, `$50.00`)
    2. **Warehouse 09 VIP Pass** (VIP Access Pass, Dark Gold/Copper glass edge, `$75.00`)
    3. **Founders Dinner Feast Pass** (Regular Admission, `$120.00`)
  - **Interaction**: Hovering the container triggers a 3D fan-out animation using Framer Motion spring physics (`rotate`, `x`, `y` active offsets).
  - **Ticket Geometry**: Rounded-3xl cards with dashed tear line, serial codes, event banners, and styled QR code block icons.

---

### Section 3: Event Format Bento Grid Showcase (`#showcase`)
- **Concept**: Bento grid layout illustrating Crenelle’s versatility across event formats.
- **Card Mechanism (`TiltEventCard`)**:
  - Mouse position calculates dynamic `rotateX`, `rotateY` perspective tilt (up to ±8 degrees).
  - Dynamic radial gradient sheen overlay following cursor position (`radial-gradient(circle 200px at glareX glareY)`).
  - Dark gradient backdrop over high-resolution Unsplash event photography.
- **Grid Layout**:
  - **Cell 1 (2 Cols)**: *Creative Salons & Exhibitions* (Rose badge)
  - **Cell 2 (1 Col)**: *Warehouse Raves & Concerts* (Emerald badge)
  - **Cell 3 (1 Col)**: *Founders' Dinners & Feasts* (Amber badge)
  - **Cell 4 (2 Cols)**: *Workshops & Panels* (Copper badge)
  - **Cell 5 (2 Cols)**: *Technology Summits & Keynotes* (Sky badge)
  - **Cell 6 (1 Col)**: *Private Brunches & Meetups* (Amber badge)

---

### Section 4: Capabilities Bento Showcase (`#features`)
- **Card Mechanism (`SpotlightCard`)**:
  - Hovering card renders a tracking radial border spotlight glow (`rgba(191, 132, 48, 0.12)`).
- **Interactive Component (`FeaturesGrid`)**:
  1. **Paystack Infrastructure Card**:
     - Includes a working pill toggle (`NGN` vs `USD`).
     - Toggling currency updates ticket prices live (`₦150,000` / `₦50,000` ↔ `$120.00` / `$50.00`) with smooth Framer Motion `AnimatePresence` transitions and a pulse status dot.
  2. **Branded Outbox Card**:
     - Includes a working *"Send Demo Invite"* interactive button.
     - Clicking triggers simulated API dispatch states (`idle` → `sending` with spinner → `delivered`).
     - Appends simulated recipient webhook logs (`marcus.s@vault.io`, `elena.r@nexus.tech`) to a live audit trail view.
  3. **Capacity Waitlists Card**:
     - Includes a *"Simulate Buy"* button and reset toggle.
     - Dynamically advances attendee meter (`118 / 120 Attendees`).
     - When capacity is reached (`120/120`), badge automatically switches from green `SEATS OPEN` to amber `CAP REACHED` and routes excess clicks to the waitlist counter.

---

### Section 5: Access Scanner Info Section (`#process`)
- **Headline**: *"One-click usher scan clients. No passwords required."*
- **Architecture**: 4 masked feature cards with unique corner clip radii (`rounded-bl-[4rem]`, `rounded-tr-[4.5rem]`, etc.), dark background images, and spring hover offset (`translate-y` lift):
  1. **Zero Configuration**: Smartphone icon, instant browser scanner links.
  2. **Double-Entry Shield**: ShieldCheck icon, duplicate ticket prevention.
  3. **Live Coordinator Hub**: Activity icon, real-time multi-gate sync.
  4. **Dynamic Expiry**: Clock icon, automatic gate closure link invalidation.

---

### Section 6: Operational Pipeline (`ProcessTimeline`)
- **Headline**: *"The hosting lifecycle."* (Stages 01 - 04)
- **Left Stepper**:
  - Vertical progress track with a dynamic copper indicator line updating height based on active step.
  - Auto-play rotation timer (switches active stage every 8 seconds if unclicked).
  - Stages:
    - **01 Configure Tiers & Caps**
    - **02 Dispatch Invite Campaigns**
    - **03 Authorize Check-ins**
    - **04 Inspect Gate Logs**
- **Right Presentation Canvas**:
  - Interactive UI mockups that swap based on selected stage:
    - **Stage 01 Canvas**: Interactive tier creation card (`VIP Premium Pass`, `$120.00 USD`, Paystack status badge).
    - **Stage 02 Canvas**: Email invitation preview card with QR pass layout and zero-bounce badge.
    - **Stage 03 Canvas**: Live camera scanner viewfinder simulation with animated scanning laser line (`animate-spin/linear`), target corner brackets, and animated *"TICKET VERIFIED"* overlay banner.
    - **Stage 04 Canvas**: Audit metrics dashboard with check-in velocity metric cards and an SVG smoothed line graph showing arrival velocity curves over time.

---

### Section 7: Final Call to Action & Footer
- **CTA Section**:
  - Headline: *"Focus on gathering. We’ll manage the door."*
  - Prominent primary CTA button: *"Initialize Event Free"* with arrow icon.
  - Micro-copy: `NO CREDIT CARD REQUIRED // FULL SYSTEM ACCESS`.
- **Footer**:
  - Dark glass surface (`bg-card/40 border-t border-border/40`).
  - Crenelle logo badge with QR icon.
  - Copyright line: `© 2026 CRENELLE SECURITY & TICKETING SERVICES. ALL RIGHTS RESERVED.`
  - Direct section anchor navigation links.

---

## 6. Key UI Components Reference Summary

| Component | File Path | Primary Function | Key Features |
| :--- | :--- | :--- | :--- |
| `LandingPageClient` | [landing-page-client.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/app/landing-page-client.tsx) | Page Root Container | Layout mesh, navigation, section arrangement, animations |
| `InteractiveTicketStack` | [interactive-ticket-stack.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/components/landing/interactive-ticket-stack.tsx) | Hero Graphic | 3D ticket fanning, Framer Motion spring physics, QR cutouts |
| `TiltEventCard` | [tilt-event-card.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/components/landing/tilt-event-card.tsx) | Format Bento Card | Perspective 3D rotation, dynamic glare follow effect |
| `SpotlightCard` | [spotlight-card.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/components/landing/spotlight-card.tsx) | Capability Bento Card | Radial mouse border glow effect |
| `FeaturesGrid` | [features-grid.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/components/landing/features-grid.tsx) | Capabilities Suite | Currency switcher, live email demo, capacity simulator |
| `ProcessTimeline` | [process-timeline.tsx](file:///c:/Users/olana/OneDrive/Documents/crenelle/components/landing/process-timeline.tsx) | Pipeline Stepper | Animated vertical track, live UI canvas state previews |
