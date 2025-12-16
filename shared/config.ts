export const config = {
  domain: Bun.env.DOMAIN || 'localhost',
  serverPort: parseInt(Bun.env.SERVER_PORT || '443'),
  localPort: parseInt(Bun.argv[2] || '3001'),
  serverUrl: Bun.env.SERVER_URL || (Bun.env.LOCAL === 'true' ? 'ws://localhost:8080' : 'wss://tunnel.yourdomain.com'),
  isLocal: Bun.env.LOCAL === 'true',
};