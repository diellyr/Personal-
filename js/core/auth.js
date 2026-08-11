import { userRepository } from './entities/userRepository.js';
import { setCurrentUser, getCurrentUser, getStoredSessionUserId } from './session.js';
import { auditLogRepository } from './entities/auditLogRepository.js';
import { nowIso, uuid } from './uuid.js';

// Local password hashing via Web Crypto PBKDF2-SHA256. This is NOT a
// substitute for a real backend authenticator (see docs/SECURITY.md) — it
// exists only so no password is ever stored in plain text in IndexedDB,
// even for this local-first phase. It will be replaced wholesale by
// Supabase Auth (see docs/MIGRATION_TO_SUPABASE.md).
async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.substr(i * 2, 2), 16);
  return arr;
}

export async function createUser({ username, email, password, displayName, role }) {
  const { hash, salt } = await hashPassword(password);
  return userRepository.create({
    id: uuid(),
    username: username.toLowerCase(),
    email,
    displayName,
    role,
    status: 'ACTIVE',
    passwordHash: hash,
    passwordSalt: salt,
    lastAccessAt: null,
  });
}

export async function login(username, password) {
  const user = await userRepository.findByUsername(username.toLowerCase());
  if (!user || user.status !== 'ACTIVE' || user.deleted_at) {
    await auditLogRepository.append({ userId: null, action: 'LOGIN', module: 'auth', details: `Failed login for "${username}"` });
    throw new Error('Usuário ou senha inválidos.');
  }
  const { hash } = await hashPassword(password, user.passwordSalt);
  if (hash !== user.passwordHash) {
    await auditLogRepository.append({ userId: user.id, action: 'LOGIN', module: 'auth', details: 'Failed login (bad password)' });
    throw new Error('Usuário ou senha inválidos.');
  }
  const updated = await userRepository.update(user.id, { lastAccessAt: nowIso() });
  setCurrentUser(updated);
  await auditLogRepository.append({ userId: user.id, action: 'LOGIN', module: 'auth', details: 'Login successful' });
  return updated;
}

export async function logout() {
  const user = getCurrentUser();
  if (user) {
    await auditLogRepository.append({ userId: user.id, action: 'LOGOUT', module: 'auth', details: 'Logout' });
  }
  setCurrentUser(null);
}

export async function restoreSession() {
  const id = getStoredSessionUserId();
  if (!id) return null;
  const user = await userRepository.getById(id);
  if (!user || user.status !== 'ACTIVE') return null;
  setCurrentUser(user);
  return user;
}

export async function changePassword(userId, newPassword) {
  const { hash, salt } = await hashPassword(newPassword);
  return userRepository.update(userId, { passwordHash: hash, passwordSalt: salt });
}

export { hashPassword };
