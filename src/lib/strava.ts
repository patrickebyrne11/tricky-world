import {
  STRAVA_ACCESS_TOKEN,
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_REFRESH_TOKEN,
} from 'astro:env/server';
import { z } from 'astro/zod';

const API_BASE = 'https://www.strava.com/api/v3';

const totalSchema = z.object({
  count: z.number(),
  distance: z.number(),
  moving_time: z.number(),
  elevation_gain: z.number(),
});

const statsSchema = z.object({
  recent_run_totals: totalSchema,
  ytd_run_totals: totalSchema,
  all_run_totals: totalSchema,
  recent_ride_totals: totalSchema,
  ytd_ride_totals: totalSchema,
  all_ride_totals: totalSchema,
  recent_swim_totals: totalSchema,
  ytd_swim_totals: totalSchema,
  all_swim_totals: totalSchema,
});

export type ActivityTotal = z.infer<typeof totalSchema>;

export interface SportStats {
  sport: 'Run' | 'Ride' | 'Swim';
  recent: ActivityTotal;
  yearToDate: ActivityTotal;
  allTime: ActivityTotal;
}

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} returned ${response.status}`);
  }
  return response.json();
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const body = await getJson('https://www.strava.com/oauth/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });
  return z.object({ access_token: z.string() }).parse(body).access_token;
}

/**
 * Fetch Strava totals at build time. Returns null rather than failing the build,
 * so a Strava outage or missing credentials never blocks a deploy.
 */
export async function getStravaStats(): Promise<SportStats[] | null> {
  let accessToken = STRAVA_ACCESS_TOKEN;

  if (!accessToken) {
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
      console.warn('[strava] Credentials not set; rendering without stats.');
      return null;
    }

    try {
      accessToken = await getAccessToken(STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN);
    } catch (error) {
      console.warn(`[strava] Token refresh failed; rendering without stats. ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    const athlete = z.object({ id: z.number() }).parse(await getJson(`${API_BASE}/athlete`, { headers }));
    const stats = statsSchema.parse(await getJson(`${API_BASE}/athletes/${athlete.id}/stats`, { headers }));

    const sports: SportStats[] = [
      { sport: 'Run', recent: stats.recent_run_totals, yearToDate: stats.ytd_run_totals, allTime: stats.all_run_totals },
      { sport: 'Ride', recent: stats.recent_ride_totals, yearToDate: stats.ytd_ride_totals, allTime: stats.all_ride_totals },
      { sport: 'Swim', recent: stats.recent_swim_totals, yearToDate: stats.ytd_swim_totals, allTime: stats.all_swim_totals },
    ];
    return sports.filter((sport) => sport.allTime.count > 0);
  } catch (error) {
    console.warn(`[strava] Fetch failed; rendering without stats. ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
