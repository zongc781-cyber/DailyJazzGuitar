#!/bin/bash
# Stops Daily Jazz Guitar's local server, if start.sh started one from this folder.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
PIDFILE="$ROOT/.mac/server.pid"

[ -f "$PIDFILE" ] || exit 0
read -r pid started <"$PIDFILE" || true
# The pid is still the server's only if that process started when the server did.
if [ -n "${pid:-}" ] && [ "$(ps -o lstart= -p "$pid" 2>/dev/null | tr -s ' ' | sed 's/^ //; s/ $//')" = "${started:-}" ]; then
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
fi
rm -f "$PIDFILE"
