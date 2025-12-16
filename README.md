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
bun run tunnel 3000
```

## Setup
1. Clone repo on VPS.
2. Copy `.env.example` to `.env` and configure (set DOMAIN, etc.).
3. Run `./setup-production.sh` to generate TLS certs.
4. Run `docker-compose up -d` to deploy server.
5. For client: Install Bun locally, run `bun run tunnel <port>`.

## TLS Certificates
- **Testing**: Run `./generate-certs.sh` for self-signed certs.
- **Production**: Run `./setup-production.sh` to generate wildcard certs with Certbot.

## Testing
- **Local**: Copy `.env.local` to `.env`, run server: `bun run server/index.ts`, client: `bun run tunnel 3001`. Run test server: `bun run test-server`. Access http://localhost:8080.
- **Production**: Set DOMAIN to your domain, SERVER_URL to wss://your-server, run `docker-compose up -d`.

## Requirements
- Bun
- Docker & Docker Compose (for deployment)