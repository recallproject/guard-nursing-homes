# GUARD — Nursing Home Safety Platform

## ⚡ READ FIRST BEFORE ANYTHING ELSE
At the start of every conversation, read `~/Desktop/OversightReports-Outreach/PROJECT-STATE.md` before responding to anything.

That file is the single source of truth shared across both OversightReports Claude Desktop projects (dev + outreach). It contains:
- Verified data stats (facility counts, fines, deficiencies, PBJ, related-party totals)
- Current deployment state (latest deploy ID, what changed, what's live)
- Outreach campaign status (who's engaged, what's posted, what's queued)
- Open questions / unresolved decisions
- File locations across Desktop, LaCie drive, Obsidian, and Notion

**Critical rule:** Never claim stats about the platform (facility counts, dollar totals, data source counts, etc.) without verifying they're in PROJECT-STATE.md. If a number isn't there, audit from source before citing it.

If PROJECT-STATE.md is more than 48 hours old, tell Rob to update it before proceeding with anything that depends on current state.

When material changes happen in this repo (deploy, data update, significant code change), remind Rob to update PROJECT-STATE.md before ending the session.

## Project Overview
React 19 + Vite frontend serving nursing home safety data for 14,713 Medicare-certified facilities.
Deployed on Vercel. Data sourced from CMS/Medicare federal databases.
Full data source list in PROJECT-STATE.md and `~/Documents/Obsidian Vault/01_Oversight/CMS Data Sources.md`.

## Tech Stack
- React 19 with Vite
- Tailwind CSS
- Vercel deployment
- Static JSON data files (no live API)

## Code Review Guidelines

### Always Check
- XSS vulnerabilities: ensure all user inputs and URL parameters are sanitized
- React key props on mapped elements
- Proper error boundaries around data-heavy components
- Accessibility: semantic HTML, ARIA labels, keyboard navigation
- Performance: avoid unnecessary re-renders, memo expensive computations
- SEO: meta tags, Open Graph tags, structured data on facility pages
- Mobile responsiveness on all new components

### Security Priority
- Never expose API keys or secrets in client-side code
- Sanitize all search inputs and URL parameters
- Validate facility CCN numbers before database lookups
- CSP headers and CORS configuration changes need extra scrutiny

### Data Integrity
- Citation counts, penalty amounts, and staffing ratios must display accurately
- Risk score calculations must match documented methodology
- Date formatting must be consistent (MM/DD/YYYY for display)

### Skip These
- Generated files in /dist or /build
- Node modules
- Static data JSON files (these are build artifacts)
- .vercel directory

### Style Conventions
- Functional components only (no class components)
- Named exports preferred
- Tailwind utility classes for styling (no inline styles)
- Component files in PascalCase
- Hooks in camelCase with "use" prefix
