# The Baseball Almanac: Complete UI/UX Architecture Redesign
**Project:** Baseball Ledger Simulator (1901-2025)
**Aesthetic Direction:** Heritage Editorial 
**Audience:** Senior Software Engineers & Senior UX Designers

---

## 1. Executive Vision: "The Living Archive"
This redesign completely abandons the "SaaS Dashboard" paradigm (cards, sidebar navigation, widgets). The entire web application will be re-architected to feel like a high-end, interactive **Historical Periodical and Almanac**. 

Users are not "managing data" on a screen; they are reading through beautifully typeset artifacts of baseball history spanning from the dead-ball era to the modern day. Every structural decision must prioritize reading flow, negative space, and typographic hierarchy over bounding boxes and grids.

---

## 2. Global Design Primitives (The "Ink and Paper")
These CSS tokens must be strictly mapped into `tailwind.config.ts`. Ad-hoc hex values are banned within component files.

### 2.1 Colors
*   **The Canvas (Background):** `var(--canvas)` -> `#f4f1eb` (Warm, sepia off-white baseline).
*   **The Ink (Primary Text/Borders):** `var(--ink-primary)` -> `#1a243b` (Deep faded navy). Pure black `#000000` is forbidden.
*   **The Muted Ink (Secondary Text):** `var(--ink-secondary)` -> `#4a5568` (Faded taupe/gray).
*   **The Accent (Interactive States):** `var(--accent)` -> `#8b0000` (Subdued crimson red).

### 2.2 Typography
Standard sans-serifs (Inter, Roboto, Arial) are banned.
*   **Display / Hero (`font-display`):** `Playfair Display, serif` or `Cinzel, serif`. Used for massive titles, drop caps.
*   **Narrative / Body (`font-body`):** `Cormorant Garamond, serif`. Used for all standard text.
*   **Tabular / Data (`font-mono`):** `Space Mono, monospace` or `IBM Plex Mono, monospace`. Used *only* for alignment in data tables and numerical output.

### 2.3 Geometry & Borders
*   `borderWidth`: Redefine standard Tailwind borders to hairline values (e.g., `1px`, `0.5px`).
*   `borderRadius`: Override to `0px` globally (`rounded-none`). No rounded corners.
*   `boxShadow`: Override to `none` globally. No floating elements.

### 2.4 The Texture
A global SVQ noise pseudo-element must be applied to the `<body>`.
```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,..."); /* Lightweight noise pattern */
  opacity: 0.05;
  mix-blend-mode: multiply;
  z-index: 9999;
}
```

---

## 3. Motion & Interaction Guidelines
The application must feel heavy, deliberate, and physical.
*   **Easing Curves:** Avoid snappy, elastic bezier curves. Use slow, dramatic eases: `cubic-bezier(0.25, 1, 0.5, 1)`.
*   **Hover States:** Instead of background-color shifts or scale bumps, use `text-decoration-color: var(--accent)` or subtly adjust `opacity`.
*   **Staggered Reveals:** Use CSS `animation-delay` or Framer Motion variants to ensure lists and paragraphs "cascade" into view, simulating the process of typesetting.
*   **The Strike-through:** When drafting a player, animate a `::before` pseudo-element with `var(--accent)` striking across the `Cormorant Garamond` text.

---

## 4. View-by-View Architectural Blueprints

### View 1: The Hub ("The Index / Table of Contents")
*Replaces the standard Dashboard and Sidebar Navigation.*
*   **State / Routing:** Must feel like turning to sections of a massive book rather than navigating a SPA. Consider implementing View Transitions API or Framer Motion `AnimatePresence`.
*   **Layout:** An asymmetric, 2-column spread. A massive, faded, halftone-style image anchors the left side of the screen.
*   **Navigation Elements:** Massive `Playfair Display` titles on the right. Connected to "page numbers" via dotted CSS leader lines (`border-bottom: 2px dotted var(--ink-muted)`).

### View 2: The Draft Room ("The Registry")
*Replaces the draggable-card UI or data-grid draft board.*
*   **Layout:** A dense, multi-column CSS newspaper layout (`columns-2` or `columns-3` based on breakpoint). 
*   **Component Structure:**
    *   `<PlayerListing>`: Text only. On hover, triggers the expansion of a tightly-coupled `<PlayerFootnote>` containing vital stats. Use CSS Grid `grid-template-rows: 0fr -> 1fr` for the expand animation.
    *   **Action:** Clicking triggers the "Strike-through" animation, fires the draft Redux/Zustand action, and uses Framer Motion `layoutId` to smoothly animate the name flying down to the pinned `<TeamManifest>`.

### View 3: Roster Management ("The Ledger")
*Replaces the standard roster table.*
*   **Layout:** A massive, centrally-aligned `<table className="w-full max-w-5xl mx-auto">`.
*   **Styling Rules:** Use `font-mono` on all table cells (`<td>`). Implement strict `border-b border-ink-primary` horizontal rules. `border-l` and `border-r` are forbidden.
*   **Hierarchies:** Separate the Starting Lineup, Bullpen, and Bench using thick double-borders (`border-y-4 border-double`) or generous vertical margin gaps, mimicking accounting sub-ledgers.

### View 4: Simulation UI ("The Broadsheet / Ticker")
*Replaces basic loading bars or instant-result screens.*
*   **State Management:** The simulation engine should yield events to an array in state sequentially, rather than dumping them all at once.
*   **Layout:** A centralized `<EventLog>` component that functions like a ticker tape.
*   **Animation Details:** New `<GameEvent>` items are prepended to the top of the list. They enter with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.
*   **Interrupts:** Critical events (Championships, Records) trigger a `<HeadlineInterrupt>`. This component absolute-positions a full-viewport `Playfair Display` headline that overtakes the entire screen temporarily before fading back into the ticker flow.

### View 5: Player Profiles ("The Encyclopedia")
*Replaces the standard left-panel image, right-panel stats view.*
*   **Layout & Flow:** A single-column, long-scroll editorial article. 
*   **The Hero Area:** Uses a massive Drop Cap (e.g., `<span className="float-left text-7xl font-display leading-none mr-3">A</span>`). The player image must have a CSS `mask-image` applied (or be pre-processed as a halftone/duotone) to blend directly into the `<canvas>` background, removing sharp image edges.
*   **The Data:** Career stats live at the very bottom in a wide, edge-to-edge minimalist table (`font-mono`).

### View 6: League History & Standings ("The Archives")
*Replaces standard datatables with pagination.*
*   **Thematic Adaptation:** The UX Designer/SWE should map a `data-era` attribute to the root DOM based on the year being viewed (e.g., `data-era="deadball"` for 1901-1919).
*   **CSS Variables (Implementation):** Update the CSS variable values natively based on the `data-era` (e.g., increasing the opacity of the `var(--texture)` or darkening the `var(--canvas)` for older eras).

---

## 5. Accessibility (a11y) Requirements
Even as a vintage artifact, it must remain accessible.
*   **Contrast Ratios:** The SWE must ensure `var(--ink-secondary)` (${`#4a5568`}) paired against `var(--canvas)` (${`#f4f1eb`}) hits WCAG AA standards (4.5:1).
*   **Focus States:** We banned `outline` styles. The SWE must implement custom `:focus-visible` styles utilizing `text-decoration` or thin border-bottoms to ensure keyboard navigability is unbroken.

---

## 6. Suggested Phasing for Implementation
1.  **Phase 1 (SWE):** Nuke the existing Tailwind config. Configure the strict `colors`, `fontFamily`, global spacing, and the CSS SVG noise overlay.
2.  **Phase 2 (SWE/UX):** Establish the root `<Layout>` shell (abandoning the sidebar paradigm for the fluid, book-like scroll). Build universal typography components (`<DropCap>`, `<Headline>`, `<TabularData>`).
3.  **Phase 3 (SWE):** Re-architect the critical views: The Hub (Table of Contents), The Draft Room (Classifieds layout), and The Ledger (Monospace Table).
4.  **Phase 4 (UX/SWE):** Finalize the motion layer using Framer Motion or pure CSS (`animation-delay` cascades, strike-through clicks, Ticker "Stop the Presses" headlines).