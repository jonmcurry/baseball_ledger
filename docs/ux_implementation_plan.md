UI/UX Redesign Specification: Heritage Editorial Almanac
Target: 1901-2025 Baseball Simulator Audience: Senior Software Engineers & Senior UX Designers

1. Executive Vision
The primary objective of this redesign is to abandon standard SaaS conventions (cards, sidebars, dashboard grids) entirely. We will architect the frontend as a Living Historical Artifact—a high-end, editorial Almanac or 1920s Broadsheet.

The user should feel they are curating and reading baseball history. Every spacing decision, animation, and typographic choice must reinforce this physical, printed interaction model.

2. Design System Primitives (
tailwind.config.ts
)
2.1 Color Palette (The "Ink and Canvas")
Pure white (#ffffff) and pure black (#000000) are strictly forbidden. The UI must feel like aged, high-quality stock paper printed with fading ink.

background-canvas: #f4f1eb (Warm, sepia off-white baseline).
ink-primary: #1a243b (Deep charcoal/faded navy. Used for headings, main body text, and borders).
ink-secondary: #4a5568 (Faded taupe/gray. Used for secondary stats, meta-information).
accent-crimson: #8b0000 (Subdued red. Used sparingly for stamp effects, active states, strike-throughs, and critical interaction highlights).
2.2 Typography
We are relying on a robust typographic hierarchy in place of boxes and shadows. Provide Fallback fonts in CSS.

Hero / Titles: Playfair Display or Cinzel. Massive scale. Used for page titles, drop caps, and major section breaks.
Body / Narrative Text: Cormorant Garamond. Dense, elegant reading text. Used for generated narratives and descriptive copy.
Data / Tabular: Space Mono or IBM Plex Mono. Used only for alignment in stat tables. Must be size-calibrated against Cormorant to not visually overpower the reading text.
2.3 Borders and Spacing
Borders: Use hairlines. border-width: 1px maximum (or 0.5px if using box-shadow tricks for retina displays).
Shadows: Removed completely. Depth is achieved via typography overlaps, typographic weight, and scale.
Spacing: Extreme negative space. Margins and paddings should double the standard SaaS implementation (e.g., p-12 or p-16 instead of p-6). Asymmetric alignment is encouraged.
3. Structural Archetypes
3.1 The Hub: "Table of Contents"
Goal: Replace the typical "Dashboard Sidebar" with an editorial entry point.

Layout: A 2-column asymmetric split.
Visual Anchor: A massive, faded halftone background image (e.g., a vintage stadium) dominates the left side.
Navigation: The right side acts as an index. Links are laid out vertically using dotted CSS leader lines (e.g., <span class="border-b border-dotted">) connecting the section name to a page number or roman numeral.
3.2 The Draft: "The Registry/Manifest"
Goal: Replace draggable player cards with a dense, interactive manifest.

Layout: A multi-column, newspaper-like text layout. Players are listed by Last Name in Cormorant Garamond with no bounding boxes.
Interaction (Hover): Rather than a tooltip, the list gracefully expands vertically via CSS Grid grid-template-rows transitions or simple max-height easing, revealing a beautifully typeset "footnote" of their stats inline.
Interaction (Drafting): Clicking a player draws a CSS line-through in #8b0000 (crimson) across their name. A smooth motion animation moves their name from the "Available Manifest" to the "Team Ledger" column.
3.3 The Simulation: "The Ticker / Broadsheet"
Goal: Replace standard progress bars with a real-time historical event log.

Layout: A narrow, centrally-aligned stream of text (mimicking a ticker tape or broadsheet column).
Animation: New game results or season events animate upwards smoothly. They don't just appear; they fade in slowly using an opacity and transform: translateY transition.
Highlights: When a major event occurs (championship, record broken), interrupt the ticker flow with a full-width typographic breakout ("STOP THE PRESSES" style), using massive Playfair Display headers.
3.4 Player Profiles: "The Encyclopedia"
Goal: Replace the standard profile panel with a biographical spread.

Layout: The top half is narrative. A massive Drop Cap (3-4 text lines tall) begins their biographical summary.
Data Presentation: Career stats sit at the bottom in an edge-to-edge minimalist table (Space Mono). Use only horizontal rules separating table rows; vertical column dividers are banned.
4. Technical Implementation Steps
Phase 1: Foundation (SWE + UX)
Dependencies: Integrate Playfair Display, Cormorant Garamond, and Space Mono via Google Fonts in 
index.html
.
Tailwind Config: Purge existing colors. Map canvas, ink-primary, ink-secondary, and accent-crimson into 
tailwind.config.ts
. Map the new typography into the fontFamily object.
Global CSS (index.css):
Set the root background-color to the Canvas variable.
Implement the global texture overlay. CRITICAL: Use a lightweight, repeatable SVG noise pattern encoded as a Data URI. Apply it to a pseudo-element on the <body> with mix-blend-mode: multiply and opacity: 0.05 to simulate paper grain.
Strip default focus outlines and replace them with elegant, animated text-decoration underlines.
Phase 2: Component Refactoring (SWE)
Layout Wrapper: Rip out persistent sidebars. Implement a fluid, scrolling wrapper that supports CSS snap-scrolling if treating sections as "pages."
Tables: Build a new LedgerTable component that strictly uses hairline horizontal borders and Space Mono for data cells.
Registry List: Build the expanding inline-accordion for player drafting. Ensure smooth layout shifts using framer-motion (if React) or standard CSS transitions on grid-template-rows.
Phase 3: Motion & Polish (UX)
Entry Animations: Define staggering CSS classes (e.g., .fade-in-up) utilizing animation-delay mapped to nth-child selectors, so lists load sequentially, top-to-bottom.
Strike-through Logic: Implement the drafting animation where a red line draws across the text (using an animating pseudo-element ::after with width: 0% to 100%) before moving the item.
Verification Plan
Automated Checks
Verify Tailwind compilation succeeds with the strict, restricted color palette.
Ensure Lighthouse score remains > 90 (the SVG noise texture should not degrade performance).
UX "Squint Test" (Manual Verification)
The Print Rule: If you take a screenshot of the UI and print it out in black and white (or sepia), it should look indistinguishably like a physical document from the early 1900s.
The Contrast Rule: ink-secon