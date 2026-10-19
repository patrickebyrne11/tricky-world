// @ts-check
import { defineConfig, envField } from 'astro/config';

const stravaSecret = () => envField.string({ context: 'server', access: 'secret', optional: true });

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site: served from https://<user>.github.io/tricky-world/
  site: 'https://patrickebyrne11.github.io',
  base: '/tricky-world',
  // Fail the build on duplicate content ids (e.g. the same book added twice).
  prerenderConflictBehavior: 'error',
  // Optional so local builds and forks work without Strava credentials.
  env: {
    schema: {
      STRAVA_CLIENT_ID: stravaSecret(),
      STRAVA_CLIENT_SECRET: stravaSecret(),
      STRAVA_REFRESH_TOKEN: stravaSecret(),
      STRAVA_ACCESS_TOKEN: stravaSecret(),
    },
  },
});
