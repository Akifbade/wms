#!/bin/sh
set -e

# Skip certificate generation for local development
echo "[nginx] Starting in local development mode (skipping cert generation)" >&2

exec "$@"
