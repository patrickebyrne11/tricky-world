// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site: served from https://<user>.github.io/tricky-world/
  site: 'https://patrickebyrne11.github.io',
  base: '/tricky-world',
  // Fail the build on duplicate content ids (e.g. the same book added twice).
  prerenderConflictBehavior: 'error',
});
