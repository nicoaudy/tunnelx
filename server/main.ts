import { TunnelMessage, SubdomainMessage } from '../shared/types.ts';
import { config } from '../shared/config.ts';
import { db, getSession } from './db.ts';
import { handleAuth } from './auth.ts';

const protocol = config.isLocal ? 'http' : 'https';
const serverUrl = config.isLocal ? config.serverUrl.replace('wss', 'ws') : config.serverUrl;

const connections = new Map<string, WebSocket>();
const connectionUsers = new Map<string, number>();
const pendingRequests = new Map<string, { resolve: (response: Response) => void; reject: (error: Error) => void; method: string; path: string; start: number }>();
const serverStartTime = Date.now();

function generateSubdomain(): string {
  return Math.random().toString(36).substring(2, 12);
}

function deserializeRequest(data: string): Request {
  const parsed = JSON.parse(data);
  return new Request(parsed.url, {
    method: parsed.method,
    headers: parsed.headers,
    body: parsed.body,
  });
}

async function serializeResponse(res: Response): Promise<string> {
  const body = res.body ? await res.arrayBuffer() : null;
  return JSON.stringify({
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers),
    body: body ? Array.from(new Uint8Array(body)) : null,
  });
}

function deserializeResponse(data: string): Response {
  const parsed = JSON.parse(data);
  const body = parsed.body ? new Uint8Array(parsed.body) : null;
  return new Response(body, {
    status: parsed.status,
    statusText: parsed.statusText,
    headers: parsed.headers,
  });
}

const serveOptions: any = {
  port: config.isLocal ? 8080 : config.serverPort,
};

if (config.useTls) {
  serveOptions.tls = {
    cert: Bun.file('/certs/cert.pem'),
    key: Bun.file('/certs/key.pem'),
  };
}

Bun.serve({
  ...serveOptions,
  fetch: async (req) => {
    const authResponse = await handleAuth(req);
    if (authResponse) return authResponse;

    const url = new URL(req.url);
    const start = Date.now();
    if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') return;
    if (config.isLocal) {
      // For local, proxy directly to local port
      const elapsed = Date.now() - serverStartTime;
      if (elapsed > config.freeTimeoutMinutes * 60 * 1000) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${url.pathname} -> EXPIRED (${elapsed}ms elapsed)`);
        return new Response('<h1>Tunnel Expired</h1><p>The tunnel session has ended.</p>', { headers: { 'Content-Type': 'text/html' } });
      }
      const localUrl = new URL(req.url);
      localUrl.host = `localhost:${config.localPort}`;
      const localReq = new Request(localUrl.toString(), req);
      try {
        const response = await fetch(localReq);
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${localUrl.pathname} -> ${response.status} (${duration}ms)`);
        return response;
      } catch (error) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${localUrl.pathname} -> 502 (${duration}ms) ERROR: ${error.message || error}`);
        return new Response('Local server not available', { status: 502 });
      }
    }
    const subdomain = url.hostname.split('.')[0];
    const ws = connections.get(subdomain);
    if (!ws) return new Response('<h1>Tunnel Expired or Not Found</h1><p>The tunnel session has ended.</p>', { status: 404, headers: { 'Content-Type': 'text/html' } });

    const id = crypto.randomUUID();
    const msg: TunnelMessage = { type: 'request', id, data: await serializeRequest(req) };
    ws.send(JSON.stringify(msg));

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject, method: req.method, path: url.pathname, start: Date.now() });
      setTimeout(() => reject(new Error('Timeout')), 30000);
    });
  },
  ...(config.isLocal ? {} : {
    websocket: {
      open(ws) {
        console.log('WebSocket connection opened');
        const subdomain = generateSubdomain();
        connections.set(subdomain, ws);
        const msg: SubdomainMessage = { subdomain };
        ws.send(JSON.stringify(msg));
        // Check if authenticated (set after auth message)
        setTimeout(() => {
          const userId = connectionUsers.get(subdomain);
          const isPremium = !!userId;
          const timeoutMinutes = isPremium ? config.premiumTimeoutMinutes : config.freeTimeoutMinutes;
          const timeoutMs = timeoutMinutes * 60 * 1000;
          const tier = isPremium ? 'premium' : 'free';
          console.log(`Tunnel created: ${protocol}://${subdomain}.${config.domain} (${tier} tier: ${timeoutMinutes} minutes)`);
          setTimeout(() => {
            console.log(`Closing tunnel ${subdomain} after ${timeoutMinutes} minutes (${tier} tier limit)`);
            ws.close(1000, `${tier} tier time limit reached`);
          }, timeoutMs);
        }, 1000); // Delay to allow auth message
      },
      message(ws, message) {
        const msg = JSON.parse(message);
        if (msg.type === 'response') {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            pendingRequests.delete(msg.id);
            const response = deserializeResponse(msg.data);
            const duration = Date.now() - pending.start;
            console.log(`[${new Date().toISOString()}] ${pending.method} ${pending.path} -> ${response.status} (${duration}ms)`);
            pending.resolve(response);
          }
        } else if (msg.type === 'auth') {
          let subdomain: string | undefined;
          for (const [sub, conn] of connections) {
            if (conn === ws) {
              subdomain = sub;
              break;
            }
          }
          if (subdomain) {
            const session = getSession(msg.token);
            if (session) {
              connectionUsers.set(subdomain, session.user_id);
            }
          }
        }
      },
      close(ws) {
        for (const [subdomain, conn] of connections) {
          if (conn === ws) {
            connections.delete(subdomain);
            connectionUsers.delete(subdomain);
            console.log(`Tunnel closed: ${subdomain}`);
            break;
          }
        }
      },
    },
  }),
});

console.log(`Server running on ${protocol}://*.${config.domain}:${serveOptions.port}`);