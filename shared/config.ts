export const config = {
  domain: Bun.env.DOMAIN || (Bun.env.LOCAL === 'true' ? 'localhost' : 'tunnel.yourdomain.com'),
  serverPort: parseInt(Bun.env.SERVER_PORT || (Bun.env.LOCAL === 'true' ? '8080' : '443')),
  localPort: parseInt(Bun.argv[2] || '3001'),
  serverUrl: Bun.env.SERVER_URL || (Bun.env.LOCAL === 'true' ? 'ws://localhost:8080' : 'wss://tunnel.yourdomain.com'),
  isLocal: Bun.env.LOCAL === 'true',
  freeTimeoutMinutes: parseInt(Bun.env.FREE_TIMEOUT_MINUTES || '15'),
  premiumTimeoutMinutes: parseInt(Bun.env.PREMIUM_TIMEOUT_MINUTES || '60'),
};