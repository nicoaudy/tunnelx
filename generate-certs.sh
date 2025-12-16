#!/bin/bash

# Generate self-signed TLS certificates for testing
# For production, use Let's Encrypt with Certbot

DOMAIN=${DOMAIN:-localhost}

# Generate private key
openssl genrsa -out certs/key.pem 2048

# Generate certificate signing request
openssl req -new -key certs/key.pem -out certs/cert.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=*.$DOMAIN"

# Generate self-signed certificate
openssl x509 -req -days 365 -in certs/cert.csr -signkey certs/key.pem -out certs/cert.pem

echo "Self-signed certificates generated in certs/"
echo "For production: Use Certbot with DNS challenge for wildcard cert"