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
2. Copy `.env.example` to `.env` and configure (DOMAIN defaults to tunnel.yourdomain.com).
3. Run `./setup-production.sh` to generate TLS certs.
4. Run `docker-compose up -d` to deploy server.
5. Publish package to npm for `bunx tunnel <port>`.
6. Users: Run `bunx tunnel login` to authenticate, then `bunx tunnel <port>` (no env setup needed).

## Authentication
- Run `bun run register` to create a new account (uses /tunnel-register paths).
- Run `bun run login` to authenticate for premium tunnels (uses /tunnel-login paths, 1 hour vs 15 minutes).
- Run `bun run logout` to logout.
- Timeout settings: Set `FREE_TIMEOUT_MINUTES` (default 15) and `PREMIUM_TIMEOUT_MINUTES` (default 60) env vars.

## TLS Certificates
- **Testing**: Run `./generate-certs.sh` for self-signed certs.
- **Production**: Run `./setup-production.sh` to generate wildcard certs with Certbot.

## Testing
- **Local**: Copy `.env.local` to `.env`, run server: `bun run server/index.ts`, client: `bun run tunnel 3001`. Run test server: `bun run test-server`. Access http://localhost:8080.
- **Production**: Set DOMAIN to your domain, SERVER_URL to wss://your-server, run `docker-compose up -d`.

## Requirements
- Bun
- Docker & Docker Compose (for deployment)