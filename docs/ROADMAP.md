# Roadmap

Committed work is above the line, speculative ideas below it. Move items between sections as work progresses.

## Done

- **2026-10-17**: Project created: public GitHub repo, Astro 7 minimal + TypeScript strict, repo-local personal git identity.
- **2026-10-17**: Book data model: content collection over `books.json` with a Zod schema. Build fails on invalid values, unknown fields and duplicate ids (verified by deliberately breaking the data).
- **2026-10-17**: Base layout, navigation, homepage, `/books` library page (sorted by status, status counts, half-star ratings, responsive, dark mode). Base-path-aware links via `url()`.
- **2026-10-17**: Project documentation: README, AGENTS.md, mission, architecture, roadmap, ADRs, learning log.
- **2026-10-17**: Library status filter (vanilla TypeScript, progressive enhancement), implemented by Patrick.
- **2026-10-17**: Deployed to GitHub Pages via GitHub Actions (workflow written by Patrick). Live at https://patrickebyrne11.github.io/tricky-world/. **Phase 1 v1 milestone reached.**
- **2026-10-17**: Real library imported: 36 books read 2022–2025. Example books removed. Schema: `dateCompleted` (full date) replaced with `yearRead` (year), since only years are known. Read books are sorted newest year first.
- **2026-10-19**: Visual redesign loosely inspired by Tyler, the Creator's later eras: bone/forest/rust palette, condensed uppercase type with a misregistered-print headline, film grain, stamp-style labels, cards a fraction off-square. Homepage cut down to Explore + Coming soon. Plain CSS, no new dependencies.

## In progress

- **Strava training page** ([ADR-006](DECISIONS.md#adr-006-build-time-strava-totals)). Route and daily build refresh implemented. Add `STRAVA_SECRET_WRITE_TOKEN` (fine-grained token with Actions secrets write for this repo) to enable production snapshots; other Strava secrets are already configured.

## Next (Phase 1, committed)

1. **Confirm interpreted library entries.** Patrick to check: *Born to Run* (assumed Christopher McDougall, not the Springsteen memoir), *Me Cheeta* (James Lever, from "Me, cetah"), *The Bee Sting* ("Beesting"), *Station Eleven* ("Eleven station"), *The Boys in the Boat* ("Boys on the boat"). Add currently-reading / want-to-read books, ratings and genres when he has them.
2. **Search** by title/author on the library page (client-side, same pattern as the filter). Optional: sync filter/search to the URL (`?status=read`) so views are shareable.
3. **Type checking in CI.** Consider `astro check` (adds `@astrojs/check` + `typescript` as dev dependencies), since `astro build` doesn't type-check.
4. Close the known data gaps (entry missing `id`, same book under two ids). For example, a small validation script run in CI.

---

## Future phases (speculative, not committed)

Order and scope will change. Each phase should start from a real feature that needs the technology.

### Phase 1: Personal website *(current)*
Astro, TypeScript, HTML/CSS, GitHub Pages, GitHub Actions. Homepage, library, responsive design, navigation.
**Learning:** web fundamentals, components, routing, static site generation, frontend architecture, deployment.

### Phase 2: Interactive frontend
React components inside Astro (islands) when real interactivity justifies it. Ideas: advanced book filtering, interactive reading statistics, data visualisations, small experiments.
**Learning:** components, props, state, hooks, client-side rendering, data fetching.

### Phase 3: Full-stack application (gym tracker)
Possibly React/Next.js, PostgreSQL, Supabase, auth, REST APIs. Workout logging, exercises, sets/reps, progressive overload, charts. **Deployed independently** of the main site.
**Learning:** application data modelling, CRUD, migrations, authentication, authorisation, API design, frontend/backend communication.

### Phase 4: AI applications
Personal chatbot: LLM APIs, tool calling, streaming, RAG, vector search (pgvector). Recommend books, answer questions about the library, interact with gym data.
**Learning:** LLM app architecture, streaming, retrieval, prompt engineering, security, cost management, evaluation.

### Phase 5: Backend engineering
At least one standalone backend: Python, FastAPI, Pydantic, PostgreSQL, Docker.
**Learning:** REST design, HTTP, validation, auth, transactions, async, error handling, integration testing, without leaning on a full-stack framework.

### Phase 6: Cloud and infrastructure
AWS, Terraform, Docker, GitHub Actions, S3, CloudFront, Lambda, ECS. Only where they solve a real problem.
**Learning:** IaC, CI/CD, containers, networking, deployment architecture, secrets, reliability, cost management.

### Phase 7: Production engineering
Playwright, Vitest, OpenTelemetry, structured logging, monitoring, Redis where justified.
**Learning:** automated testing, performance, observability, reliability, security, caching, system design.

### Ideas parking lot
- Articles/writing section (Markdown content collection)
- Projects and hackathon demos section
- Book covers (local images via Astro's image pipeline vs remote URLs)
- Reading stats (books per year, genre breakdown)
- Custom domain
- Possible move to Next.js or another host *if* requirements outgrow Astro/GitHub Pages (an option, not a plan)
- Kubernetes: only with a compelling learning or architectural reason
- **Strava stats**: see In progress.
- **Hand-entered fitness data**: Boditrax latest scan, calories. Neither has a usable public API (MyFitnessPal is partner-only). JSON + schema like `books.json`. Decide what's comfortable to publish.
- **Hot takes market**: visitors submit takes, others vote agree/disagree, Polymarket-style odds display. Fake points only, never real money (UK gambling law). Needs backend + database, rate limiting, moderation. User-generated content brings UK Online Safety Act duties.
- **"What your browser tells me" page**: show visitors everything the site can learn about them (rough IP location, device, browser, timezone, language, screen, referrer, fingerprint signals) as a lesson in web footprint. Mostly client-side; display only, store nothing (storing IPs makes it personal data under GDPR).
- **Presence / live visitors**: who's on the site now, with coarse info only. Real-time (WebSockets/SSE). Natural precursor to a chat room.
- **Chat room**: real-time, needs moderation.
- **Live location** (friend's idea): city level and delayed only.
- **AI features**: model calls bill whoever's API key is used (Patrick's). Keep keys server-side, rate-limit, set a spend cap; prefer build-time generation where possible. Unused Cognee hackathon credits could back "Ask my library" (knowledge graph + retrieval over books/reviews).
