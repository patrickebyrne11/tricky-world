# Learning Log

What's been learned at each milestone. The goal is transferable engineering knowledge, not a changelog.

Template:

```
## YYYY-MM-DD: Milestone
**Technology / concept:**
**Why introduced:**
**What I implemented:**
**What I learned:**
**Challenges:**
**What I'd do differently:**
```

---

## 2026-10-17: Project setup, Astro, and the book data contract

**Technology / concept:** Astro (static site generation), TypeScript strict mode, content collections, Zod 4 schemas, base paths for GitHub Pages, progressive enhancement, repo-local git identity.

**Why introduced:** Phase 1 needs a fast, content-focused site with typed, validated book data and no backend.

**What I implemented:**
- Scaffolded Astro's `minimal` template (one runtime dependency).
- A schema for `books.json` (`src/content.config.ts`), then deliberately broke the data three ways to confirm the build fails on each.
- Base layout, homepage, library page, book card with half-star ratings, dark mode.
- The client-side status filter, written by Patrick: DOM queries (`querySelectorAll`), `data-*` attributes as the bridge between build-time HTML and browser code, `hidden`, `aria-pressed`, and click event listeners (event-driven code in the browser).

**What I learned:**
- **Build time vs runtime.** `.astro` frontmatter runs once in Node during the build; the output is static HTML. Like a dbt model: transform at build, serve the materialised result. `<script>` tags are the only code that runs in the browser.
- **File-based routing.** `src/pages/books.astro` becomes `/books/`. Same idea as dbt model filename = relation name.
- **Content collections = data contracts.** A Zod schema over JSON plays the role of dbt tests / Pydantic: invalid data fails the build, so it fails CI and never ships. `z.strictObject` catches misspelt keys that a normal object schema would silently drop.
- **Check the defaults.** Astro only *warns* on duplicate ids by default. Reading the installed source (`node_modules/astro/dist/content/loaders/file.js`) revealed this and the `prerenderConflictBehavior` option. Lesson: verify tool behaviour in the installed version, not from docs or memory.
- **Base paths.** A GitHub Pages project site lives under `/tricky-world/`, so every internal URL needs the prefix. Centralising it in `url()` makes a future custom domain a config change.
- **Progressive enhancement.** Render everything server-side (at build), then let JS hide/show. Works without JS, accessible, tiny payload.
- **Store codes, map labels.** Status values are stable codes (`want-to-read`) mapped to display labels in one module. Same idea as separating keys from descriptions in a dimension.

**Challenges:**
- `npm create astro` hung on npm's hidden "Ok to proceed?" prompt because output was piped through `tail`.
- Two GitHub accounts (work + personal) on one machine: used a per-command `GH_TOKEN` and repo-local `git config user.email` to keep the personal repo off the work identity.

**What I'd do differently:**
- Run scaffolding commands unpiped (or with `npx --yes`) so interactive prompts aren't hidden.
- *Patrick to add his own reflections here.*
