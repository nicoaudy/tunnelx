#!/bin/bash

# TLS certificate generation script for tunnel proxy
# Run on VPS with sudo

set -e

echo "Generating TLS certificates for tunnel proxy..."

# Load .env if exists
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
  echo "Installing Certbot..."
  sudo apt update
  sudo apt install -y certbot
fi

# Generate TLS certs with Certbot
if [ -z "$DOMAIN" ]; then
  echo "DOMAIN not set in .env. Please set it."
  exit 1
fi

echo "Generating wildcard certificate for *.$DOMAIN"
echo "Run the following command manually:"
echo "sudo certbot certonly --manual --preferred-challenges dns -d *.$DOMAIN --agree-tos --email your-email@example.com"
echo ""
echo "Follow the DNS TXT record instructions in your DNS provider (e.g., Cloudflare)."
echo "After adding the TXT record, press enter here to continue..."
read

# Copy certs to certs/
mkdir -p certs
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem certs/cert.pem
  sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem certs/key.pem
  sudo chown $USER:$USER certs/*
  echo "Certificates copied to certs/"
else
  echo "Certificates not found. Please run Certbot manually."
  exit 1
fi

echo "TLS certificates generated successfully!"