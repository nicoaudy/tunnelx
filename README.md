# Tunnel Proxy

A ngrok-like tunnel proxy app built with plain Bun. Expose local servers to the internet securely via TLS.

## Features
- HTTP tunneling with random subdomains
- TLS encryption for safe tunnels
- WebSocket-based forwarding
- Docker deployment for VPS

## Usage

### Server (VPS)
Deploy with Docker Compose.

### Client (Local)
```bash
bun run register  # Register new account
bun run login     # Authenticate for premium features
bun run tunnel 3000  # Start tunnel (premium if logged in)
bun run logout    # Logout
```

## Setup
1. Clone repo on VPS.
2. Set up Nginx Proxy Manager on port 443 forwarding to internal port (e.g., 1001).
3. Copy `.env.example` to `.env`: set DOMAIN=tunnel.yourdomain.com, SERVER_PORT=1001, EXTERNAL_PORT=443, USE_TLS=false.
4. Skip `./setup-production.sh` (proxy handles TLS).
5. Run `docker-compose up -d` to deploy server on internal port.
6. Publish package to npm for `bunx tunnel <port>`.
7. Users: Run `bunx tunnel login` to authenticate, then `bunx tunnel <port>` (connects to your domain).

## Authentication
- Run `bun run register` to create a new account (uses /tunnel-register paths).
- Run `bun run login` to authenticate for premium tunnels (uses /tunnel-login paths, 1 hour vs 15 minutes).
- Run `bun run logout` to logout.
- Timeout settings: Set `FREE_TIMEOUT_MINUTES` (default 15) and `PREMIUM_TIMEOUT_MINUTES` (default 60) env vars.

## TLS Certificates
- **Testing**: Run `./generate-certs.sh` for self-signed certs.
- **Production Direct**: Run `./setup-production.sh` for wildcard certs (set USE_TLS=true).
- **Behind Proxy**: Skip cert setup (proxy handles TLS, set USE_TLS=false).

## Testing
- **Local**: Copy `.env.local` to `.env`, run server: `bun run server/index.ts`, client: `bun run tunnel 3001`. Run test server: `bun run test-server`. Access http://localhost:8080.
- **Production**: Set DOMAIN to your domain, SERVER_URL to wss://your-server, run `docker-compose up -d`.

## Requirements
- Bun
- Docker & Docker Compose (for deployment)