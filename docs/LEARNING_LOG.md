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

---

## 2026-10-17: First CI/CD pipeline (GitHub Actions to GitHub Pages)

**Technology / concept:** GitHub Actions, GitHub Pages deployments, OIDC, least-privilege workflow permissions, concurrency control, OAuth token scopes.

**Why introduced:** To get v1 online with every push to `main` deployed automatically and bad builds blocked.

**What I implemented:** `.github/workflows/deploy.yml` (written by Patrick): a two-job pipeline `build` then `deploy`, using `withastro/action` and `actions/deploy-pages`. Enabled Pages with build type "workflow".

**What I learned:**
- **A workflow is a small DAG.** Jobs are tasks, `needs:` is a dependency edge, and artifacts pass outputs between jobs, like Airflow/Step Functions tasks handing off via S3.
- **CI as a quality gate.** The build doubles as data validation, so a broken `books.json` fails the pipeline and the previous site stays live. Same idea as failing a dbt run before publishing a model.
- **`permissions:` is IAM for the workflow token.** Grant only what's needed. `id-token: write` enables OIDC: the job proves its identity with a short-lived signed token instead of a stored secret, the same mechanism as GitHub Actions assuming an AWS role.
- **`concurrency:`** serialises deploys so two pushes can't race.
- **Token scopes.** Pushing files under `.github/workflows/` requires the `workflow` OAuth scope, a separate permission from `repo`, because workflows can run code with repo credentials.

**Challenges:**
- `gh auth refresh` has no `-u` flag; it only acts on the active account. Fix: `gh auth switch`, refresh, switch back.
- Keeping work and personal identities separate: repo-local git email, per-command credential helper for pushes, and squashing an unpushed commit to remove the work username before it became public.

**What I'd do differently:**
- *Patrick to add.*

---

## 2026-10-19: Visual redesign with design tokens

**Technology / concept:** CSS custom properties as a two-layer token system, `:nth-child` patterns, `prefers-reduced-motion`, SVG `feTurbulence` noise as a data-URI overlay, `font-stretch`, `-webkit-text-stroke`, `color-mix()`.

**Why introduced:** The site looked generic. First pass (pastel, chunky) read as childish; second pass went earthier and more editorial.

**What I implemented:** Restyled `global.css`, `BookCard.astro`, `index.astro` and `books.astro`. Homepage intro removed.

**What I learned:**
- **Palette vs theme tokens.** Fixed colours (`--rust`, `--ink`) are one layer; semantic tokens (`--bg`, `--fg`, `--line`) point at them and are the only thing dark mode overrides. Like raw/staging models vs marts: change the mapping, not every consumer. This is why the second redesign was mostly a token swap.
- **Components can expose CSS variables as a parameter.** `BookCard` reads `--card-accent`; the list sets it per `:nth-child(4n + k)`. The card doesn't know about the list.
- **"Imperfect" is deliberate.** Sub-degree rotations, a 3px offset text-shadow and a grain overlay make flat CSS look printed rather than templated.
- **Respect motion preferences.** Hover animations sit inside `@media (prefers-reduced-motion: no-preference)`.

**Challenges:**
- System font stacks only: Futura and Iowan Old Style exist on macOS; other platforms fall back to Arial Narrow / Georgia.

**What I'd do differently:**
- *Patrick to add.*

---

## 2026-10-19: Build-time API integration

**Technology / concept:** OAuth 2.0 refresh tokens, server-only Astro environment variables, build-time API calls, fail-soft static generation.

**Why introduced:** Add aggregate Strava training totals without introducing a runtime backend.

**What I implemented:** An optional Strava client validated with Zod and a progressively rendered `/training` page. The deploy workflow refreshes the API token daily and saves rotated refresh tokens to GitHub Actions secrets. Missing credentials do not block the site build.

**What I learned:**
- Server-only build variables keep credentials out of browser bundles, but a static build still needs somewhere durable to store changing authentication state.
- Strava may rotate a refresh token when issuing an access token and immediately invalidate the old token. The workflow needs narrowly scoped permission to update the stored GitHub secret after each refresh.
- API access and permission to publish the returned data are separate concerns. Technical access does not override the provider's API agreement.

**Challenges:** Making the static build unattended requires keeping authentication state current in Actions secrets.

**What I'd do differently:** Confirm API publication terms and token lifecycle before designing the deployment workflow.

---

## 2026-10-19: First runtime backend and authorization boundary

**Technology / concept:** Supabase Postgres, passwordless Auth, Row Level Security, database RPC functions, composite keys, browser sessions, Astro environment variables, static type checking.

**Why introduced:** Hot Takes is the first feature whose data changes between site builds. Submissions and votes need durable state, authenticated ownership, and moderation.

**What I implemented:** A static `/takes` shell with a vanilla TypeScript client; private `takes` and `votes` tables; aggregate-only reads; moderated submissions; atomic vote changes; database-enforced cooldown; and `astro check` as a build gate.

**What I learned:**
- **A publishable key is an identifier, not an authorization system.** Like exposing a warehouse account name, its visibility is expected. Grants, constraints, RLS and functions decide what the caller can do.
- **The database can be the API boundary.** The browser calls narrow functions instead of reading operational tables. `get_takes()` behaves like a governed aggregate mart: public totals out, voter identities kept behind the boundary.
- **Constraints beat UI promises.** The composite vote primary key makes duplicate active votes impossible even under concurrent requests. A trigger owns submission cooldown and forced pending status.
- **Authentication and authorization differ.** Auth proves which user is calling; database logic decides whether that identity may submit, vote or moderate.
- **Static and dynamic can coexist.** The main site remains build-time Astro. One client module connects to a runtime service only on the page that needs it.
- **Bundling is not type checking.** `astro build` accepted the client, but `astro check` is now the explicit compiler gate for templates and TypeScript.

**Challenges:** Seed data runs without a browser user, while real submissions must never be anonymous. The trigger therefore permits approved authorless seed rows only from a direct `postgres` session; Data API sessions cannot use that path.

**What I'd do differently:** Add automated database integration tests once the Supabase project or local CLI environment is established, rather than relying on a manual pre-launch security checklist.

---

## 2026-10-19: Event-driven moderation notification

**Technology / concept:** Database webhooks, asynchronous delivery, Supabase Edge Functions, transactional email, shared-secret authentication, idempotency keys.

**Why introduced:** A pending take is useful only if the moderator knows it exists.

**What I implemented:** An insert webhook invokes a server-side TypeScript function, which validates the event and sends an approval email through Resend without exposing credentials to the site.

**What I learned:**
- **Keep side effects outside the transaction.** The take is the source-of-truth event; email is a downstream notification. A provider outage should not reject valid data, like a non-critical event consumer should not roll back its producer.
- **Authenticate internal webhooks.** An unguessable function URL is not authorization. The function checks an independently generated secret before processing user content.
- **Design for at-least-once delivery.** Webhooks may repeat. Passing the take UUID as an idempotency key makes repeated delivery safe.
- **Async is not the same as durable.** The MVP logs failed delivery but does not retry automatically. An outbox table plus scheduled retries would be the next reliability step if missed mail becomes costly.

**Challenges:** Email providers require sender verification for general delivery. The provider's onboarding address is enough for testing to the account owner, but a custom sender needs a verified domain.

**What I'd do differently:** Add a notification outbox and alert on exhausted retries before relying on email as the only moderation queue signal.

---

## 2026-10-19: Moderator UI over a static site

**Technology / concept:** Capability-oriented RPCs, JWT claims, defence in depth, custom SMTP, static route versus protected data.

**Why introduced:** Manual SQL was technically sufficient but operationally clumsy. Moderation needed to become a normal product workflow without moving the whole site off GitHub Pages.

**What I implemented:** A static `/takes/admin` page, moderator-only pending queue RPC, approve/reject controls, a JWT refresh action, notification links to the queue, and documented Resend SMTP delivery for Auth mail.

**What I learned:**
- **A private-looking URL is not authorization.** Static hosts publish the page shell to everyone. The database must decide whether the caller may receive queue data or change status.
- **Design APIs around capabilities.** `get_pending_takes()` exposes exactly the moderation fields needed, rather than granting the browser table access. This is comparable to a governed stored procedure instead of broad warehouse table privileges.
- **Authentication and delivery can be separate.** Supabase can own magic-link tokens and sessions while Resend owns SMTP delivery and its limits.
- **Avoid state changes in email GET links.** Security scanners may open links. Email leads to an authenticated queue; approval still requires an explicit POST-style RPC action.

**Challenges:** Moderator metadata is copied into the JWT. Changing database-side user metadata does not rewrite an existing token, so the client needs a safe refresh path.

**What I'd do differently:** Build the small moderation queue as soon as the first manual approval demonstrates real friction, instead of treating operational UX as optional polish.

---

## 2026-10-19: Temporary anonymous Auth for friend testing

**Technology / concept:** Supabase anonymous users, browser-persisted sessions, identity strength versus authorization.

**Why introduced:** Friends need to test submissions and voting immediately, while the default magic-link sender is rate-limited and custom SMTP is not active yet.

**What I implemented:** A one-click **Join as guest** path alongside persistent email sign-in. It creates a real authenticated Supabase user without collecting email.

**What I learned:** Anonymous authentication is different from no authentication. It still supplies `auth.uid()` and works with the same RLS/RPC boundary, but identifies a browser installation rather than a verified person. Database ownership remains sound; the product claim "one person, one vote" becomes weaker.

**Challenges:** Anonymous users share the `authenticated` Postgres role, so authorization must continue to depend on protected claims for moderator actions rather than the role alone.

**What I'd do differently:** Configure custom SMTP before a concentrated test session, then use guest access only when its browser-level identity trade-off is intentional.
