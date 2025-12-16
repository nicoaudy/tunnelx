import { config } from '../shared/config.ts';
import { createAuthCode, updateAuthCode, getAuthCode, createSession, getLatestSession, getUser, verifyPassword, createUser } from './db.ts';

const protocol = config.isLocal ? 'http' : 'https';

export async function handleAuth(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (url.pathname === '/tunnel-login' && req.method === 'GET') {
    const code = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    createAuthCode(code, expiresAt);
    const port = config.isLocal ? 8080 : config.serverPort;
      const defaultPort = protocol === 'https' ? 443 : 80;
    const portStr = config.externalPort !== defaultPort ? `:${config.externalPort}` : '';
    const authUrl = `${protocol}://${config.domain}${portStr}/tunnel-auth?code=${code}`;
    return new Response(JSON.stringify({ code, auth_url: authUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (url.pathname === '/tunnel-register' && req.method === 'GET') {
    const code = crypto.randomUUID();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    createAuthCode(code, expiresAt);
    const port = config.isLocal ? 8080 : config.serverPort;
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Register</title></head>
      <body>
        <h1>Register for Tunnel</h1>
        <form method="POST" action="/tunnel-register">
          <input type="hidden" name="code" value="${code}">
          <label>Email: <input type="email" name="email" required></label><br>
          <label>Password: <input type="password" name="password" required></label><br>
          <label>Confirm Password: <input type="password" name="confirm_password" required></label><br>
          <button type="submit">Register</button>
        </form>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
  if (url.pathname === '/tunnel-register' && req.method === 'POST') {
    const form = await req.formData();
    const code = form.get('code') as string;
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    const confirmPassword = form.get('confirm_password') as string;
    if (!code || !email || !password || password !== confirmPassword) return new Response('Invalid input', { status: 400 });
    const user = await createUser(email, password);
    if (!user) return new Response('User already exists', { status: 409 });
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    updateAuthCode(code, user.id);
    createSession(token, user.id, expiresAt);
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Success</title></head>
      <body>
        <h1>Registration Successful!</h1>
        <p>You can close this window and return to the CLI.</p>
      </body>
      </html>
    `;
    return new Response(successHtml, { headers: { 'Content-Type': 'text/html' } });
  }
  if (url.pathname === '/tunnel-auth' && req.method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) return new Response('Invalid code', { status: 400 });
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Login</title></head>
      <body>
        <h1>Login to Tunnel</h1>
        <form method="POST" action="/tunnel-auth">
          <input type="hidden" name="code" value="${code}">
          <label>Email: <input type="email" name="email" required></label><br>
          <label>Password: <input type="password" name="password" required></label><br>
          <button type="submit">Login</button>
        </form>
      </body>
      </html>
    `;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }
  if (url.pathname === '/tunnel-auth' && req.method === 'POST') {
    const form = await req.formData();
    const code = form.get('code') as string;
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    if (!code || !email || !password) return new Response('Missing fields', { status: 400 });
    const user = getUser(email);
    if (!user || !(await verifyPassword(password, user.password_hash, user.salt))) {
      return new Response('Invalid credentials', { status: 401 });
    }
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    updateAuthCode(code, user.id);
    createSession(token, user.id, expiresAt);
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Success</title></head>
      <body>
        <h1>Login Successful!</h1>
        <p>You can close this window and return to the CLI.</p>
      </body>
      </html>
    `;
    return new Response(successHtml, { headers: { 'Content-Type': 'text/html' } });
  }
  if (url.pathname === '/tunnel-auth/status' && req.method === 'GET') {
    const code = url.searchParams.get('code');
    if (!code) return new Response(JSON.stringify({ status: 'error' }), { headers: { 'Content-Type': 'application/json' } });
    const authCode = getAuthCode(code);
    if (!authCode || authCode.used === 0 || Date.now() > authCode.expires_at) {
      return new Response(JSON.stringify({ status: 'pending' }), { headers: { 'Content-Type': 'application/json' } });
    }
    const session = getLatestSession(authCode.user_id);
    if (session) {
      return new Response(JSON.stringify({ status: 'completed', token: session.token }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ status: 'error' }), { headers: { 'Content-Type': 'application/json' } });
  }
  return null;
}