// Single source of truth for the running build's version, embedded directly
// in the JS bundle (so it reflects whatever code actually loaded — not
// necessarily the latest deployed version, which is exactly what
// versionCheck.js compares it against). Keep this in lockstep with
// VERSION.md, CHANGELOG.md, and /version.json on every release — see
// "Releasing a new version" in docs/DEVELOPMENT.md.
export const APP_VERSION = '1.8.0';
