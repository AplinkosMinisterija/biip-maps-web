#!/usr/bin/env bash
# Builds the hunting data hub snapshot (public/data/hunting/v1/*.json) from the medžioklė database.
#
# Usage: PGHOST=127.0.0.1 PGPORT=5446 PGDATABASE=medziokle PGUSER=… PGPASSWORD=… \
#        scripts/hunting-snapshot/run.sh [--date YYYY-MM-DD]
#
# Read-only by construction: every session starts with default_transaction_read_only=on, and the script
# refuses to continue unless the server confirms it. Writes public/data/hunting/v1/*.json, then runs check.mjs.
# Run it locally through the database tunnel only; never in CI. See README.md.
set -euo pipefail
cd "$(dirname "$0")/../.."
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=60000'
[ "$(psql -X -At -c 'SHOW transaction_read_only')" = "on" ] || { echo "Refusing: session is not read-only" >&2; exit 2; }
tmp=$(mktemp -d "${TMPDIR:-/tmp}/hunting-snapshot.XXXXXX")
trap 'rm -rf "$tmp"' EXIT
for f in scripts/hunting-snapshot/sql/*.sql; do
  psql -X -q -v ON_ERROR_STOP=1 --csv -f "$f" > "$tmp/$(basename "$f" .sql).csv"
done
node scripts/hunting-snapshot/build.mjs "$tmp" "$@"
node scripts/hunting-snapshot/check.mjs
