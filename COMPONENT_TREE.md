# Component Tree — Nursing Home Watchdog V2

```
App.jsx
├── MapPage.jsx (Main container, manages view state)
│   │
│   ├── HeroSection.jsx (view === 'hero' or 'states')
│   │   ├── Animated gradient background
│   │   ├── Floating particles (CSS-only)
│   │   ├── Title animation (GSAP letter stagger)
│   │   ├── Stats count-up (GSAP)
│   │   ├── CTA button → switches to 'states' view
│   │   └── Search input → opens SearchOverlay
│   │
│   ├── USAMap.jsx (view === 'states')
│   │   ├── D3 USA map with TopoJSON
│   │   ├── Bold, saturated state fills (full opacity)
│   │   ├── Hover: lift effect + tooltip
│   │   └── Click: onStateSelect → switches to 'detail' view
│   │
│   ├── StateDetail.jsx (view === 'detail')
│   │   ├── State header (name, stats)
│   │   ├── Sort/filter controls
│   │   ├── Search input (filters facilities)
│   │   ├── FacilityCard.jsx × N (in grid)
│   │   │   ├── Risk band (colored, with score)
│   │   │   ├── Facility name, city
│   │   │   ├── Star rating
│   │   │   └── Stats row (harm, fines, etc.)
│   │   └── Load More button (pagination)
│   │
│   └── SearchOverlay.jsx (when searchOpen === true)
│       ├── Full-screen backdrop
│       ├── Large search input
│       ├── Live search results
│       │   └── Result items with RiskBadge.jsx
│       └── Close hint (ESC or click outside)
│
└── FacilityPage.jsx (separate route: /facility/:ccn)
    └── (Existing facility detail page, not rewritten yet)
```

---

## View State Machine

```
MapPage view states:
┌──────┐
│ hero │ ←─────────────┐
└──┬───┘                │
   │ (Explore button)   │ (Escape key / Back button)
   ↓                    │
┌────────┐              │
│ states │ ←──────┐     │
└───┬────┘        │     │
    │ (Click      │     │
    │  state)     │     │
    ↓             │     │
┌────────┐        │     │
│ detail │ ───────┘     │
└───┬────┘              │
    │ (Back button)     │
    └───────────────────┘
```

---

## Data Flow

```
useFacilityData.js (custom hook)
├── Loads /facilities_map_data.json (13MB)
├── Provides:
│   ├── data: { states, state_summary, national }
│   ├── loading: boolean
│   ├── error: string | null
│   ├── getState(stateCode)
│   ├── getFacility(ccn)
│   ├── searchFacilities(query)
│   ├── getAllFacilities()
│   └── getHighRiskFacilities()
│
└── Used by:
    ├── MapPage.jsx (main data)
    ├── HeroSection.jsx (national stats)
    ├── StateDetail.jsx (state facilities)
    └── SearchOverlay.jsx (search function)
```

---

## Style Dependencies

```
Global:
├── design.css (base system, colors, typography, utilities)
│
Component-specific:
├── hero.css (HeroSection)
├── cards.css (FacilityCard, StateCard)
├── state-detail.css (StateDetail)
├── search.css (SearchOverlay)
└── map.css (USAMap, loading/error states)
```

---

## Animation Layers (GSAP)

```
Hero:
├── Title letters: stagger fade in (0.03s)
├── Stats: count up (2s expo.out, 0.2s stagger)
└── CTA: fade in (delay 1.8s)

State Detail:
├── Header: slide in from top (0.6s)
└── Cards: stagger in from bottom (0.03s each)

Transitions:
├── View change: smooth scroll with GSAP
└── Route change: handled by React Router
```

---

## Key Props Flow

```
MapPage
├── view (state: 'hero' | 'states' | 'detail')
├── selectedState (state: string | null)
└── searchOpen (state: boolean)
    │
    ├─→ HeroSection
    │   ├── national (from useFacilityData)
    │   ├── onExploreClick() → setView('states')
    │   └── onSearch() → setSearchOpen(true)
    │
    ├─→ USAMap
    │   ├── data (from useFacilityData)
    │   └── onStateSelect(code) → setSelectedState(code), setView('detail')
    │
    ├─→ StateDetail
    │   ├── stateCode (from selectedState)
    │   ├── stateData (from data.states[stateCode])
    │   ├── stateSummary (from data.state_summary[stateCode])
    │   └── onBack() → setSelectedState(null), setView('states')
    │       │
    │       └─→ FacilityCard (mapped over stateData.facilities)
    │           └── facility (object with all fields)
    │
    └─→ SearchOverlay
        ├── searchFacilities (from useFacilityData)
        └── onClose() → setSearchOpen(false)
            │
            └─→ RiskBadge (in each result)
                └── score (facility.composite)
```

---

## File Structure

```
/frontend
├── /src
│   ├── /components
│   │   ├── FacilityCard.jsx          ← NEW (card-based facility display)
│   │   ├── HeroSection.jsx           ← NEW (immersive landing)
│   │   ├── StateDetail.jsx           ← NEW (state drill-down)
│   │   ├── USAMap.jsx                ← REWRITTEN (bold colors, no pins)
│   │   ├── SearchOverlay.jsx         ← UPDATED (default export)
│   │   ├── RiskBadge.jsx             ← UPDATED (default export)
│   │   ├── Header.jsx                (not used in new flow)
│   │   ├── StatePanel.jsx            (replaced by StateDetail)
│   │   ├── NationalStats.jsx         (replaced by Hero stats)
│   │   └── ... (other components)
│   │
│   ├── /pages
│   │   ├── MapPage.jsx               ← REWRITTEN (3-view state machine)
│   │   ├── FacilityPage.jsx          (existing, not changed)
│   │   └── ComparePage.jsx           (not integrated)
│   │
│   ├── /styles
│   │   ├── design.css                ← REWRITTEN (bold palette, massive type)
│   │   ├── hero.css                  ← NEW
│   │   ├── cards.css                 ← NEW
│   │   ├── state-detail.css          ← NEW
│   │   ├── search.css                ← NEW
│   │   ├── map.css                   ← REWRITTEN (simplified)
│   │   └── ... (other styles)
│   │
│   ├── /hooks
│   │   └── useFacilityData.js        (existing, not changed)
│   │
│   ├── App.jsx                       ← SIMPLIFIED (routing only)
│   └── main.jsx                      (existing, not changed)
│
├── /public
│   ├── facilities_map_data.json      (13MB data file)
│   └── states-10m.json               (TopoJSON for map)
│
├── index.html                        ← UPDATED (new fonts)
├── package.json                      (existing)
├── REWRITE_NOTES.md                  ← NEW (this file's sibling)
└── COMPONENT_TREE.md                 ← NEW (this file)
```

---

## Quick Reference

### To add a new filter to StateDetail:
1. Add state variable in StateDetail.jsx
2. Add filter UI in `.state-detail-controls`
3. Update facility filter logic
4. Re-animate cards on filter change

### To add a new stat to Hero:
1. Add stat div in HeroSection.jsx `.hero-stats`
2. Add `data-value` attribute
3. GSAP will auto-animate

### To change risk color thresholds:
1. Update `getStateColor()` in USAMap.jsx
2. Update `getRiskInfo()` in FacilityCard.jsx
3. Ensure consistency with RiskBadge.jsx logic

### To add a new view to MapPage:
1. Add view name to `view` state
2. Add conditional render in MapPage return
3. Add transition logic in useEffect
4. Add navigation handler functions
