#!/bin/bash
# Opens Daily Jazz Guitar in the browser, first starting the app's local server if it is not
# already running. The "Daily Jazz Guitar" app that install.sh adds to ~/Applications runs this.
# The server only answers this Mac, and it keeps running in the background until you log out or
# run stop.sh. With --no-open it only makes sure the server is running.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd -P)"
PORT="${DJG_PORT:-4747}"
URL="http://localhost:$PORT"
LOG="$HOME/Library/Logs/DailyJazzGuitar.log"

running() {
  local body
  body="$(curl -fs --max-time 2 "$URL/api/catalog" 2>/dev/null)" && [[ $body == *'"entries"'* ]]
}

if ! running; then
  NODE="$(cat "$ROOT/.mac/node-path" 2>/dev/null || true)"
  if ! [ -x "$NODE" ]; then
    echo "Node.js was not found. Run scripts/mac/install.sh in $ROOT again." >&2
    exit 1
  fi
  # A server from this folder that stopped answering is replaced.
  bash "$ROOT/scripts/mac/stop.sh"
  mkdir -p "$(dirname "$LOG")"
  cd "$ROOT"
  echo "$(date '+%Y-%m-%d %H:%M:%S') starting on port $PORT" >>"$LOG"
  nohup "$NODE" node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port "$PORT" >>"$LOG" 2>&1 </dev/null &
  # stop.sh checks the start time too, so it never stops a later process that reuses the pid.
  echo "$! $(ps -o lstart= -p $! | tr -s ' ' | sed 's/^ //; s/ $//')" >"$ROOT/.mac/server.pid"
  for _ in $(seq 1 60); do
    running && break
    sleep 0.25
  done
  if ! running; then
    echo "The app's server did not start. Its log is $LOG" >&2
    exit 1
  fi
fi

if [ "${1:-}" != --no-open ]; then
  open "$URL"
fi
