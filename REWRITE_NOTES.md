# Nursing Home Watchdog Frontend — Complete Rewrite

**Date:** 2026-02-23
**Reference:** RSPCA Animal Futures immersive experience
**Goal:** Transform from muted dashboard to bold, card-based, immersive experience

---

## What Changed

### BEFORE (Problems)
1. Map colors at 40% opacity — muted, boring
2. Tiny blurry facility dots on click — useless
3. No hero/landing — dumps user on map immediately
4. Dark muted palette (navy + teal at low opacity)
5. No emotional impact, no wow factor

### AFTER (Solutions)
1. **BOLD saturated map colors** — full opacity red/orange/amber/teal
2. **Card-based facility browsing** — large, interactive cards replacing dots
3. **Immersive hero landing** — animated gradient, count-up stats, massive typography
4. **Vivid color palette** — Indigo 600 primary, saturated risk spectrum
5. **Progressive disclosure** — Hero → State Map → Facility Cards → Detail

---

## New Experience Flow

### Phase 1: Hero Landing (`/`)
- Full-viewport immersive hero
- Animated gradient background with floating particles
- MASSIVE typography (8rem clamp) — "NURSING HOME WATCHDOG"
- Count-up stats: 14,713 facilities, 1,180 high risk, $492M fines
- Large CTA: "EXPLORE YOUR STATE"
- Search input (opens overlay)
- Scroll indicator

### Phase 2: State Selection
- Bold, saturated US map
  - Critical (50+): Red `#DC2626`
  - High (40-50): Orange `#EA580C`
  - Elevated (30-40): Amber `#D97706`
  - Low (<30): Teal `#0D9488`
- White borders (2px), FULL opacity
- Hover: state LIFTS (scale + shadow)
- Click: navigates to State Detail

### Phase 3: State Detail
- Large state name (4rem serif)
- Stats row: facilities, high risk, avg score, total fines
- Sort/filter controls
- Search within state
- **Facility Cards** — the core visual unit:
  - White card on dark background
  - Bold color band at top with risk score (huge number)
  - Facility name, city, star rating
  - Key stats: harm count, jeopardy, fines
  - Hover: lifts up (-6px), shadow deepens
  - Click: navigates to facility detail

### Phase 4: Transitions
- Hero → Map: smooth scroll
- Map → Detail: fade transition
- Detail → Facility: card navigates to page
- All transitions use GSAP

---

## Files Created/Rewritten

### NEW Components
1. **HeroSection.jsx** — Full-screen hero with animations
2. **FacilityCard.jsx** — Primary visual unit for facilities
3. **StateDetail.jsx** — State drill-down with facility grid

### NEW Styles
1. **hero.css** — Hero section with animated gradient
2. **cards.css** — Facility & state card styles
3. **state-detail.css** — State detail layout
4. **search.css** — Updated search overlay styles

### REWRITTEN Files
1. **design.css** — Complete redesign
   - Bold palette: Indigo 600 primary, saturated risk colors
   - MASSIVE typography (up to 8rem headings)
   - Plus Jakarta Sans UI font, JetBrains Mono data font
2. **map.css** — Simplified, map-only styles (no pins)
3. **MapPage.jsx** — Complete rewrite
   - Three views: hero, states, detail
   - GSAP transitions between views
   - Integrated search overlay
4. **USAMap.jsx** — Simplified
   - Removed all facility pin rendering
   - Bold, saturated state fills (full opacity)
   - Hover lift effect
   - Click navigates to detail (not zoom)

### UPDATED Files
1. **index.html** — Added Plus Jakarta Sans, JetBrains Mono fonts
2. **App.jsx** — Simplified routing, removed header
3. **SearchOverlay.jsx** — Updated to default export
4. **RiskBadge.jsx** — Updated to default export, added CSS

---

## Color Palette

### Backgrounds
- `--bg-deep: #0F172A` (Slate 900 — main)
- `--bg-card: #1E293B` (Slate 800 — card on dark)
- `--bg-card-light: #FFFFFF` (white facility cards)
- `--bg-elevated: #334155` (Slate 700 — hovers)

### Primary (Indigo)
- `--primary: #4F46E5` (Indigo 600)
- `--primary-light: #818CF8` (Indigo 400)
- `--primary-dark: #3730A3` (Indigo 800)

### Risk Spectrum (FULL OPACITY)
- `--risk-critical: #DC2626` (Red 600)
- `--risk-high: #EA580C` (Orange 600)
- `--risk-elevated: #D97706` (Amber 600)
- `--risk-low: #0D9488` (Teal 600)

### Accent
- `--accent-gold: #F59E0B` (stars)
- `--accent-green: #10B981` (good indicators)

### Text
- `--text-white: #FFFFFF`
- `--text-cream: #F1F5F9` (Slate 100)
- `--text-muted: #94A3B8` (Slate 400)
- `--text-dark: #0F172A` (for light cards)
- `--text-dark-muted: #64748B` (Slate 500)

---

## Typography

- **Display:** DM Serif Display (headings) — elegant, massive
- **UI:** Plus Jakarta Sans (body, buttons, cards) — geometric, modern, bold
- **Data:** JetBrains Mono (scores, stats, CCNs) — sharper than IBM Plex Mono

### Scale
- H1: `clamp(2.5rem, 8vw, 8rem)` — MASSIVE hero titles
- H2: `clamp(2rem, 6vw, 5rem)` — Section titles
- H3: `clamp(1.5rem, 4vw, 3rem)` — Card headers
- Body: `16px` base

---

## Key Interactions

### Facility Card
- **Idle:** White card, bold color band, shadow-md
- **Hover:** Lifts -6px, shadow-2xl, subtle border glow
- **Click:** Navigates to `/facility/:ccn`

### State on Map
- **Idle:** Saturated fill, white 2px border
- **Hover:** Scale 1.03, drop-shadow, tooltip appears
- **Click:** Navigates to state detail view

### Hero Stats
- **Load:** Count up from 0 with GSAP
- **Duration:** 2s with expo.out easing
- **Stagger:** 0.2s delay between each stat

### Hero Title
- **Load:** Letters fade in staggered (0.03s each)
- **Duration:** 0.8s per letter
- **Effect:** Creates dramatic reveal

---

## Data Integration

All data comes from `/facilities_map_data.json`:
- **13MB**, 14,713 facilities
- Structure:
  ```json
  {
    "states": {
      "TX": {
        "facilities": [...],
        "count": 1176,
        "high_risk": 288,
        "total_fines": 67200000
      }
    },
    "state_summary": {
      "TX": {
        "count": 1176,
        "high_risk": 288,
        "avg_composite": 42.3,
        "avg_stars": 2.8,
        "total_fines": 67200000
      }
    },
    "national": {
      "total_facilities": 14713,
      "high_risk": 1180,
      "total_fines": 492000000
    }
  }
  ```

### Facility Fields
- `ccn`, `name`, `city`, `state`, `zip`, `lat`, `lon`
- `beds`, `stars`, `composite` (risk score)
- `staffing_score`, `deficiency_score`, `penalty_score`, `ownership_score`, `quality_score`
- `flags`, `rn_hprd`, `total_hprd`, `zero_rn_pct`, `rn_gap_pct`
- `total_deficiencies`, `harm_count`, `jeopardy_count`
- `total_fines`, `fine_count`
- `worst_owner`, `owner_portfolio_count`, `chain_name`

---

## Animation Stack (GSAP)

### Hero Animations
- Title letters: stagger fade in (0.03s each)
- Stats: count up (2s expo.out, 0.2s stagger)
- CTA button: fade in (delay 1.8s)
- Background gradient: infinite shift (15s)
- Particles: float up (15-25s per particle)

### State Detail Animations
- Header: fade in from top (0.6s)
- Cards: stagger in from bottom (0.03s each)
- Filter change: re-animate cards (0.02s stagger)

### Transitions
- View changes: smooth scroll with GSAP ScrollTrigger
- Page navigation: handled by React Router

---

## Responsive Breakpoints

- **Desktop:** 1024px+ (default)
- **Tablet:** 768px-1023px (2-3 col grids)
- **Mobile:** <768px (1 col grids, larger touch targets)

---

## To Run

```bash
cd ~/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend
npm install  # if needed
npm run dev
```

Visit `http://localhost:5173`

---

## What's NOT Changed (Yet)

- **FacilityPage.jsx** — The individual facility report card (keep for now, will update later)
- **Header.jsx** — Removed from main flow (was causing layout issues)
- **ComparePage.jsx** — Not integrated yet
- **StatePanel.jsx** — Old sidebar component (replaced by StateDetail)
- **NationalStats.jsx** — Old stats bar (replaced by Hero stats)

These files still exist but are not used in the new experience.

---

## Next Steps (Future)

1. **Facility Detail Page** — Redesign with same bold aesthetic
2. **State Grid View** — Alternative to map (cards for all states)
3. **Advanced Filters** — Multi-select filters, range sliders
4. **Comparison Mode** — Side-by-side facility comparison
5. **Mobile Optimization** — Touch gestures, swipe navigation
6. **Performance** — Virtual scrolling for large state lists
7. **Analytics** — Track which states/facilities get most views
8. **Share** — Social share cards with facility risk scores

---

## Design Philosophy

**This is about helping families make life-and-death decisions.**

Every design choice prioritizes:
1. **Clarity** — Data must be instantly readable
2. **Emotional impact** — Users must feel the weight of the data
3. **Accessibility** — Information must be scannable, navigable
4. **Trust** — Bold, confident design signals authority
5. **Action** — Clear paths to explore, compare, decide

Muted colors and tiny dots don't convey urgency. Bold reds and massive numbers do.

---

## Credits

Inspired by RSPCA Animal Futures (https://www.rspca.org.uk/webContent/animalfutures/):
- Massive bold typography
- Saturated, vivid colors
- Card-based progressive disclosure
- Full-screen immersive scenes
- Smooth GSAP transitions
- Playful but serious tone
