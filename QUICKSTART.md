# Quick Start — Nursing Home Watchdog V2

## What Just Happened?

The frontend got a **complete visual rewrite** inspired by RSPCA Animal Futures. Gone are the muted colors and tiny dots. Welcome to bold, card-based, immersive experience.

---

## Start the App

```bash
cd ~/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend
npm run dev
```

Visit: `http://localhost:5173`

---

## What You'll See

### 1. Hero Landing (First Screen)
- **MASSIVE** "NURSING HOME WATCHDOG" title
- Animated gradient background with floating particles
- Three stats that count up: 14,713 facilities, 1,180 high risk, $492M fines
- Big blue button: "EXPLORE YOUR STATE"
- Search input (opens full-screen overlay)

**Try:** Watch the title letters animate in. Watch the numbers count up.

---

### 2. State Map (Click "Explore" or Scroll)
- Bold, saturated US map
  - **Red states** = Critical (50+ avg score)
  - **Orange states** = High risk (40-50)
  - **Amber states** = Elevated (30-40)
  - **Teal states** = Low risk (<30)
- Hover any state → it LIFTS up with a shadow
- Click any state → shows facility cards

**Try:** Hover over California, Texas, Florida. See the lift effect. Click one.

---

### 3. State Detail (After Clicking a State)
- Large state name (e.g., "TEXAS")
- Stats row: 1,176 facilities, 288 high risk, $67.2M fines
- Sort dropdown: Risk, Name, Stars
- Filter dropdown: All, High Risk (40+), Critical (60+)
- Search box: filter by name or city

**Below:** Grid of facility cards (white cards, bold color bands)

**Try:** Sort by risk. Filter to "Critical" only. Search for a city name.

---

### 4. Facility Cards (The Core Visual)
Each card shows:
- **Top band:** Bold color (red/orange/amber/teal) with HUGE risk score
- **Name:** Facility name in bold
- **City:** "Dallas, TX"
- **Stars:** ★★★☆☆
- **Stats:** "3 harmed", "$45K fines", "12 deficiencies"

**Hover:** Card lifts up with deep shadow
**Click:** Goes to facility detail page

**Try:** Hover over any card. Click one to see the full report card.

---

## Key Features

### Search (Cmd/Ctrl + K)
- Full-screen search overlay
- Type facility name, city, or CCN
- Live results as you type
- Click result → goes to facility page

### Keyboard Shortcuts
- **Escape:** Close search / Back to map / Back to hero
- **Cmd/Ctrl + K:** Open search

### Back Navigation
- "← Back to Map" button in state detail
- Or press Escape
- Navigation is smooth with GSAP animations

---

## What's Different from Before?

| Before | After |
|--------|-------|
| Muted map (40% opacity) | Bold saturated map (100% opacity) |
| Tiny facility dots on map | Large facility cards in grid |
| No landing page | Immersive hero with animations |
| Dark teal + navy | Bright indigo + vivid risk colors |
| Sidebar panel | Full-width state detail |
| Small, text-heavy | Large, card-based, scannable |

---

## Color Guide

**Risk Levels (on cards and map):**
- **Red (Critical):** Score ≥ 60
- **Orange (High):** Score 40-59
- **Amber (Elevated):** Score 20-39
- **Teal (Low):** Score < 20

**Primary Actions:**
- **Indigo buttons:** Primary CTAs
- **White buttons:** Secondary actions

**Accents:**
- **Gold stars:** Quality rating
- **Red text:** Harm/danger indicators

---

## Data Source

All data comes from `/public/facilities_map_data.json`:
- 14,713 nursing homes
- 51 states + DC
- Risk scores, star ratings, fines, violations, ownership

---

## Known Issues / TODOs

### Working
- ✅ Hero animations
- ✅ Map state selection
- ✅ Facility cards
- ✅ Sort/filter
- ✅ Search overlay
- ✅ Smooth transitions
- ✅ Responsive design

### Not Yet Updated
- ⏳ Facility detail page (still old design)
- ⏳ Mobile optimization (works but not perfected)
- ⏳ State grid view (alternative to map)
- ⏳ Compare mode

---

## File Organization

```
/src
  /components
    HeroSection.jsx          ← NEW: Landing hero
    FacilityCard.jsx         ← NEW: Card component
    StateDetail.jsx          ← NEW: State drill-down
    USAMap.jsx               ← REWRITTEN: Bold map
    SearchOverlay.jsx        ← UPDATED: Search
    RiskBadge.jsx           ← UPDATED: Risk badge

  /pages
    MapPage.jsx             ← REWRITTEN: Main container

  /styles
    design.css              ← REWRITTEN: Design system
    hero.css                ← NEW: Hero styles
    cards.css               ← NEW: Card styles
    state-detail.css        ← NEW: State detail styles
    search.css              ← NEW: Search overlay styles
    map.css                 ← REWRITTEN: Map styles
```

---

## Troubleshooting

### Map doesn't load?
- Check `/public/states-10m.json` exists
- Check browser console for TopoJSON errors

### Data doesn't load?
- Check `/public/facilities_map_data.json` exists (13MB file)
- Check browser console for fetch errors

### Animations don't work?
- Check GSAP is installed: `npm list gsap`
- Should show `gsap@3.14.2` or similar

### Fonts look wrong?
- Check index.html has Google Fonts link
- Should include Plus Jakarta Sans, DM Serif Display, JetBrains Mono

---

## Making Changes

### Change hero title:
Edit `/src/components/HeroSection.jsx` line 87-88

### Change color palette:
Edit `/src/styles/design.css` lines 10-38 (CSS variables)

### Change risk thresholds:
- USAMap.jsx `getStateColor()` function
- FacilityCard.jsx `getRiskInfo()` function
- Keep them in sync!

### Add new stat to hero:
Add to `.hero-stats` in HeroSection.jsx (lines 119-142)

### Adjust animations:
- Hero: HeroSection.jsx useEffect (lines 10-57)
- Cards: StateDetail.jsx useEffect (lines 19-40)
- All use GSAP

---

## Next Steps

1. **Test on real device** — especially mobile
2. **Update facility detail page** — apply same bold design
3. **Add state grid view** — alternative to map
4. **Optimize performance** — virtual scrolling for big states
5. **Analytics** — track which facilities get clicked
6. **A/B test** — old vs new design conversion

---

## Questions?

Check the docs:
- **REWRITE_NOTES.md** — Full design philosophy and changelog
- **COMPONENT_TREE.md** — Component architecture and data flow
- **This file** — Quick start guide

Or just explore the code. Everything is documented inline.

---

**Remember:** This is about helping families make life-and-death decisions. The bold design reflects the weight of that responsibility.
