// Directory the app is served from ('/darnalux/' on GitHub Pages project
// sites, '/' on a custom domain or Vercel). Vite builds with a relative base,
// so it is derived from this bundle's own URL (bundles live in "<root>/assets/").
export const APP_ROOT: string = import.meta.env.DEV ? '/' : new URL('../', import.meta.url).pathname;

export const ROUTER_BASENAME = APP_ROOT.replace(/\/+$/, '') || '/';

export function appUrl(path: string): string {
  return `${window.location.origin}${APP_ROOT}${path.replace(/^\/+/, '')}`;
}
