import { TunnelMessage, SubdomainMessage } from '../shared/types.ts';
import { config } from '../shared/config.ts';

const protocol = config.isLocal ? 'http' : 'https';
const serverUrl = config.isLocal ? config.serverUrl.replace('wss', 'ws') : config.serverUrl;

if (config.isLocal) {
  const tunnelUrl = `${protocol}://${config.domain}:${config.serverPort}`;
  console.log(`Local tunnel URL: ${tunnelUrl}`);
  console.log('Access the URL to proxy to localhost:' + config.localPort);
  // Keep the process alive
  setInterval(() => {}, 1000);
} else {
  console.log(`Connecting to ${serverUrl}`);
  const ws = new WebSocket(serverUrl);

  ws.onopen = () => {
    console.log('Connected to tunnel server');
  };

  ws.onmessage = async (event) => {
    console.log('Received message:', event.data);
    const data = JSON.parse(event.data);
    if ('subdomain' in data) {
      const msg: SubdomainMessage = data;
      const tunnelUrl = `${protocol}://${msg.subdomain}.${config.domain}`;
      console.log(`Tunnel URL: ${tunnelUrl}`);
    } else {
      const msg: TunnelMessage = data;
      if (msg.type === 'request') {
      try {
        const req = deserializeRequest(msg.data);
        console.log(`Forwarding request: ${req.method} ${req.url}`);
        const url = new URL(req.url);
          url.host = `localhost:${config.localPort}`;
          const localReq = new Request(url.toString(), req);
          const response = await fetch(localReq);
        const responseMsg: TunnelMessage = { type: 'response', id: msg.id, data: await serializeResponse(response) };
        console.log(`Response sent: ${response.status}`);
        ws.send(JSON.stringify(responseMsg));
        } catch (error) {
          console.error('Error forwarding request:', error);
        }
      }
    }
  };

  ws.onerror = (error) => {
    console.log('WebSocket error:', error);
  };

ws.onclose = (event) => {
  console.log(`Disconnected from tunnel server: ${event.code} ${event.reason}`);
  process.exit(1);
};

// Keep the process alive
setInterval(() => {}, 1000);
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