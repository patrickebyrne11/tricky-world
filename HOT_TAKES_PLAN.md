# Hot Takes Board Plan

> **Implementation status (2026-10-19):** Application code, database migration, seed data, approval-email function, contribution explainer, type checking, and deployment configuration are implemented. External activation remains: create/link the Supabase project, apply the migration, configure authentication URLs, repository variables, the Resend notification secrets/webhook, then run `docs/HOT_TAKES_SETUP.md`'s security checklist.

## Goal

Build a public board where people can submit short takes, approved takes stay available, and other people vote Agree or Disagree. Show the vote split in a market-style way. This is a learning project for full-stack development, authentication, database design, security, and moderation.

## MVP decisions

- Add the board at `/takes` on the existing Tricky World site.
- Keep Astro and GitHub Pages for the interface. Use Supabase Postgres and Auth for persistent data and accounts; GitHub Pages alone cannot store submissions or votes.
- Require sign-in to submit or vote. A person gets one active vote per take and can change it.
- New submissions start as `pending`. Patrick reviews them in Supabase and approves or rejects them before they appear publicly.
- Votes are Agree or Disagree. Display the split as percentages from the vote counts; these are opinions, not financial odds.
- No money, wagers, or prizes. Fake points and leaderboards are out of the first release.
- Keep the MVP small: a list, a submission form, sign-in, voting, and basic moderation. No comments.

These are proposed defaults for the first release and can be changed before implementation.

## Proposed architecture

```text
Browser
  ├── Astro `/takes` page (static HTML + small client-side TypeScript)
  └── Supabase Auth + Data API
        └── Postgres tables protected by Row Level Security
```

The browser uses only Supabase's public/publishable key. Database policies enforce what signed-in users can do; no service-role key goes into the site. Public reads return approved takes and aggregate vote counts, not individual voters.

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

- Add the selected sign-in method.
- Add a submission form with server-side/database validation and a clear pending-review confirmation.
- Review and approve or reject submissions through Supabase Studio initially; defer a custom admin page.

### 5. Voting

- Allow signed-in users to cast or change one vote per take.
- Enforce uniqueness and ownership in Postgres policies and constraints, not only in the UI.
- Update the displayed split after a vote.

### 6. Prepare for public use

- Patrick can hide a take by rejecting it in Supabase Studio.
- Keep the current ten-minute submission limit; revisit it only if the friend group needs something different.
  - Add a short explanation of how friends can sign in, submit, and vote, plus a factual account-data note.
- Check current hosting quotas and moderation responsibilities before sharing the site widely.

## Out of scope for the MVP

- Real money, bets, prizes, or transferable points.
- Comments, replies, private messages, and live chat.
- Automated moderation, reputation scores, leaderboards, user-facing notifications, and real-time subscriptions. Moderator approval email was added after the MVP plan.
- A custom moderator dashboard; Supabase Studio is enough initially.

## Done when

- Anyone can browse approved takes without signing in.
- A signed-in user can submit a take, which remains private until approved.
- A moderator can approve, reject, or remove a take.
- A signed-in user can vote once per take and change their vote.
- The public page shows correct Agree/Disagree totals without exposing voter identities or pending content.
- Database policies and constraints enforce these rules even if someone bypasses the page UI.
- The app remains within the free tier during the initial test, with costs and quota limits understood before launch.
