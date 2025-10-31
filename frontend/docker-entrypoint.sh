#!/bin/sh
set -e

CERT_DIR="/etc/letsencrypt/live/qgocargo.cloud"
CERT_FILE="${CERT_DIR}/fullchain.pem"
KEY_FILE="${CERT_DIR}/privkey.pem"

if [ ! -f "$CERT_FILE" ] && [ ! -f "$KEY_FILE" ]; then
  echo "[nginx] Generating self-signed certificate for local usage" >&2
  mkdir -p "$CERT_DIR"
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
    -subj "/CN=localhost" \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE"
fi

exec "$@"
