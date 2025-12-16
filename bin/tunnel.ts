import { config } from '../shared/config.ts';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

const args = Bun.argv.slice(2);
if (args[0] === 'register') {
  // Register flow
  const serverUrl = config.serverUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  const res = await fetch(`${serverUrl}/tunnel-register`);
  const { code, auth_url } = await res.json();
  console.log(`Visit this URL to register: ${auth_url}`);
  console.log(`Code: ${code}`);
  const authPath = `${Bun.env.HOME || '/tmp'}/.tunnel/auth.json`;
  await mkdir(dirname(authPath), { recursive: true });
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${serverUrl}/tunnel-auth/status?code=${code}`);
    const { status, token } = await statusRes.json();
    if (status === 'completed') {
      await Bun.write(authPath, JSON.stringify({ token }));
      console.log('Registration and login successful!');
      break;
    }
  }
} else if (args[0] === 'login') {
  // Login flow
  const serverUrl = config.serverUrl.replace('wss://', 'https://').replace('ws://', 'http://');
  const res = await fetch(`${serverUrl}/tunnel-login`);
  const { code, auth_url } = await res.json();
  console.log(`Visit this URL to login: ${auth_url}`);
  console.log(`Code: ${code}`);
  const authPath = `${Bun.env.HOME || '/tmp'}/.tunnel/auth.json`;
  await mkdir(dirname(authPath), { recursive: true });
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${serverUrl}/tunnel-auth/status?code=${code}`);
    const { status, token } = await statusRes.json();
    if (status === 'completed') {
      await Bun.write(authPath, JSON.stringify({ token }));
      console.log('Login successful!');
      break;
    }
  }
} else if (args[0] === 'logout') {
  // Logout
  const authPath = `${Bun.env.HOME || '/tmp'}/.tunnel/auth.json`;
  try {
    await Bun.file(authPath).delete();
    console.log('Logged out successfully.');
  } catch {
    console.log('Not logged in.');
  }
} else {
  // Check login status
  const authPath = `${Bun.env.HOME || '/tmp'}/.tunnel/auth.json`;
  let authToken: string | null = null;
  try {
    const authData = JSON.parse(await Bun.file(authPath).text());
    authToken = authData.token;
  } catch {}
  if (authToken) {
    console.log('Logged in with premium access (1 hour tunnels). To logout: bun run logout');
  } else {
    console.log('Not logged in. Run "bun run login" for premium features.');
  }

  if (config.isLocal) {
    // Local mode: Run server to proxy directly
    await import('../server/main.ts');
  } else {
    // Production mode: Run client to connect to remote server
    await import('../client/tunnel-agent.ts');
  }
}