const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix a site-relative path with the deploy base path (e.g. "/tricky-world"). */
export function url(path: string): string {
  return `${base}/${path.replace(/^\//, '')}`;
}
