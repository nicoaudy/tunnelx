import { config } from '../shared/config.ts';

if (config.isLocal) {
  // Local mode: Run server to proxy directly
  await import('../server/tunnel-server.ts');
} else {
  // Production mode: Run client to connect to remote server
  await import('../client/tunnel-agent.ts');
}