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

`db push` applies `supabase/migrations/202610190001_create_hot_takes.sql`. Do not paste a service-role key into this repository or into a `PUBLIC_` variable.

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
  - `https://patrickebyrne11.github.io/tricky-world/takes/`

Email passwordless sign-in is enabled by default. The page calls `signInWithOtp`, and Supabase redirects the user back to `/takes/` after they click the email link.

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

Sign out and back in so the refreshed JWT contains the role. Moderation can be done in Table Editor by changing a take from `pending` to `approved` or `rejected` and setting `moderated_at` in the same edit, or with the SQL editor:

```sql
update public.takes
set status = 'approved', moderated_at = now()
where id = '<take-id>';
```

The `moderate_take` RPC is intended for a future admin UI: it authorizes the protected `app_metadata.role` claim. Supabase Studio uses an administrative database connection and is not constrained by browser RLS policies.

## 5. Enable approval notification emails

Notifications follow an event-driven path:

```text
pending take inserted → async database webhook → Edge Function → Resend → moderator inbox
```

The webhook is asynchronous, so an email-provider outage does not roll back a valid take submission. Failed calls remain visible in Supabase's Edge Function logs and the database webhook history.

1. Create a free [Resend](https://resend.com/) account and API key. For initial testing, `onboarding@resend.dev` can send to the address associated with your Resend account. Verify a sender domain before sending to other recipients or from a Tricky World address.
2. Copy the function environment template, fill it locally, and generate an independent webhook secret:

   ```sh
   cp supabase/functions/.env.example supabase/functions/.env
   openssl rand -hex 32
   ```

3. Save the values as Supabase Edge Function secrets and deploy the function without gateway JWT verification. The function authenticates the database webhook using `HOT_TAKES_WEBHOOK_SECRET` instead.

   ```sh
   npx supabase secrets set --env-file supabase/functions/.env
   npx supabase functions deploy notify-pending-take --no-verify-jwt
   ```

4. In Supabase **Database → Webhooks**, create `notify-pending-take`:

   - Table: `public.takes`
   - Event: `INSERT`
   - Method: `POST`
   - URL: `https://<project-ref>.supabase.co/functions/v1/notify-pending-take`
   - HTTP header: `x-webhook-secret: <the same HOT_TAKES_WEBHOOK_SECRET>`

The function validates the secret and payload, ignores approved seed rows, escapes user content in HTML, and uses the take UUID as Resend's idempotency key so a repeated webhook cannot create duplicate email. Resend's current free plan allows 3,000 messages per month and 100 per day—well above the submission cooldown's theoretical maximum.

## 6. Verify the security boundary

Before sharing the board publicly, verify all of these with the publishable key or the browser:

1. Signed-out users can call `get_takes`, but see approved takes only.
2. Signed-out users cannot call submission, voting, or moderation functions.
3. Signed-in users can submit; the row is `pending` and absent from `get_takes`.
4. A second submission within ten minutes fails.
5. Voting twice changes one row rather than creating two; totals remain correct.
6. `get_takes` returns the current user's choice but no user IDs.
7. A non-moderator cannot call `moderate_take`.
8. A pending submission sends one approval email; an approved seed insert sends none.
9. A webhook call with the wrong `x-webhook-secret` returns `401` and sends no email.

As checked on 2026-10-19, the free plan includes two active projects, 500 MB database size, 5 GB uncached egress, and 50,000 monthly active users. This prototype should be far below those limits. Supabase can [pause a free project after low activity over seven days](https://supabase.com/docs/guides/platform/free-project-pausing), so treat it as a prototype rather than an availability promise. Recheck [current billing quotas](https://supabase.com/docs/guides/platform/billing-on-supabase) before inviting users to depend on it.
