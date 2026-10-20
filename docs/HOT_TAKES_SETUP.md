# Hot Takes setup

The interface is deployed with the existing static Astro site. Supabase supplies the runtime database and passwordless authentication.

## 1. Create and link a Supabase project

Create a free Supabase project, then install or run the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started). From this repository:

```sh
npx supabase login
npx supabase init
npx supabase link --project-ref <project-ref>
npx supabase db push
```

`db push` applies the versioned files in `supabase/migrations/`: the schema followed by the initial approved take. Do not paste a service-role key into this repository or into a `PUBLIC_` variable.

For a fully local database, Docker must be running:

```sh
npx supabase start
npx supabase db reset
```

The reset applies the migration and `supabase/seed.sql`.

## 2. Configure authentication URLs

In Supabase **Authentication → URL Configuration**:

- Site URL: `https://patrickebyrne11.github.io/tricky-world/`
- Additional redirect URLs:
  - `http://localhost:4321/tricky-world/takes/`
  - `http://localhost:4321/tricky-world/takes/admin/`
  - `https://patrickebyrne11.github.io/tricky-world/takes/`
  - `https://patrickebyrne11.github.io/tricky-world/takes/admin/`

The public board temporarily offers both guest and email access for friend testing:

- **Join as guest** calls `signInAnonymously()` and creates an authenticated UUID immediately without sending email. Enable **Anonymous Sign-Ins** in the Supabase Authentication provider settings.
- **Email sign-in** calls `signInWithOtp()` and redirects the user back to `/takes/` after they click the email link. Use this for an identity that survives switching browsers or devices.

Guest identity is stored in that browser. Clearing site data or using another browser creates another user, so one vote means one browser profile during this temporary mode. Anonymous users still receive only the `authenticated` Postgres role; the existing RPC checks, cooldown and vote constraint continue to apply. Disable anonymous sign-ins and remove the guest button before treating voting as one verified person per account.

## 3. Configure the browser client

Copy `.env.example` to `.env` and use the project URL and **publishable** key shown in Supabase's Connect dialog:

```sh
cp .env.example .env
npm run dev
```

The publishable key is intentionally visible in the generated JavaScript. It identifies the project; database functions, grants, constraints, and Row Level Security provide authorization.

For GitHub Pages, add these as GitHub Actions **repository variables** (not secrets):

- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The deploy workflow passes them into Astro's build.

## 4. Make Patrick a moderator

After signing in once, set the user's protected app metadata with the Supabase SQL editor, replacing the UUID:

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"moderator"}'::jsonb
where id = '<patrick-user-id>';
```

Open `/takes/admin/` and choose **Refresh access** so the refreshed JWT contains the role without consuming another magic-link email. The page calls the moderator-only `get_pending_takes()` and `moderate_take()` functions to list, approve and reject submissions.

Supabase Studio remains a fallback. Change a take from `pending` to `approved` or `rejected` and set `moderated_at` in the same edit, or use the SQL editor:

```sql
update public.takes
set status = 'approved', moderated_at = now()
where id = '<take-id>';
```

Both admin RPCs authorize the protected `app_metadata.role` claim inside Postgres. The hidden board link and client-side checks are only presentation; they are not the security boundary. Supabase Studio uses an administrative database connection and is not constrained by browser RLS policies.

## 5. Enable approval notification emails

The `notify-pending-take` Edge Function, notification secrets, Vault secret and versioned database trigger were activated on 2026-10-20. The instructions below document how to reproduce or rotate the setup.

Notifications follow an event-driven path:

```text
pending take inserted → async database webhook → Edge Function → Resend → moderator inbox
```

The webhook is asynchronous, so an email-provider outage does not roll back a valid take submission. Failed calls remain visible in Supabase's Edge Function logs and the database webhook history.

1. Create a [Resend](https://resend.com/) account and API key. For initial notification testing, `onboarding@resend.dev` can send to the address associated with your Resend account. Verify a sender domain before sending to other recipients, using a Tricky World sender, or configuring Auth SMTP.
2. Copy the function environment template, fill it locally, and generate an independent webhook secret:

   ```sh
   cp supabase/functions/.env.example supabase/functions/.env
   openssl rand -hex 32
   ```

3. Save the values as Supabase Edge Function secrets. The deployed function has gateway JWT verification disabled and authenticates the database webhook using `HOT_TAKES_WEBHOOK_SECRET` instead. Redeploy only when its code changes.

   ```sh
   npx supabase secrets set --env-file supabase/functions/.env
   ```

4. Store the same webhook secret in Supabase Vault under the name `hot_takes_webhook_secret`, then apply `202610200001_add_pending_take_webhook.sql`. The migration enables `pg_net` and creates the asynchronous `public.takes` insert trigger without putting the secret in git. This is an operational secret step; do not add the value to a migration.

Set `MODERATION_URL` to `https://patrickebyrne11.github.io/tricky-world/takes/admin/`; the notification email then opens the protected queue instead of Supabase Studio.

The function validates the secret and payload, ignores approved seed rows, escapes user content in HTML, and uses the take UUID as Resend's idempotency key so a repeated webhook cannot create duplicate email. Webhook responses are available in `net._http_response` for operational checks.

### Route Auth mail through Resend

Supabase still creates and validates magic links, but its built-in test sender has restrictive delivery limits. After verifying a sender domain in Resend, configure custom SMTP under Supabase **Authentication → Email**:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend API key
- Sender email: an address on the verified domain

This moves email delivery and its limits to the project's Resend account while leaving authentication and sessions in Supabase. Keep the API key in Supabase settings and function secrets; never put it in a `PUBLIC_` variable or GitHub Pages bundle.

## 6. Verify the security boundary

Before sharing the board publicly, verify all of these with the publishable key or the browser:

1. Signed-out users can call `get_takes`, but see approved takes only.
2. Signed-out users cannot call submission, voting, or moderation functions.
3. Guest and email-authenticated users can submit; the row is `pending` and absent from `get_takes`.
4. A second submission within ten minutes fails.
5. Voting twice changes one row rather than creating two; totals remain correct.
6. `get_takes` returns the current user's choice but no user IDs.
7. A non-moderator cannot call `moderate_take`.
8. A non-moderator cannot call `get_pending_takes` or see queue content.
9. A moderator can list, approve and reject pending takes from `/takes/admin/`.
10. A pending submission sends one approval email linking to the admin page; an approved seed insert sends none.
11. A webhook call with the wrong `x-webhook-secret` returns `401` and sends no email.

An automated production check on 2026-10-20 verified public reads, signed-out submission denial, guest submission, the ten-minute cooldown, vote replacement, guest moderation/queue denial, wrong-secret rejection, seed-row filtering, Resend idempotency and a real trigger response of HTTP 204. The labelled test data and temporary anonymous user were removed afterwards. Moderator Approve/Reject and visible inbox receipt still require Patrick's authenticated browser/email session.

As checked on 2026-10-19, the free plan includes two active projects, 500 MB database size, 5 GB uncached egress, and 50,000 monthly active users. This prototype should be far below those limits. Supabase can [pause a free project after low activity over seven days](https://supabase.com/docs/guides/platform/free-project-pausing), so treat it as a prototype rather than an availability promise. Recheck [current billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase) before inviting users to depend on it.
