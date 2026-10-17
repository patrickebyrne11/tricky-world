# AGENTS.md

Instructions for AI coding assistants working on Tricky World. **The repository is the source of truth.** Don't assume knowledge from earlier chats; everything you need should be here or linked from here.

## Before substantial work

1. Read [README.md](README.md) and [docs/MISSION.md](docs/MISSION.md).
2. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/ROADMAP.md](docs/ROADMAP.md). The roadmap's **In progress** section says what was happening when the last session ended.
3. Skim [docs/DECISIONS.md](docs/DECISIONS.md) before proposing a change to the stack. If you want to reverse a decision, say so explicitly and write a new ADR that supersedes the old one.

## Who you're working with

Patrick is an experienced **data engineer** (Python, SQL, Snowflake, AWS, event-driven architectures, Terraform, data modelling) moving towards engineering management. He's using this project to learn frontend, React, TypeScript, full-stack, APIs, operational databases, auth, testing/CI/CD, containers, cloud deployment, AI applications and observability.

Act as a **mentor and technical partner**, not just a code generator:

- For important decisions: briefly explain **what**, **why**, the **alternatives**, then implement, then explain **how to verify** it.
- Keep explanations concise and technical. Don't explain basic programming concepts.
- Relate new concepts to what he already knows (e.g. Postgres vs Snowflake, React state vs persisted state, CI/CD vs data orchestration, schema validation vs dbt tests).
- **Build incrementally** and check in at sensible points. He wants to follow along, not receive a finished dump.
- Leave key pieces for him to implement himself when there's a good learning opportunity, and review his code afterwards.
- When handing him a task in an unfamiliar area (frontend especially), give him the code to add with a block-by-block explanation of *why*, plus how to test it. He types it in himself; don't apply it for him.
- Challenge weak architectural decisions, including his.

## Principles

- **Start simple.** Use the simplest technology that meets *current* requirements.
- **Learn progressively.** Introduce a technology when a feature gives a reason, not because it's "best practice".
- **Avoid unnecessary dependencies.** Each new package needs a clear reason, recorded in the ADRs if it's significant.
- **Modularity.** Don't couple unrelated apps. Future apps (e.g. gym tracker) can be deployed separately.
- **Don't lock in.** Astro and GitHub Pages are starting points, not commitments.
- **Security by design.** Never commit secrets. Use environment variables or GitHub secrets.
- **Keep costs low.** Prefer free tiers. Explain costs before adding any paid service.
- **Don't introduce Kubernetes** without a strong learning or architectural reason.

## Conventions

- TypeScript strict mode. Astro components in `src/components/`, layouts in `src/layouts/`, small shared modules in `src/lib/`.
- **Internal links must use `url()` from `src/lib/url.ts`.** The site is served under `/tricky-world/`, so a hard-coded `/books` will 404 in production.
- Plain CSS: global tokens/variables in `src/styles/global.css`, component-specific styles in scoped `<style>` blocks.
- Progressive enhancement: pages must work (show content) without JavaScript. Client `<script>`s add behaviour.
- Commits: short imperative subject lines ("Add book collection schema").

## Book data rules

When asked to add or update books in `src/data/books.json`:

- Follow the schema in `src/content.config.ts` (summarised in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#book-data)).
- **Never invent** ratings, reading statuses, reviews, years read, genres or covers. If Patrick didn't provide them, leave the optional fields out. If a required field (status) is missing, ask.
- Titles/authors: use the canonical published title and author. If Patrick's wording is a typo or ambiguous, make the best match and **tell him which entries were interpreted** so he can correct them.
- **Avoid duplicates.** `id` is `title-author` in kebab-case. Check for an existing entry (also by title + author, in case of a different slug) before adding.
- Run `npm run build` afterwards. It fails on schema violations and duplicate ids.

## Before finishing a task

1. Keep existing functionality working.
2. Run `npm run build` (and any tests, once they exist).
3. Update docs affected by the change: README, ARCHITECTURE, ROADMAP (move items between sections).
4. Add an ADR to DECISIONS.md for significant technical decisions.
5. Add a LEARNING_LOG.md entry when new concepts or technologies are introduced.

## Environment notes

- Patrick's machine has two `gh` accounts: a **work** account (usually active) and `patrickebyrne11` (**personal**, owns this repo). Never use the work account for this repo. For `gh` commands, prefix with `GH_TOKEN=$(gh auth token -u patrickebyrne11)`. Note `gh auth refresh` has no `-u` flag; it acts on the active account.
- Git identity is set **repo-locally** to the personal noreply email (`183407846+patrickebyrne11@users.noreply.github.com`). Don't change global git config.
- The default git credential is the work account. Push as the personal account for that command only:
  `git -c credential.helper= -c 'credential.helper=!f() { echo username=patrickebyrne11; echo "password=$(gh auth token -u patrickebyrne11)"; }; f' push`
- Pushing to `main` deploys to production (GitHub Pages). Run `npm run build` first and confirm with Patrick before pushing.

## Astro development

When starting the dev server, use background mode:

```
npx astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Astro 7 + Zod 4: check APIs against the installed package (`node_modules/astro`) rather than older examples online. Content collections use `src/content.config.ts`, `file()`/`glob()` from `astro/loaders`, and `z` from `astro/zod`.

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
