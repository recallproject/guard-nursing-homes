# CSS Class Name Obfuscation Plan

## Current Architecture Analysis

### What This Project Actually Uses (NOT Tailwind)

Despite the CLAUDE.md mentioning "Tailwind CSS," **Tailwind is not installed or configured in this project.** There is:

- No `tailwindcss` in `package.json`
- No `tailwind.config.js` or `tailwind.config.ts`
- No `postcss.config.js`
- No `@tailwind` directives in any CSS file

The project uses **hand-written custom CSS classes** across 50 stylesheet files in `src/styles/` (27,451 total lines of CSS). Components import these stylesheets directly:

```jsx
import '../styles/hero.css';
import '../styles/header.css';
import '../styles/cards.css';
```

Class names are descriptive and human-readable: `.facility-card`, `.hero-section`, `.site-header__brand`, `.pricing-card`, `.risk-badge-critical`, etc. These are the names a competitor could read to understand your component architecture.

### Key Constraints

1. **4,498 className references** across 85 JSX files
2. **31 GSAP/querySelector string-based CSS selectors** across 19 files (e.g., `gsap.from('.pricing-card', ...)` and `document.querySelectorAll('.facility-row')`)
3. **No CSS Modules** -- all classes are global
4. **CSS custom properties (variables)** defined in `design.css` `:root` block -- these must NOT be renamed

---

## Options Evaluated

### Option A: CSS Modules (Vite built-in) -- NOT RECOMMENDED

Vite natively supports CSS Modules (`*.module.css`). This would rename classes to hashed strings in production (`_hero-section_1a2b3`).

**Why not:** Requires renaming all 50 CSS files to `*.module.css`, rewriting every `import` to use object syntax (`import styles from './hero.module.css'`), and changing every `className="hero-section"` to `className={styles.heroSection}`. That is 4,498 changes across 85 files. The 31 GSAP string selectors (`gsap.from('.pricing-card', ...)`) would ALL break because GSAP queries the DOM by class name string, which would no longer match the hashed name. This is a massive, high-risk refactor.

### Option B: postcss-rename -- NOT RECOMMENDED

A PostCSS plugin that renames CSS selectors. Requires a mapping strategy and doesn't handle the JS side (className strings in JSX) at all. You'd need a separate tool to rewrite the JS references. Same GSAP breakage problem as Option A.

### Option C: vite-plugin-css-obfuscator -- NOT RECOMMENDED

This plugin was designed for Tailwind utility classes (randomizing `flex`, `gap-4`, etc.). It does not work well with custom semantic class names because it:
- Only targets utility-style classes
- Has known issues with production builds breaking
- Last meaningful update was 2023; questionable maintenance

### Option D: PostCSS + babel plugin combo -- POSSIBLE BUT FRAGILE

Use `postcss-modules` (CSS side) paired with a custom Babel transform (JS side) to rewrite className strings. Still breaks GSAP string selectors without manual exclusions. High complexity, hard to debug.

### Option E: Build-time class name mangling via postcss-obfuscator -- RECOMMENDED

**[postcss-obfuscator](https://github.com/nicholasgasior/postcss-obfuscator)** (or the similar `postcss-class-obfuscator`) works as a PostCSS plugin that:

1. Scans your CSS, builds a class-name-to-hash mapping
2. Rewrites all class selectors in CSS to hashed versions
3. Outputs a JSON map file (e.g., `classmap.json`)
4. You use a Vite plugin or script to find-and-replace className strings in JSX output using the same map

However, **this still has the GSAP problem.**

---

## Honest Assessment

**Every automated obfuscation approach will break the 31 GSAP/querySelector string selectors** unless those selectors are individually excluded or refactored to use refs. This is the core risk.

The GSAP selectors are in these files:
- `HeroSection.jsx` (3 selectors)
- `PricingPage.jsx` (6 selectors)
- `LandingV4.jsx` (2 selectors)
- `StateDetail.jsx` (2 selectors)
- `TheNumbers.jsx` (2 selectors)
- `SampleReportCard.jsx` (2 selectors)
- Plus 13 more across other components

---

## Recommended Approach: Two-Phase Strategy

### Phase 1: Low-Risk, Immediate Value -- Vite CSS filename hashing + source map removal

This is already partially in place (Vite hashes chunk filenames). Ensure:

**vite.config.js changes:**

```js
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    sourcemap: false,  // Don't ship source maps (CRITICAL -- these expose everything)
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Hash CSS filenames so they're not human-guessable
        assetFileNames: 'assets/[hash].[ext]',
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['jspdf', 'jspdf-autotable'],
          maps: ['d3-geo', 'd3-selection', 'topojson-client'],
          animation: ['gsap'],
        }
      }
    }
  }
})
```

**Impact:** Removes the biggest information leak (source maps expose the entire unminified source tree including component names, file structure, and comments). Hashed filenames remove the stylesheet-name-to-feature mapping.

**Risk:** Zero. This changes only output filenames, not class names.

### Phase 2: Medium-Risk -- PostCSS class obfuscation with GSAP safelist

Install and configure `postcss-obfuscator` with an explicit safelist for GSAP-targeted classes.

**Step 1: Install dependencies**

```bash
npm install -D postcss postcss-obfuscator
```

**Step 2: Create `postcss.config.js`**

```js
export default {
  plugins: {
    'postcss-obfuscator': {
      enable: process.env.NODE_ENV === 'production',
      length: 6,
      method: 'random',
      prefix: '',
      suffix: '',
      // Classes used in GSAP selectors and querySelector -- DO NOT RENAME
      safelist: [
        'hero-tagline',
        'hero-tagline-secondary',
        'hero-tertiary',
        'pricing-hero',
        'pricing-card',
        'pricing-mission',
        'pricing-academic',
        'pricing-transparency',
        'trust-item',
        'audience-card',
        'number-value',
        'number-item',
        'feature-card',
        'action-card',
        'report-card-mock',
        'facility-card',
        'facility-row',
        'chain-row',
        'owner-detail',
        'methodology-section',
        'ap-trends-section',
        'hero-title-word',
        'hero-title-letter',
        'hero-stat-item',
      ],
      // Output the mapping for JSX rewriting
      classMapOutput: './classmap.json',
    }
  }
}
```

**Step 3: JSX className rewriting**

This is the hard part. `postcss-obfuscator` handles CSS files but not JSX. You need a Vite plugin that reads the `classmap.json` and rewrites className strings in the bundled JS output. A custom Vite plugin:

```js
// vite-plugin-obfuscate-classnames.js
import { readFileSync } from 'fs';

export function obfuscateClassNames() {
  let classMap = {};
  return {
    name: 'obfuscate-class-names',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      try {
        classMap = JSON.parse(readFileSync('./classmap.json', 'utf-8'));
      } catch { return; }

      // Sort by length descending to avoid partial replacements
      const entries = Object.entries(classMap)
        .sort(([a], [b]) => b.length - a.length);

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && chunk.code) {
          let code = chunk.code;
          for (const [original, obfuscated] of entries) {
            // Only replace within className-like string contexts
            const regex = new RegExp(`\\b${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            code = code.replace(regex, obfuscated);
          }
          chunk.code = code;
        }
      }
    }
  };
}
```

**Risk:** Medium. The safelist approach works but is fragile -- any new GSAP animation targeting a class name must be added to the safelist or it breaks silently. The regex replacement in JS bundles can cause false positives if a class name matches a JavaScript variable name or string.

### Phase 3: Long-Term -- Refactor GSAP selectors to use refs (eliminates safelist)

Convert all 31 GSAP string selectors to use React refs instead:

```jsx
// BEFORE (fragile, blocks obfuscation):
gsap.from('.pricing-card', { opacity: 0 });

// AFTER (ref-based, obfuscation-safe):
const cardRefs = useRef([]);
gsap.from(cardRefs.current, { opacity: 0 });
```

Once all GSAP selectors use refs, the safelist becomes empty and all classes can be obfuscated.

---

## What I Actually Recommend

**Do Phase 1 now, skip Phase 2 for now.**

Here's why:

1. **Source maps are the real leak.** Anyone who can read your source maps gets your full unminified code, file structure, component names, comments, and business logic. Removing source maps from production blocks 90% of what a competitor could learn.

2. **Class name obfuscation provides marginal security.** A determined competitor can still reverse-engineer your site from the DOM structure, network requests, and behavior. Obfuscated class names slow them down but don't stop them.

3. **The GSAP safelist creates ongoing maintenance burden.** Every developer who adds a GSAP animation must remember to update the safelist, or the production build silently breaks. This is a real operational risk for a small team.

4. **Phase 1 is zero-risk and takes 2 minutes.** Phase 2 requires installing dependencies, writing a custom Vite plugin, building a safelist, and thorough QA of every page in production. High effort for marginal benefit.

If you want to proceed with Phase 2 anyway, I'd recommend doing Phase 3 first (refactor GSAP to refs) to eliminate the safelist risk, then apply the PostCSS obfuscation cleanly.

---

## Summary

| Phase | What | Risk | Effort | Value |
|-------|------|------|--------|-------|
| 1 | Remove source maps + hash filenames | Zero | 5 min | High |
| 2 | PostCSS class obfuscation + safelist | Medium | 2-4 hrs | Low-Medium |
| 3 | Refactor GSAP to refs | Low | 3-5 hrs | Enables clean Phase 2 |
