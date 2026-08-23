#!/usr/bin/env bash
set -euo pipefail

# Announce a restart, wait out the countdown, then restart — so the banner
# players see is put up by the same command that takes the server down, and
# can't promise a window nobody keeps.
#
# Usage:
#   ./scripts/maintenance.sh 60                     # warn for 60 minutes, then restart
#   ./scripts/maintenance.sh 60 "Upgrading to 1.6"  # ...with your own wording
#   ./scripts/maintenance.sh announce 60            # put the banner up, restart by hand
#   ./scripts/maintenance.sh clear                  # take the banner down
#
# Needs, in the environment or a .env beside this repo:
#   ADMIN_TOKEN   the same value the server runs with
#   BASE_URL      where the server answers (default http://localhost:3000)

BASE_URL="${BASE_URL:-http://localhost:3000}"
RESTART_CMD="${RESTART_CMD:-docker compose up -d --pull always}"

case "${1:-}" in
  ""|-h|--help)
    awk 'NR>3 && /^#/ { sub(/^# ?/, ""); print; next } NR>3 { exit }' "$0"
    exit 0
    ;;
esac

if [[ -z "${ADMIN_TOKEN:-}" && -f .env ]]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "Error: ADMIN_TOKEN is not set (put it in .env or the environment)." >&2
  exit 1
fi

api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-fsS -X "$method" -H "Authorization: Bearer $ADMIN_TOKEN")
  [[ -n "$body" ]] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}" "$BASE_URL$path"
}

announce() {
  local minutes="$1" message="${2:-}"
  local body
  if [[ -n "$message" ]]; then
    local escaped="${message//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    body=$(printf '{"minutes":%s,"message":"%s"}' "$minutes" "$escaped")
  else
    body=$(printf '{"minutes":%s}' "$minutes")
  fi
  api POST /api/notice "$body" > /dev/null
  echo "Announced: restart in $minutes minute(s)."
}

clear_notice() {
  api DELETE /api/notice > /dev/null
  echo "Banner cleared."
}

case "${1:-}" in
  clear)
    clear_notice
    ;;
  announce)
    announce "${2:?minutes required}" "${3:-}"
    ;;
  *)
    MINUTES="$1"
    [[ "$MINUTES" =~ ^[0-9]+$ ]] || { echo "Error: expected a number of minutes." >&2; exit 1; }
    announce "$MINUTES" "${2:-}"

    echo "Waiting $MINUTES minute(s) — Ctrl-C to call it off (then: $0 clear)."
    sleep $((MINUTES * 60))

    echo "Restarting: $RESTART_CMD"
    eval "$RESTART_CMD"

    # Only clear once the new process is actually answering: if the restart
    # goes wrong, the banner explaining the outage is the last thing to drop.
    for _ in $(seq 1 60); do
      if curl -fsS "$BASE_URL/health" > /dev/null 2>&1; then
        clear_notice
        echo "Back up."
        exit 0
      fi
      sleep 2
    done

    echo "Server did not come back within 2 minutes — leaving the banner up." >&2
    exit 1
    ;;
esac
