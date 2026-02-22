# Baseball Ledger: UI/UX Redesign Proposal

## Goal Description
The current UI features a solid foundation with "Vintage Baseball Ledger" design tokens (creams, parchments, stitch colors, Teko/IBM Plex mono fonts) utilizing React + Tailwind CSS. To elevate this project into an *unforgettable* and genuinely designed experience (per the design rules), we are committing to a **bold, uncompromising aesthetic direction: Heritage Editorial**.

## Selected Direction: "Heritage Editorial"
**Vibe:** A premium, 1920s newspaper sports section or a high-end luxury coffee table book. Quiet, elegant, relying heavily on dramatic typography and extreme negative space rather than noisy graphics.

### 1. Typography (The Core Pillar)
This design relies on beautiful typography to carry the visual weight. Generic fonts are strictly banned.
*   **Display / Headers:** `Playfair Display` or `Cinzel` (elegant, dramatic serifs for module titles, player names, and impact typography).
*   **Body / Narrative:** `Cormorant Garamond` (gives a refined, reading-centric newspaper feel).
*   **Data / Stats:** `Space Mono` or `IBM Plex Mono` (utilized sparingly, *only* for tabular data to ensure alignment and readability against the fluid serifs).

### 2. Color Palette & Theme
Instead of pure blacks and whites, we will use tinted, physical color palettes that evoke high-end print.
*   **Background (Canvas):** `#f4f1eb` (A sepia-tinted, warm off-white. Not bright, not stark).
*   **Primary Text (Ink):** `#1a243b` (A deep, faded navy blue or charcoal, reminiscent of aged print ink).
*   **Accent (Stitch/Highlight):** `#8b0000` (A deep, subdued crimson red, used only for critical interactions, key stats, or subtle dividers).
*   **Secondary/Muted:** Faded taupes and warm grays for secondary information.

### 3. Spatial Composition
We will abandon standard SaaS dashboard layouts.
*   **Extreme Whitespace:** Elements need room to breathe. Generous paddings and margins.
*   **Asymmetry:** Breaking out of neat 12-column grids when appropriate (e.g., a massive player image overlapping a text column).
*   **Editorial Framing:** Using thin, refined CSS dividing lines between stats instead of heavy drop-shadow cards.
*   **Huge Drop Caps & Pull Quotes:** Using classical editorial techniques for prominent stats or narrative text.

### 4. Motion & Textural Details
*   **Animation:** Exceedingly smooth, slow, staggered fade-ins. Using `animation-delay` to gracefully orchestrate page entry. No bouncy or sudden transitions.
*   **Texture:** A subtle, CSS-only noise or grain overlay (`mix-blend-mode: multiply`) covering the entire viewport to give the "digital paper" physical texture.
*   **Interaction:** Smooth hover states that slightly dim non-hovered elements or gracefully underline text using custom `text-decoration-thickness`.

---

## Proposed Changes

To implement this, the following files will be the primary targets.

### Configuration & Design System
*   **[MODIFY] [tailwind.config.ts](file:///c:/Users/jonmc/dev/baseball_ledger/tailwind.config.ts)**: Rip out the existing font families and inject the new editorial fonts. Overhaul the `colors` object to strictly enforce the Heritage Editorial palette (removing any neon, harsh, or conflicting legacy colors).
*   **[MODIFY] [index.html](file:///c:/Users/jonmc/dev/baseball_ledger/index.html)**: Update Google Fonts import tags to load `Playfair Display`, `Cormorant Garamond`, and `Space Mono`.

### Global Styling & Layout
*   **[MODIFY] `src/index.css`**: Implement the global CSS noise overlay. Define the smooth animation keyframes. Set base typography styling on the `<body>`.
*   **[MODIFY] [src/App.tsx](file:///c:/Users/jonmc/dev/baseball_ledger/src/App.tsx) (or root layout):** Adjust the root structural containers to remove SaaS-style sidebars/headers if they conflict with the editorial layout, shifting to a more magazine-style scroll flow.

### Core Components
*   **(Pending Exploration):** We will identify the primary stat card or ledger table component and refactor it away from "card" styling (borders + shadows) into "editorial" styling (rules + typography spacing).

## Verification Plan

### Automated Tests
*   Run the Vite development server to ensure no Tailwind config errors.
*   Verify the build step succeeds with the new configuration.

### Manual Verification
*   **The "Squint Test":** Ensure the overall composition immediately reads as a luxury print editorial rather than a standard web app.
*   **Typography Check:** Confirm varying font weights load correctly and that `Space Mono` aligns the tabular data properly.
*   **Contrast Check:** Ensure the navy ink on off-white background passes accessibility contrast standards while maintaining the vintage feel. 

---

## Next Steps Prompt
Let me know if this updated Heritage Editorial plan aligns with your vision. If approved, I will begin EXECUTION mode, starting with the Tailwind configuration and font imports.
