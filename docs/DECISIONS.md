# Architecture Decision Records

Lightweight ADRs. Add a new one for any significant technical decision. Don't edit an accepted ADR's decision. Supersede it with a new ADR and update the old one's status.

Template:

```
## ADR-NNN: Title
- **Status:** Proposed | Accepted | Superseded by ADR-XXX
- **Date:** YYYY-MM-DD
### Context
### Decision
### Alternatives considered
### Reasons
### Trade-offs and consequences
```

---

## ADR-001: Astro for the initial website

- **Status:** Accepted
- **Date:** 2026-10-17

### Context
The first version is a content-focused personal site (homepage + book library) with little interactivity. Patrick wants to learn frontend fundamentals and TypeScript, and to have a path to React later without starting with it.

### Decision
Use **Astro** (v7, `minimal` template) with TypeScript in strict mode, generating a fully static site.

### Alternatives considered
- **Next.js:** full-stack React framework. More capable, but brings React, server/client component concepts and a hosting model that's overkill for static content right now.
- **Plain HTML/CSS/JS:** maximum fundamentals, but no components, data loading or typed content. Duplication grows fast.
- **Other static site generators (Hugo, Eleventy):** fine for content, but Hugo uses Go templates and neither offers as smooth a route to React islands + TypeScript.

### Reasons
- Ships zero JS by default; pages are plain HTML.
- Components, layouts and file-based routing teach frontend architecture without a SPA.
- Typed, validated content collections fit the book data.
- Can add React (or other frameworks) per component later (the "islands" pattern).

### Trade-offs and consequences
- Learning Astro's `.astro` syntax is somewhat Astro-specific; the transferable parts are HTML, CSS, TypeScript and component thinking.
- Not committed long term. A move to Next.js stays an option if requirements change.

---

## ADR-002: GitHub Pages for static hosting

- **Status:** Accepted (live since 2026-10-17)
- **Date:** 2026-10-17

### Context
The site is static. Hosting should be free, simple, HTTPS, and integrated with the repo.

### Decision
Host on **GitHub Pages** as a **project site** at `https://patrickebyrne11.github.io/tricky-world/`, deployed with GitHub Actions.

### Alternatives considered
- **Netlify / Vercel / Cloudflare Pages:** excellent free tiers, preview deploys, serve from `/` (no base path). An extra account and platform to learn.
- **AWS S3 + CloudFront:** good Phase 6 learning, but needs IaC, certificates and DNS. Too much for v1.
- **User site repo (`patrickebyrne11.github.io`):** serves from `/` but ties the repo name to the hosting.

### Reasons
- Free, zero extra accounts, HTTPS, custom domain support.
- GitHub Actions deployment is a gentle intro to CI/CD.

### Trade-offs and consequences
- Project sites live under a **base path** (`/tricky-world/`). All internal links must go through `url()`; hard-coded `/…` links break in production.
- Static only: no server code, no runtime secrets. Anything dynamic (gym tracker, AI chatbot) will need separate hosting, which fits the modularity principle.
- No preview deploys per PR.

---

## ADR-003: Repository-based book data in a validated content collection

- **Status:** Accepted
- **Date:** 2026-10-17

### Context
Patrick has a large reading list to catalogue. Data will often be updated in bulk by giving an AI assistant a list of books, so edits must be easy and **mistakes must be caught automatically**. No database or backend is wanted yet.

### Decision
Store books in a single **`src/data/books.json`**, loaded as an Astro **content collection** with the `file()` loader and a **Zod schema** (`src/content.config.ts`). The schema is strict (unknown keys fail), and `prerenderConflictBehavior: 'error'` makes duplicate ids fail the build.

### Alternatives considered
- **Plain JSON import** (`import books from './books.json'`): simplest, but no validation; a typo like `"status": "Reed"` renders silently.
- **One Markdown file per book:** good for long reviews, but awkward for hundreds of books and bulk edits.
- **Database (Postgres/Supabase) or headless CMS:** needs runtime infrastructure and auth for something that changes a few times a month.

### Reasons
- One file is easy for a human or an LLM to edit in bulk.
- The schema is a **data contract** (like a dbt test or Pydantic model): bad data fails the build, and therefore CI, before reaching the live site.
- Typed access to entries in components.
- Stable kebab-case `id` (`title-author`) acts as a natural key for spotting duplicates.

### Trade-offs and consequences
- Data changes need a commit + rebuild (fine at this scale; also gives a full audit trail in git history).
- Known gaps: entries missing `id` are skipped with an error log but don't fail the build; the same book under two different ids isn't detected.
- Long reviews in JSON strings are awkward. If reviews grow, consider moving them to Markdown files referenced by id.

---

## ADR-004: Plain CSS, no UI framework

- **Status:** Accepted
- **Date:** 2026-10-17

### Context
A minimalist personal site with a couple of pages.

### Decision
Use **plain CSS**: global design tokens as CSS custom properties in `src/styles/global.css`, and component-scoped `<style>` blocks. Dark mode via `prefers-color-scheme`.

### Alternatives considered
- **Tailwind:** fast once learned, but adds a dependency and its own vocabulary, and hides the CSS fundamentals worth learning first.
- **Component libraries (e.g. shadcn/ui, MUI):** tied to React and far more than needed.

### Reasons
Fundamentals first, zero dependencies, and Astro's scoped styles already prevent most CSS collisions.

### Trade-offs and consequences
More hand-written CSS as the site grows. Revisit if styling becomes a bottleneck.

---

## ADR-005: Progressive enhancement with vanilla scripts before React

- **Status:** Accepted
- **Date:** 2026-10-17

### Context
The library needs a status filter (and later search). That's light interactivity over data that's already on the page.

### Decision
Render all books as HTML at build time with `data-*` attributes; add behaviour with a small **vanilla TypeScript `<script>`** that toggles the `hidden` attribute. Pages must show full content without JavaScript.

### Alternatives considered
- **React island** for the book list: introduces React, hydration and client-side state for something a few lines of DOM code handle.
- **One static page per status** (`/books/read`, …): no JS at all, but more pages and no combined search.

### Reasons
Smallest JS payload, works without JS, and teaches the browser DOM APIs that React itself is built on.

### Trade-offs and consequences
As filtering grows (multiple filters, sorting, stats, charts), vanilla DOM code gets messy. That's the trigger to introduce React in Phase 2.

---

## ADR-006: Build-time Strava totals

- **Status:** Accepted
- **Date:** 2026-10-19

### Context
Show Patrick's Strava training totals on the site. The site is static on GitHub Pages: no server, no runtime secrets.

### Decision
Fetch totals from the Strava API **at build time** (`src/lib/strava.ts`) and publish the generated static snapshot. The GitHub Actions workflow refreshes the short-lived access token daily and updates the `STRAVA_REFRESH_TOKEN` repository secret when Strava rotates it. This uses a fine-grained GitHub token stored as `STRAVA_SECRET_WRITE_TOKEN`, limited to this repository's Actions secrets. Show **aggregate totals only** (no individual activities or maps). Without all required secrets, the page renders "unavailable" and the build still succeeds.

Patrick reports Strava confirmed that these personal totals may be shown publicly.

### Alternatives considered
- **Strava embed widget:** zero code and no terms risk, but little to learn and no control over design.
- **Serverless function at request time:** live data, but needs separate hosting and runtime secret handling. Overkill for numbers that change daily.
- **Commit fetched JSON to the repo:** gives history, but bot commits clutter git and need write permissions in CI.

### Reasons
- Secrets never reach the browser; they exist only in the build environment.
- 3 API calls per build, far inside rate limits.
- Same pattern as a scheduled pipeline feeding a materialised table.

### Trade-offs and consequences
- If the secret-write token is missing or expires, scheduled refresh is skipped and the static page renders "unavailable"; fix the token and run the workflow again.
- Fail-soft means a broken token goes unnoticed except for a `[strava]` warning in the build log. Check the log if the page shows "unavailable".
- A refresh response may rotate the refresh token. The workflow saves the replacement immediately so the next run uses the current token.
- The stats endpoint only counts activities visible to Everyone.

---

## ADR-007: Supabase backend for Hot Takes

- **Status:** Accepted
- **Date:** 2026-10-19

### Context

Hot Takes needs persistent submissions, accounts, moderation, and per-user votes. GitHub Pages is static and cannot safely hold credentials or process writes. This is the first feature that genuinely requires a runtime backend.

### Decision

Keep Astro and GitHub Pages for the interface. Use Supabase Postgres, passwordless email Auth, and its Data API for Hot Takes only. The browser receives the public project URL and publishable key. It calls a narrow set of Postgres functions; base tables have RLS enabled and are not granted to browser roles. Use Supabase Studio for MVP moderation.

### Alternatives considered

- **Move the site to a full-stack Astro/Node host:** gives server routes, but changes hosting and operations for every page to serve one feature.
- **Build a standalone API:** best control and a strong later learning project, but auth, email delivery, hosting and database operations multiply the MVP scope.
- **Firebase:** comparable managed auth/data, but relational constraints and SQL are a better fit for one-vote uniqueness and Patrick's existing strengths.
- **Anonymous voting/local storage:** simpler, but trivial to bypass and cannot reliably enforce one vote per person.

### Reasons

- Adds a backend only where persistence requires one; unrelated pages stay static.
- Postgres constraints, functions and RLS make authorization testable at the data boundary.
- Managed passwordless auth avoids storing passwords and operating email infrastructure.
- The free tier is sufficient for a small prototype.

### Trade-offs and consequences

- The board depends on an external service and browser JavaScript; a paused or unavailable project makes the live board unavailable while the rest of the site keeps working.
- The publishable key is public. Security must remain in Postgres, never in hidden UI controls.
- The MVP assumes a small group of friends. Revisit moderation, privacy and operational controls before opening it to a wider audience.
- `@supabase/supabase-js` becomes the site's second runtime dependency. It is isolated to the Hot Takes client module.

---

## ADR-008: Event-driven approval email through Resend

- **Status:** Accepted
- **Date:** 2026-10-19

### Context

Pending takes need human review, but Supabase Studio does not provide a purpose-built email notification for new application rows. Notification delivery must not expose an email API key in the static site or make take submission depend synchronously on an email provider.

### Decision

Use a Supabase Database Webhook on `takes` inserts to invoke a Supabase Edge Function asynchronously. The function accepts only requests with a dedicated webhook secret, ignores non-pending rows, and sends one moderator email through Resend. Store the Resend key, recipient, sender and webhook secret as Supabase project secrets. Use the take UUID as the provider idempotency key.

### Alternatives considered

- **Send from the browser:** rejected because it would expose the provider API key and let visitors send arbitrary mail.
- **Send inside the submission database function:** rejected because email latency or failure would become part of the database transaction.
- **Scheduled polling:** simpler failure recovery, but delays alerts and repeatedly queries an otherwise event-driven workflow.
- **Gmail API/SMTP:** avoids another mail product but requires broader OAuth credentials and more token lifecycle work.

### Reasons

- Database webhooks use asynchronous `pg_net`, keeping submission independent from delivery latency.
- Edge Functions are already part of the selected Supabase platform and keep credentials server-side.
- Direct `fetch` to Resend needs no additional package; its free tier is ample for the ten-minute submission limit.

### Trade-offs and consequences

- Resend is another external account and processor. A verified sender domain is needed beyond initial account-owner testing.
- Delivery is observable but not durable: failed webhook/email calls need manual inspection and retry in the MVP.
- The webhook configuration is currently a documented dashboard step because its project URL and shared secret are environment-specific.
