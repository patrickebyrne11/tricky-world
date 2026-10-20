# Hot Takes Board Plan

> **Implementation status (2026-10-20):** The application, Supabase project, production migrations, Auth URLs, repository variables, voting, submissions, moderator queue, temporary guest access and Resend approval-email path are live. The automated guest/security checks pass and the production webhook returns HTTP 204. Patrick still needs to confirm inbox delivery and test Approve/Reject with his moderator browser session; custom SMTP remains optional.

## New-chat handoff — read this first

### Live production state

- Production is deployed from commit `be6d06e` at `https://patrickebyrne11.github.io/tricky-world/takes/`.
- The live version supports approved-take browsing, guest and email magic-link accounts, pending submissions, one changeable vote per user, and the moderator queue at `/takes/admin/`.
- Supabase project `tricky-world` (`gwhnkjsikzzysskwdiwd`) is linked. Migrations `202610190001` through `202610200001` are applied remotely.
- The first approved take is `Good singers shouldn’t do karaoke.`
- GitHub repository variables contain the public Supabase URL and publishable key. Production was verified to contain that browser configuration.
- Legacy Supabase `anon`/`service_role` keys were disabled after the CLI unexpectedly printed them. Do not restore or commit legacy keys. The browser uses the new publishable key; privileged credentials must remain server-side.

### Implemented and deployed

- `/takes/admin/`: a static moderation page with email login, JWT refresh, pending queue, Approve and Reject controls.
- `get_pending_takes()`: a `security definer` RPC that returns only pending UUID, body and timestamp after checking `app_metadata.role = moderator`.
- `moderate_take()` remains the only browser moderation write path and checks the same protected claim.
- The board now offers both **Join as guest** (`signInAnonymously`) and email magic-link access. Guest mode creates an authenticated UUID without sending email; it does not weaken the moderator check.
- Approval emails now link to `/takes/admin/` rather than Supabase Studio.
- Documentation includes ADR-009 for the admin queue/Resend delivery and ADR-010 for temporary guest testing.
- Supabase Authentication has Anonymous Sign-Ins enabled and allows both local and production admin redirect URLs. `npx supabase config diff` verified these settings on 2026-10-20.
- The `notify-pending-take` Edge Function is deployed as version 1 with gateway JWT verification disabled. Its dedicated webhook secret remains the intended authentication boundary.
- Migration `202610200001` owns the `pg_net` insert trigger. Its Vault-held secret, Edge Function secrets and Resend delivery are configured; an end-to-end insert returned HTTP 204 on 2026-10-20.

### Remaining hosted verification

1. Confirm the two labelled test messages arrived in the moderator inbox (one direct function test and one real database-trigger test).
2. Test Approve and Reject through Patrick's authenticated `/takes/admin/` browser session.
3. After verifying a sender domain, optionally configure Resend as Supabase Auth's custom SMTP provider.

### Next implementation/verification steps

1. Test **Join as guest** in a fresh/private browser profile to cover the UI path. The underlying production RPC path was verified automatically on 2026-10-20:
   - guest session is created without email;
   - guest can submit and vote;
   - changing a vote updates the existing row;
   - a second submission inside ten minutes is rejected.
2. Test `/takes/admin/` with Patrick's email-authenticated account:
   - Patrick's `auth.users.raw_app_meta_data` should contain `{"role":"moderator"}`;
   - use **Refresh access** after a metadata change instead of signing out and consuming another magic link;
   - verify pending takes load and Approve/Reject removes them from the queue;
   - verify a non-moderator/guest gets HTTP 401 and no queue content. Anonymous access to `get_pending_takes()` has already been tested and returns `Moderator access required.`
3. Confirm the notification messages reached the inbox. Direct correct-secret delivery, wrong-secret HTTP 401, idempotency, seed-row ignore behaviour and a real database-trigger delivery were accepted successfully by Resend on 2026-10-20.
4. After verifying a sender domain, configure Resend custom SMTP for Supabase Auth. Supabase will still issue/validate sessions, but Resend will deliver magic-link mail instead of the restricted built-in test sender.
5. Run the complete checklist in `docs/HOT_TAKES_SETUP.md`, then build, commit and deploy. Do not include the unrelated untracked `SIX_DEGREES_OF_TRICKY_PROMPT.md`.

### Temporary guest-mode removal

Guest mode is intentionally reversible. Disable Anonymous Sign-Ins in Supabase, remove the guest button and `signInAnonymously()` handler, and set local `enable_anonymous_sign_ins = false`. Existing guest-created takes remain with `created_by = null` if those Auth users are deleted; their votes are removed by the foreign-key cascade. Email sign-in and moderation are otherwise unchanged.

## Goal

Build a public board where people can submit short takes, approved takes stay available, and other people vote Agree or Disagree. Show the vote split in a market-style way. This is a learning project for full-stack development, authentication, database design, security, and moderation.

## MVP decisions

- Add the board at `/takes` on the existing Tricky World site.
- Keep Astro and GitHub Pages for the interface. Use Supabase Postgres and Auth for persistent data and accounts; GitHub Pages alone cannot store submissions or votes.
- Require an authenticated Supabase session to submit or vote. During friend testing this can be an anonymous browser session or a persistent email account. The database permits one active vote per user UUID and allows it to change.
- New submissions start as `pending`. Patrick reviews them at `/takes/admin/` and approves or rejects them before they appear publicly; Supabase Studio remains a fallback.
- Votes are Agree or Disagree. Display the split as percentages from the vote counts; these are opinions, not financial odds.
- No money, wagers, or prizes. Fake points and leaderboards are out of the first release.
- Keep the MVP small: a list, a submission form, sign-in, voting, and basic moderation. No comments.

These are the implemented defaults for the first release.

## Current architecture

```text
Browser
  ├── Astro `/takes` page (guest/email Auth, submissions and voting)
  ├── Astro `/takes/admin` page (moderator queue)
  └── Supabase Auth + Data API
        ├── Postgres tables protected by RLS and narrow RPCs
        └── takes INSERT webhook
              └── Edge Function → Resend → Patrick's inbox
```

The browser uses only Supabase's public/publishable key. Database functions and policies enforce what users can do; no service-role or Resend key goes into the site. Public reads return approved takes and aggregate vote counts, not individual voters. The admin URL is discoverable because GitHub Pages is static, but Postgres returns queue data and accepts moderation actions only for the protected moderator claim.

Use the Supabase free tier for the prototype, within its quotas. Free projects can pause after a week of inactivity, so check its current limits before inviting people to rely on the board.

## Initial data model

### `takes`

| Column | Purpose |
|---|---|
| `id` | UUID primary key |
| `body` | Take text, with a maximum length |
| `created_by` | Auth user who submitted it |
| `created_at` | Submission time |
| `status` | `pending`, `approved`, or `rejected` |
| `moderated_at` | When it was reviewed |

### `votes`

| Column | Purpose |
|---|---|
| `take_id` | Take being voted on |
| `user_id` | Auth user casting the vote |
| `choice` | `agree` or `disagree` |
| `created_at` | Vote time |

Use `(take_id, user_id)` as the primary or unique key so the database guarantees at most one active vote per person per take. Allowing a user to change that vote updates the same row.

Expose counts through a database view or function that reveals only totals. Do not expose the raw votes table to public readers.

## Build phases

### 1. Confirm the product rules

- Decide how users sign in and what display name, if any, appears publicly.
- Confirm the proposed moderation queue and vote-changing behaviour.
- Define take length, submission frequency, and simple posting rules.

### 2. Create the backend foundation

- Create a Supabase project and configure local development and production URLs.
- Add database migrations for `takes` and `votes`.
- Enable Row Level Security and write policies for public reads, own submissions, own votes, and moderator-only review.
- Add a small set of seed takes for local UI development.

### 3. Read-only board

- Build the `/takes` page with approved takes and Agree/Disagree totals.
- Add loading, empty, and service-error states.
- Verify the public client cannot read pending takes or individual voter identities.

### 4. Sign-in and submissions

- Offer email magic-link accounts plus temporary anonymous guest sessions for concentrated friend testing.
- Add a submission form with server-side/database validation and a clear pending-review confirmation.
- Review and approve or reject submissions through `/takes/admin/`; keep Supabase Studio as an emergency fallback.

### 5. Voting

- Allow signed-in users to cast or change one vote per take.
- Enforce uniqueness and ownership in Postgres policies and constraints, not only in the UI.
- Update the displayed split after a vote.

### 6. Prepare for public use

- Patrick can approve or reject a take from the protected admin queue.
- Keep the current ten-minute submission limit; revisit it only if the friend group needs something different.
  - Add a short explanation of how friends can sign in, submit, and vote, plus a factual account-data note.
- Check current hosting quotas and moderation responsibilities before sharing the site widely.

## Out of scope for the MVP

- Real money, bets, prizes, or transferable points.
- Comments, replies, private messages, and live chat.
- Automated moderation, reputation scores, leaderboards, user-facing notifications, and real-time subscriptions. Moderator approval email was added after the MVP plan.
- A custom moderator dashboard was originally deferred, then added after real use showed that manual SQL was too awkward.

## Done when

- Anyone can browse approved takes without signing in.
- A signed-in user can submit a take, which remains private until approved.
- A moderator can approve, reject, or remove a take.
- A signed-in user can vote once per take and change their vote.
- The public page shows correct Agree/Disagree totals without exposing voter identities or pending content.
- Database policies and constraints enforce these rules even if someone bypasses the page UI.
- The app remains within the free tier during the initial test, with costs and quota limits understood before launch.
