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
### Manual VPS Deployment
1. Clone repo on VPS.
2. Set up Nginx Proxy Manager on port 443 forwarding to internal port (e.g., 1001).
3. Copy `.env.example` to `.env`: set DOMAIN=tunnel.yourdomain.com, SERVER_PORT=1001, EXTERNAL_PORT=443, USE_TLS=false.
4. Skip `./setup-production.sh` (proxy handles TLS).
5. Run `docker-compose up -d` to deploy server on internal port.
6. Publish package to npm for `bunx tunnel <port>`.
7. Users: Run `bunx tunnel login` to authenticate, then `bunx tunnel <port>` (connects to your domain).

### Coolify Deployment
1. Connect your Git repo to Coolify.
2. Create a new service from the repo (Docker Compose).
3. Set environment variables in Coolify: DOMAIN=tunnel.afk.my.id, SERVER_PORT=443, EXTERNAL_PORT=443, USE_TLS=true (or false if using Coolify's proxy), FREE_TIMEOUT_MINUTES=15, PREMIUM_TIMEOUT_MINUTES=60.
4. Configure domains: Add tunnel.afk.my.id and *.tunnel.afk.my.id to point to your Coolify instance.
5. Deploy – Coolify builds the Docker image and runs it.
6. For TLS: Use Coolify's built-in certs or set USE_TLS=false and handle via Coolify's proxy.
7. Publish client package to npm for users.

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