# GUARD — Nursing Home Safety Platform

## Project Overview
React 19 + Vite frontend serving nursing home safety data for 14,713 Medicare-certified facilities.
Deployed on Vercel. Data sourced from CMS/Medicare federal databases.

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
