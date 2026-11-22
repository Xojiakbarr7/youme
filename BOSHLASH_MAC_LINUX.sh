#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
 echo 'Node.js 22+ o\x27rnating: https://nodejs.org'
 exit 1
fi
printf '%s\n' 'YOU ME — http://localhost:3000' 'Admin — http://localhost:3000/admin'
node server.js
