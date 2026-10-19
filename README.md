# Tricky World

> A little corner of the internet for books, projects and experiments.

Tricky World is the personal website of Patrick Byrne ("Tricky"). It's also his engineering playground: a place to turn ideas into working software, try out technologies, and build the skills to take an idea all the way to production.

> Start simple. Build something useful. Understand it. Improve it. Repeat.

The long-term purpose is in [docs/MISSION.md](docs/MISSION.md).

## Status

**Phase 1: Personal website, in progress.** See [docs/ROADMAP.md](docs/ROADMAP.md) for exactly where things stand.

| | |
|---|---|
| Repository | https://github.com/patrickebyrne11/tricky-world |
| Live site | https://patrickebyrne11.github.io/tricky-world/ |
| Local dev | http://localhost:4321/tricky-world/ |

## Current features

- **Homepage** (`/`): introduction and navigation.
- **Library** (`/books`): personal reading list with reading status, half-star ratings, genres, optional reviews and the year each book was read. Book data is checked against a schema at build time, and books can be filtered by status.
- **Training** (`/training`): aggregate run, ride and swim totals from Strava when credentials are available at build time; otherwise it degrades to an unavailable message.
- **Hot Takes** (`/takes`): a small opinion board for friends, backed by Supabase. Approved takes and aggregate votes are public; guests or email-authenticated users can submit and vote. A moderator-only queue lives at `/takes/admin`.

## Technology stack

| Concern | Choice |
|---|---|
| Framework | [Astro](https://astro.build) 7 (static site generation) |
| Language | TypeScript (strict) |
| Styling | Plain CSS (global stylesheet + component-scoped `<style>`) |
| Content | Astro content collection over a JSON file, validated with Zod 4 |
| Hosting | GitHub Pages (project site under `/tricky-world/`) |
| CI/CD | GitHub Actions (build + deploy on push to `main`) |
| Backend / database / auth | Supabase Postgres + Auth for Hot Takes only |

## Local development

Prerequisites: Node.js ≥ 22.22 (developed on Node 24), npm, Git.

```sh
npm install
npm run dev        # http://localhost:4321/tricky-world/
npm run check      # type-check Astro and TypeScript
npm run build      # type-check + production build to ./dist (also validates book data)
npm run preview    # serve ./dist locally
```

All URLs include the `/tricky-world/` base path, even locally. `http://localhost:4321/` on its own will 404.

## Updating the library

Books live in [src/data/books.json](src/data/books.json). The rules each entry must follow are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#book-data). After editing, run `npm run build`: if the data breaks the rules (bad status, rating out of range, misspelt field, duplicate book), the build fails and tells you which entry and field.

## Deployment

Every push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml): GitHub Actions builds the site (which also validates the book data) and publishes `dist/` to GitHub Pages. If the build fails, the previous version stays live. Watch runs in the repo's **Actions** tab. Details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#deployment).

The workflow also refreshes Strava training totals daily. It requires the `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, and `STRAVA_SECRET_WRITE_TOKEN` Actions secrets; without them, the site still builds and shows the unavailable message.

Hot Takes requires the `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` Actions variables. They are public browser configuration, not secrets. Approval-email credentials live separately in Supabase project secrets. Backend, notification and security setup is in [docs/HOT_TAKES_SETUP.md](docs/HOT_TAKES_SETUP.md).

## Documentation

| Doc | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Instructions for AI coding assistants working in this repo |
| [docs/MISSION.md](docs/MISSION.md) | Why Tricky World exists and how it should grow |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it works now: structure, data, hosting, deployment |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Done, in progress, next, and speculative ideas |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |
| [docs/LEARNING_LOG.md](docs/LEARNING_LOG.md) | What's been learned at each milestone |
