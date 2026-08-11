import { APP_VERSION } from './version.js';

// Detects when the JS currently running in the browser is older than what's
// actually deployed — the classic "stale cached copy of a static site"
// problem this app is exposed to (no build step, no cache-busted asset
// URLs, so a browser or CDN can keep serving an old bundle after a new
// version ships). `cache: 'no-store'` forces a real network round-trip for
// this one small file regardless of HTTP caching headers, so the comparison
// itself is always against the truly latest deployed version.json.
export async function fetchLatestVersion() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version || null;
  } catch {
    return null; // offline, or version.json not deployed yet — fail silent
  }
}

export async function checkForStaleVersion() {
  const latest = await fetchLatestVersion();
  if (!latest || latest === APP_VERSION) return null;
  return { running: APP_VERSION, latest };
}

export function forceReload() {
  // Appending a cache-busting query to the top-level navigation (not just
  // calling location.reload()) makes the browser treat this as a distinct
  // URL, which in practice gets a fresh document fetch far more reliably
  // than a plain reload against a cached SPA shell.
  const url = new URL(location.href);
  url.searchParams.set('_v', Date.now().toString());
  location.href = url.toString();
}
