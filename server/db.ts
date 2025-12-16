import { Database } from 'bun:sqlite';
import { User, AuthCode, Session } from '../shared/types.ts';

export const db = new Database('data/tunnel.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password_hash TEXT,
  salt TEXT,
  is_subscriber INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS auth_codes (
  code TEXT PRIMARY KEY,
  user_id INTEGER,
  expires_at INTEGER,
  used INTEGER DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  expires_at INTEGER
)`);

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,
    hash: 'SHA-256',
  }, key, 256);
  const hash = btoa(String.fromCharCode(...new Uint8Array(derived)));
  const saltStr = btoa(String.fromCharCode(...salt));
  return { hash, salt: saltStr };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const saltBytes = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    salt: saltBytes,
    iterations: 100000,
    hash: 'SHA-256',
  }, key, 256);
  const derivedHash = btoa(String.fromCharCode(...new Uint8Array(derived)));
  return derivedHash === hash;
}

export function createAuthCode(code: string, expiresAt: number) {
  db.run('INSERT INTO auth_codes (code, expires_at) VALUES (?, ?)', [code, expiresAt]);
}

export function updateAuthCode(code: string, userId: number) {
  db.run('UPDATE auth_codes SET user_id = ?, used = 1 WHERE code = ?', [userId, code]);
}

export function getAuthCode(code: string): AuthCode | null {
  return db.query('SELECT * FROM auth_codes WHERE code = ?').get(code) as AuthCode | null;
}

export function createSession(token: string, userId: number, expiresAt: number) {
  db.run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [token, userId, expiresAt]);
}

export function getSession(token: string): Session | null {
  return db.query('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').get(token, Date.now()) as Session | null;
}

export function getLatestSession(userId: number): Session | null {
  return db.query('SELECT * FROM sessions WHERE user_id = ? ORDER BY expires_at DESC LIMIT 1').get(userId) as Session | null;
}

export function getUser(email: string): User | null {
  return db.query('SELECT * FROM users WHERE email = ?').get(email) as User | null;
}

export async function createUser(email: string, password: string): Promise<User | null> {
  const existing = getUser(email);
  if (existing) return null;
  const { hash, salt } = await hashPassword(password);
  db.run('INSERT INTO users (email, password_hash, salt) VALUES (?, ?, ?)', [email, hash, salt]);
  return getUser(email);
}