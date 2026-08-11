// Tiny pub/sub session store. Holds the currently authenticated user in
// memory + sessionStorage (survives reload, cleared when the tab/browser
// session ends — a real "session", not a persisted credential).
const SESSION_KEY = 'dielly_os_session_user_id';
let currentUser = null;
const listeners = new Set();

export function setCurrentUser(user) {
  currentUser = user;
  if (user) {
    sessionStorage.setItem(SESSION_KEY, user.id);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
  listeners.forEach((fn) => fn(currentUser));
}

export function getCurrentUser() {
  return currentUser;
}

export function getStoredSessionUserId() {
  return sessionStorage.getItem(SESSION_KEY);
}

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
