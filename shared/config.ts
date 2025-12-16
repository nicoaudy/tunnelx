const isLocal = Bun.env.LOCAL === 'true';
const domain = Bun.env.DOMAIN || (isLocal ? 'localhost' : 'tunnel.yourdomain.com');

export const config = {
  domain,
  serverPort: parseInt(Bun.env.SERVER_PORT || (isLocal ? '8080' : '443')),
  externalPort: parseInt(Bun.env.EXTERNAL_PORT || '443'),
  localPort: parseInt(Bun.argv[2] || '3001'),
  serverUrl: Bun.env.SERVER_URL || (isLocal ? 'ws://localhost:8080' : `wss://${domain}`),
  isLocal,
  useTls: Bun.env.USE_TLS !== 'false', // Default true for production
  freeTimeoutMinutes: parseInt(Bun.env.FREE_TIMEOUT_MINUTES || '15'),
  premiumTimeoutMinutes: parseInt(Bun.env.PREMIUM_TIMEOUT_MINUTES || '60'),
};