# Roadmap

Committed work is above the line, speculative ideas below it. Move items between sections as work progresses.

## Done

- **2026-10-17**: Project created: public GitHub repo, Astro 7 minimal + TypeScript strict, repo-local personal git identity.
- **2026-10-17**: Book data model: content collection over `books.json` with a Zod schema. Build fails on invalid values, unknown fields and duplicate ids (verified by deliberately breaking the data).
- **2026-10-17**: Base layout, navigation, homepage, `/books` library page (sorted by status, status counts, half-star ratings, responsive, dark mode). Base-path-aware links via `url()`.
- **2026-10-17**: Project documentation: README, AGENTS.md, mission, architecture, roadmap, ADRs, learning log.
- **2026-10-17**: Library status filter (vanilla TypeScript, progressive enhancement), implemented by Patrick.

## In progress

- **Deploy to GitHub Pages** (see Next, item 1).

## Next (Phase 1, committed)

1. **Deploy to GitHub Pages.** Add `.github/workflows/deploy.yml`, set Pages source to GitHub Actions, verify the live URL. The personal `gh` token needs the `workflow` scope first: `gh auth refresh -h github.com -u patrickebyrne11 -s workflow`.
2. **Replace example books with the real library.** Remove the "Example data" notice in `books.astro` at the same time.
3. **Search** by title/author on the library page (client-side, same pattern as the filter). Optional: sync filter/search to the URL (`?status=read`) so views are shareable.
4. **Type checking in CI.** Consider `astro check` (adds `@astrojs/check` + `typescript` as dev dependencies), since `astro build` doesn't type-check.
5. Close the known data gaps (entry missing `id`, same book under two ids). For example, a small validation script run in CI.

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
