// Central error handling: every catch block in the app should funnel here
// instead of calling alert(). Renders a consistent toast and keeps a small
// in-memory log the System Health screen can surface.
const errorLog = [];
let toastFn = null;

export function registerToastRenderer(fn) {
  toastFn = fn;
}

export function reportError(error, context = '') {
  const message = error && error.message ? error.message : String(error);
  errorLog.unshift({ message, context, at: new Date().toISOString() });
  if (errorLog.length > 200) errorLog.pop();
  console.error(`[DiellyOS${context ? '/' + context : ''}]`, error);
  if (toastFn) toastFn({ type: 'error', message: context ? `${context}: ${message}` : message });
  return message;
}

export function reportInfo(message) {
  if (toastFn) toastFn({ type: 'info', message });
}

export function reportSuccess(message) {
  if (toastFn) toastFn({ type: 'success', message });
}

export function reportWarning(message) {
  if (toastFn) toastFn({ type: 'warning', message });
}

export function getErrorLog() {
  return errorLog;
}

export function installGlobalHandlers() {
  window.addEventListener('error', (e) => reportError(e.error || e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
}
