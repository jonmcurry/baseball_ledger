Baseball Ledger: UI/UX Design Specification
1. Design Philosophy: "The Digital Almanac"
The interface should feel like a high-end digital version of a classic baseball encyclopedia or a leather-bound ledger. It maintains a vintage vibe through texture and typography while providing the instantaneous performance of a modern React app.

Visual Identity
Color Palette:

Background: #FDF5E6 (Old Lace) - A warm, paper-like cream to reduce eye strain and feel historical.

Primary: #1B4D3E (Deep Ballpark Green) - Used for headers and primary buttons.

Accent: #B22222 (Stitch Red) - Used for alerts, active states, and call-to-actions.

Secondary: #D2B48C (Tan/Sandstone) - For borders and card backgrounds.

Typography:

Headlines: Slab-Serif (e.g., Roboto Slab or Alfa Slab One) for a "varsity" or newspaper headline feel.

Data/Stats: High-readability Monospace (e.g., JetBrains Mono) for tables to ensure columns align perfectly, mimicking printed record books.

2. Component Architecture
A. The "Ledger" Dashboard (Main View)
Layout: A centered, max-width container with a subtle drop shadow and a "book-spine" border on the left.

Stat Master Module: * Displays League Schedule and Standings side-by-side.

Instant Sim: A "Simulate" button group (Day/Week/Month/Season) that triggers immediate background processing, followed by a "Typewriter" effect notification of results.

Advanced Analytics Toggle: A vintage-style toggle switch to flip between "Traditional" (AVG, HR, ERA) and "Advanced" (WAR, OPS+, FIP) stats derived from Batting.csv and Pitching.csv.

B. Player & Team Management
Roster View: A tactical layout showing the field positions. Users can drag-and-drop players into the 1st Base, 2nd Base, etc., slots as defined in the roster rules.

Player Profiles: Clicking a player (linked via playerID from People.csv) opens a "Digital Baseball Card" modal featuring their full historical name and a career stat line.

C. League Creation & Security
The "Draft Board": During the randomized draft, use a vertical scrolling ticker to show players being assigned to teams based on the AI strategy (Prioritizing SP and up-the-middle defense).

Secure Invitation: To join a league, the system will generate a 12-character cryptographic hash key. The UI should present this as a "Secret Telegram" or "Official Invite" to maintain the theme while ensuring secure access.

3. Interaction Design (UX)
Background Simulation: Since simulations happen instantly, use a "Processing Ledger..." progress bar that looks like a vintage loading indicator (e.g., an old-school rotating newspaper icon).

Playoff Mode: The UI should shift to a higher-contrast "Postseason" theme (Black and Gold accents) when 2025-rule playoffs begin. Simulations here are locked to "Single Game" to build tension.

Archiving: When a season concludes, the "Archive" action should trigger a visual "stamping" animation (e.g., a "SEASON COMPLETED" red ink stamp) before resetting the active league stats.

4. Implementation Guidance for Claude Code
State Management: Use a global state (e.g., Context API or Zustand) to manage the "Stat Master" data. Since stats update instantly, ensure the UI re-renders efficiently without full-page reloads.

Data Handling: Use PapaParse or a similar library to handle the local CSV files (People, Batting, Pitching, Fielding). Ensure playerID mapping to NameFirst + NameLast is cached to prevent UI lag during large sim cycles.

GCP Integration: Store the final season archives as JSON blobs in Cloud Storage to keep the local state light for the next season.

UI Component Checklist for Development:
[ ] Splash Page: Explainer text + "Create/Join/Delete" cards.

[ ] League Config: Forms for Team Names (Cities), Playoff Rules, and Injury Toggles.

[ ] The Diamond: A visual representation of the roster (C, 1B, 2B, 3B, SS, 3 OF, DH).

[ ] The Ticker: Bottom-screen feed showing recent simulation results.