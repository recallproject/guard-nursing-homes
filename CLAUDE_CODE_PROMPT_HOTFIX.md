# HOTFIX: Contrast + Paywall + Pricing

## CRITICAL — Run immediately. Site is broken in production.

Frontend: `/Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend/`

---

## FIX 1: Landing page text invisible (CONTRAST)

### Problem
`.section-light` was designed for light backgrounds but `--bg-light` is now `#12122a` (dark navy). Text colors like `--text-dark: #0F172A` are invisible against it.

### Solution: Nuke section-light concept. Everything is dark mode.

**File: `src/styles/design.css`**
Change these variables:
```css
--bg-light: #12122a;  /* CHANGE TO: #0f1520 — just use a slightly different dark shade */
```
This stays dark. The fix is in the TEXT colors.

**File: `src/styles/landing-sections.css`**

Find ALL rules that set color to `var(--text-dark)` or `var(--text-dark-muted)` inside `.section-light` selectors and change them:

- `var(--text-dark)` → `var(--text-white)` (or `#FFFFFF`)
- `var(--text-dark-muted)` → `var(--text-muted)` (or `#94A3B8`)
- `#0F172A` → `#FFFFFF`
- `#64748B` → `#94A3B8`
- `#1E293B` → `#FFFFFF`

There are approximately 20+ instances in landing-sections.css. Replace ALL of them.

Also in `landing-sections.css`, find:
```css
.section-light {
  background-color: var(--bg-light);
}
```
Change to:
```css
.section-light {
  background-color: var(--bg-deep);
}
```

This makes "section-light" identical to "section-dark" — both dark backgrounds with white text. Later we can differentiate with subtle background shade differences if needed.

**ALSO** check these files for any `.section-light` dark text overrides:
- `src/styles/hero.css`
- `src/styles/cards.css`
- Any inline styles in JSX components in `src/components/landing/`

### Verify
After changes, load `http://localhost:5173/` and confirm:
- "Two Reports, Two Audiences" heading is clearly visible (white)
- "Why This Exists" heading is clearly visible (white)
- Mission quote text is readable
- "Built with public data" badge text is visible
- All section body text is readable (light gray, not dark gray)

---

## FIX 2: Financial Transparency is paywalled — should be FREE

### Problem
In `src/pages/FacilityPage.jsx`, the Financial Transparency section is wrapped in:
```jsx
<UpgradePrompt requiredTier="professional" featureName="Financial Transparency Data">
```
This blocks users from seeing it since the "professional" tier doesn't exist yet.

### Solution
Remove the UpgradePrompt wrapper. Show Financial Transparency for free.

**File: `src/pages/FacilityPage.jsx`**

Find (around line 337):
```jsx
{facility.related_party_costs > 0 && (
  <UpgradePrompt requiredTier="professional" featureName="Financial Transparency Data">
    <div className="financial-transparency">
```

Replace with:
```jsx
{facility.related_party_costs > 0 && (
  <div className="financial-transparency">
```

And find the matching closing tags:
```jsx
    </div>
  </UpgradePrompt>
)}
```

Replace with:
```jsx
  </div>
)}
```

If UpgradePrompt import is now unused, you can leave it (tree shaking will handle it) or remove the import.

### Verify
Load any facility page with related party costs > 0. The Financial Transparency section should render without a paywall overlay.

---

## FIX 3: Pricing page still shows monthly subscription tiers

### Problem
`src/pages/PricingPage.jsx` still shows 4 tiers: Free, Pro ($14/mo), Professional ($59/mo), Institutional ($299/mo). Only 2 should exist: Free and Evidence Report ($29 one-time).

### Solution
Replace the `tiers` array in PricingPage.jsx with just 2 tiers:

```jsx
const tiers = [
  {
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    description: 'For families',
    badge: null,
    features: [
      'Search all 14,713 Medicare nursing homes',
      'Full report cards with safety scores',
      'Staffing breakdown (RN/LPN/CNA hours per resident)',
      'Staffing trend analysis — is care getting better or worse?',
      'Inspection history with plain-English context',
      'Financial transparency — related-party transactions',
      'Compare up to 3 facilities side by side',
      'Interactive state map and rankings',
      'Chain safety rankings',
      'Downloadable Family Report PDF',
      'Questions to ask when you visit',
      'Nearby alternatives',
    ],
    cta: 'Start Searching',
    ctaLink: '/',
    ctaType: 'primary',
    disabled: false,
  },
  {
    name: 'Evidence Report',
    price: { monthly: 29, annual: 29 },
    description: 'For attorneys, journalists & regulators',
    badge: 'ONE-TIME PURCHASE',
    inherits: 'Everything in Free, plus:',
    features: [
      '11-page litigation-ready PDF',
      'Full penalty timeline with exact dollar amounts & dates',
      'Ownership portfolio analysis with sibling facility performance',
      'Individual deficiency details sorted by severity',
      'Regulatory citations (42 CFR references)',
      'Composite risk score methodology',
      'Data sources with verification links',
      'Formatted for discovery, FOIA, and investigations',
    ],
    cta: 'Buy Evidence Report — $29',
    ctaLink: '/',
    ctaType: 'primary',
    disabled: false,
  },
];
```

Also remove the billing cycle toggle (monthly/annual) since there's no subscription:
- Find the billing toggle JSX and either remove it or hide it
- The price display should just show "$29" not "$29/mo"

Remove the footer line about "Pro and Business tiers coming soon" if it appears on this page.

### Verify
Load `/pricing` and confirm only 2 cards appear: Free and Evidence Report ($29).

---

## FIX 4: Verify favorites icon works

The gold star icon IS visible in the header (screenshot confirms). Just verify:
- Click it → navigates to watchlist
- Badge shows correct count
- Save toast appears when starring a facility

---

## ORDER OF OPERATIONS
1. Fix contrast (FIX 1) — this is the most visible break
2. Fix paywall (FIX 2) — quick change
3. Fix pricing (FIX 3) — straightforward data change
4. Test all pages
5. Commit and deploy

## DEPLOY
```bash
cd /Users/moltbot/Desktop/RB7-Project/healthcare_fraud/nursing_home/frontend
npm run build
# Deploy however you normally deploy (Vercel/Netlify/etc)
```
