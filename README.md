# T-Minus ⏱️ — Global Countdown Events

> *Count down to every moment that matters — together with the world.*

[![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-f7df1e?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Canvas API](https://img.shields.io/badge/Canvas-API-orange)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-brightgreen)](.)
[![Solo Project](https://img.shields.io/badge/Solo%20Project-✓-brightgreen)](.)

**→ [Live Demo](https://theroyatlas.github.io/T-MINUS/)**

---

## What Is This?

T-Minus is a **zero-dependency countdown web app** with a cosmic aesthetic — real-time countdowns to global events, local demo voting, and a starfield background rendered via Canvas API. Pure frontend, no build step required; known mobile clipping is described below.

### Local demo data

Votes are saved in `localStorage` **only in this browser/profile on this device and site origin**. They are not shared between users, browsers or devices. Initial vote counts are randomly seeded synthetic demo values; the displayed totals are **not real community popularity, user counts or usage evidence**. There is no backend or cross-user synchronization.

Votes and the local “already voted” flag are saved together. Existing legacy vote data is read without deleting its original keys. If storage is corrupt, blocked or full, the existing toast channel reports the error and voting does not claim success or overwrite corrupt data. Preserve/export the stored values before attempting recovery; browser data clearing or private-session expiry can remove local data. Concurrent tabs are not a synchronized voting service.

The current page exposes event browsing, countdowns, voting and language selection. The older create-event feature listed below has no active form in this revision.

### Known limitations

- **Cross-tab voting remains FAIL.** Two already-open tabs keep stale snapshots.
  Voting in one tab and then another can overwrite the first vote and its voted
  flag, allowing a repeated local vote after reload. Both tabs can also accept
  the same vote from stale state. There is no cross-tab synchronization; see
  [the observed sequences](docs/CROSS_TAB_BEHAVIOR.md).
- **Partial countdown clipping at 390px remains unfixed.** A responsive layout
  does not mean every mobile viewport or physical device has passed acceptance.
- Real OS sharing/clipboard permissions, Firefox/Safari, physical devices and
  the deployed revision have not been verified by the local Node tests. The
  existing `og:url` metadata still uses the old handle.
- The live demo is a separate deployment; local preparation does not establish
  that it serves this revision. Passing scoped tests is not a whole-product pass.

---

## Features

- **Live Countdowns** — Precise days/hours/minutes/seconds to upcoming global events
- **Local Demo Voting** — Vote 🔥 in this browser; totals are synthetic demo data
- **Category Filters** — Sports / Tech / Entertainment / Holiday
- **Legacy Create Events** — Stored-data/input support remains; no active form
- **Glassmorphism UI** — Glass-card design with backdrop blur and subtle gradients
- **Animated Starfield** — Multi-layer procedural star particles via Canvas API
- **Orbit Ring Decoration** — CSS animated orbital ring elements
- **Mouse-Tracking Glow** — Cursor-following radial highlight effect
- **Responsive Layout** — Known 390px countdown clipping remains

---

## Tech Stack

**Zero dependencies — no npm, no build tool, no framework.**

| Technology | Usage |
|-----------|-------|
| HTML5 Semantic | Structure & accessibility |
| CSS3 (Variables + Grid + Flexbox) | Layout, glassmorphism, animations |
| Vanilla JavaScript (ES6+) | App logic, event handling, timers |
| Canvas API | Procedural animated starfield |
| LocalStorage | Event persistence across sessions |
| Google Fonts | Unbounded (headings) · Orbitron (countdown digits) · Noto Sans TC (CJK) |

---

## Design Highlights

- **Color Palette:** Deep space navy → cosmic purple gradient backgrounds
- **Glassmorphism Cards:** `backdrop-filter: blur()` with semi-transparent borders and inner glow
- **Custom Color Themes:** Each event category has a distinct accent color system via CSS variables
- **Micro-animations:** Smooth hover lifts, scale transitions, and timer digit updates
- **Orbital Rings:** Pure CSS animated ring decorations for the hero section

---

## Running Locally

No install required — just open in a browser:

```bash
# Serve locally (optional, for dev comfort)
npx serve .
# → http://localhost:3000

# Or open directly
open index.html
```

---

## Project Structure

```
.
├── index.html   ← Everything (HTML + CSS + JS, self-contained)
├── tests/app.test.cjs ← Node built-in tests of the shipped inline script
└── README.md
```

A deliberate single-file architecture — demonstrating that complex UI/UX (starfield, responsive layout, live timers, vote system) can be achieved without any tooling overhead.

## Tests

With Node.js installed, run `node --test tests/app.test.cjs tests/share.test.cjs`. No install or test framework is required. The 29 tests execute the actual inline application script with synthetic fixtures and controlled storage, clock and DOM doubles; they cover countdown boundaries, input validation, persistence/reload, failure preservation and six-language sharing payloads. These tests do not replace browser interaction or physical-device testing, and do not fix or pass the known cross-tab failure.

---

*Built by Roy Wang — [Live at GitHub Pages](https://theroyatlas.github.io/T-MINUS/)*
