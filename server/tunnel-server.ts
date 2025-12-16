import { TunnelMessage, SubdomainMessage } from '../shared/types.ts';
import { config } from '../shared/config.ts';

const connections = new Map<string, WebSocket>();
const pendingRequests = new Map<string, { resolve: (response: Response) => void; reject: (error: Error) => void; method: string; path: string; start: number }>();

function generateSubdomain(): string {
  return Math.random().toString(36).substring(2, 8);
}

async function serializeRequest(req: Request): string {
  return JSON.stringify({
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
    body: req.body ? await req.text() : null,
  });
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

if (!config.isLocal) {
  serveOptions.tls = {
    cert: Bun.file('/certs/cert.pem'),
    key: Bun.file('/certs/key.pem'),
  };
}

Bun.serve({
  ...serveOptions,
  fetch: async (req) => {
    const start = Date.now();
    if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') return;
    if (config.isLocal) {
      // For local, proxy directly to local port
      const url = new URL(req.url);
      url.host = `localhost:${config.localPort}`;
      const localReq = new Request(url.toString(), req);
      try {
        const response = await fetch(localReq);
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${new URL(req.url).pathname} -> ${response.status} (${duration}ms)`);
        return response;
      } catch (error) {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${new URL(req.url).pathname} -> 502 (${duration}ms) ERROR: ${error.message || error}`);
        return new Response('Local server not available', { status: 502 });
      }
    }
    const url = new URL(req.url);
    const subdomain = url.hostname.split('.')[0];
    const ws = connections.get(subdomain);
    if (!ws) return new Response('Tunnel not found', { status: 404 });

    const id = crypto.randomUUID();
    const msg: TunnelMessage = { type: 'request', id, data: await serializeRequest(req) };
    ws.send(JSON.stringify(msg));

    return new Promise((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject, method: req.method, path: new URL(req.url).pathname, start: Date.now() });
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
        const tunnelUrl = `${protocol}://${subdomain}.${config.domain}`;
        console.log(`Tunnel created: ${tunnelUrl}`);
      },
      message(ws, message) {
        const msg: TunnelMessage = JSON.parse(message);
        if (msg.type === 'response') {
          const pending = pendingRequests.get(msg.id);
          if (pending) {
            pendingRequests.delete(msg.id);
            const response = deserializeResponse(msg.data);
            const duration = Date.now() - pending.start;
            console.log(`[${new Date().toISOString()}] ${pending.method} ${pending.path} -> ${response.status} (${duration}ms)`);
            pending.resolve(response);
          }
        }
      },
      close(ws) {
        for (const [subdomain, conn] of connections) {
          if (conn === ws) {
            connections.delete(subdomain);
            console.log(`Tunnel closed: ${subdomain}`);
            break;
          }
        }
      },
    },
  }),
});

const protocol = config.isLocal ? 'http' : 'https';
console.log(`Server running on ${protocol}://*.${config.domain}:${serveOptions.port}`);
