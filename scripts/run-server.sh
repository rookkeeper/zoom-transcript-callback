#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

# Load .env values without sourcing the file. This keeps prompt values with
# spaces from being interpreted as shell commands.
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    line=${line%"$(printf '\r')"}
    case "$line" in
      ''|[[:space:]]*|\#*) continue ;;
    esac

    case "$line" in
      export\ *) line=${line#export } ;;
    esac

    case "$line" in
      *=*) ;;
      *) printf '%s\n' "Invalid .env entry" >&2; exit 1 ;;
    esac

    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      ''|*[!A-Za-z0-9_]*) printf '%s\n' "Invalid .env variable name" >&2; exit 1 ;;
    esac

    case "$value" in
      \"*\") value=${value#\"}; value=${value%\"} ;;
      \'*\') value=${value#\'}; value=${value%\'} ;;
    esac

    export "$key=$value"
  done < .env
fi

if ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' "npm is required; install Node.js before running this script" >&2
  exit 1
fi

# Keep dependencies installed and current with package.json/package-lock.json.
npm install --no-audit --no-fund

port=${CALLBACK_PORT:-8787}
case "$port" in
  ''|*[!0-9]*) printf '%s\n' "CALLBACK_PORT must be a number" >&2; exit 1 ;;
esac

# Replace an existing listener on the callback port.
pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$pids" ]; then
  printf '%s\n' "Stopping existing server on port $port"
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done

  i=0
  while [ "$i" -lt 20 ]; do
    still_running=false
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then still_running=true; fi
    done
    [ "$still_running" = false ] && break
    sleep 0.1
    i=$((i + 1))
  done

  for pid in $pids; do
    kill -9 "$pid" 2>/dev/null || true
  done
fi

exec npm start
