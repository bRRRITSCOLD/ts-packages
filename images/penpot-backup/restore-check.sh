#!/usr/bin/env bash
# penpot-restore-check: Penpot's weekly restore check (SPEC B4).
#
# Restores the latest snapshot, loads its dump into a throwaway Postgres running inside this
# container, and checks:
#   - the snapshot is younger than MAX_AGE_HOURS (the nightly backup is running)
#   - at least one live file, and the design system library file is live
#   - every live storage_object exists in the restored assets tree
# Then stops the server; the pod's emptyDir goes with it. Pings like penpot-backup.
#
# File modified_at is printed, not checked: a quiet week leaves it days old with nothing wrong.
#
# Env:
#   RESTIC_REPOSITORY, RESTIC_PASSWORD  required
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY   for an s3: repo
#   LIBRARY_FILE_ID                     required; the design system library file id
#   WORK_DIR                            default /work; must be writable and hold the restore
#   ASSETS_DIR, DUMP_DIR                as backed up; defaults /backup/assets, /backup/db
#   MAX_AGE_HOURS                       default 26
#   HC_PING_URL                         healthchecks.io ping URL; unset skips the ping
set -euo pipefail
# shellcheck source=lib.sh
. /usr/local/lib/penpot-backup/lib.sh

: "${WORK_DIR:=/work}" "${ASSETS_DIR:=/backup/assets}" "${DUMP_DIR:=/backup/db}"
: "${MAX_AGE_HOURS:=26}" "${RESTIC_CACHE_DIR:=/tmp/restic-cache}"
export RESTIC_CACHE_DIR
HC_URL=${HC_PING_URL:-}

pgdata=$WORK_DIR/pgdata
restore=$WORK_DIR/restore

stop_pg() {
	[[ -f $pgdata/postmaster.pid ]] && pg_ctl -D "$pgdata" -m fast -w stop >/dev/null || true
}
exec > >(tee -a "$LOG_FILE") 2>&1
trap 'code=$?; stop_pg; report_exit $code' EXIT

require_env RESTIC_REPOSITORY RESTIC_PASSWORD LIBRARY_FILE_ID
hc_ping start

snapshot=$(restic snapshots --host "$SNAPSHOT_HOST" --latest 1 --json | jq -c 'max_by(.time)')
[[ $snapshot != null ]] || die "no snapshots for host $SNAPSHOT_HOST in $RESTIC_REPOSITORY"
id=$(jq -r .short_id <<<"$snapshot")
taken=$(jq -r .time <<<"$snapshot")
# Both images run in UTC, so restic writes the time with a Z offset, which fromdateiso8601 needs.
age_h=$(jq -r '(now - (.time | sub("\\.[0-9]+"; "") | fromdateiso8601)) / 3600 | floor' <<<"$snapshot")
log "latest snapshot $id taken $taken (${age_h}h ago)"
((age_h < MAX_AGE_HOURS)) || die "latest snapshot is ${age_h}h old (limit ${MAX_AGE_HOURS}h): is the nightly backup running?"

log "restoring $id into $restore"
rm -rf "$restore" "$pgdata"
restic restore "$id" --target "$restore"
dump=$restore$DUMP_DIR/penpot.dump
assets=$restore$ASSETS_DIR
[[ -f $dump ]] || die "snapshot $id has no $DUMP_DIR/penpot.dump"
[[ -d $assets ]] || die "snapshot $id has no $ASSETS_DIR"

log "starting a throwaway server in $pgdata"
initdb -D "$pgdata" -U postgres --auth=trust >/dev/null
# Unix socket only, in the work dir: nothing outside this container can reach it.
pg_ctl -D "$pgdata" -o "-c listen_addresses='' -k $WORK_DIR" -w start >/dev/null
export PGHOST=$WORK_DIR PGUSER=postgres PGDATABASE=penpot
createdb penpot
log "pg_restore"
pg_restore --no-owner --no-privileges --exit-on-error -d penpot "$dump"

q() { psql -X -v ON_ERROR_STOP=1 -Atc "$1"; }

files=$(q "select count(*) from file where deleted_at is null")
log "live files: $files; newest modified_at: $(q "select max(modified_at) from file")"
((files > 0)) || die "restored DB has no live files"

library=$(q "select name from file where id = '$LIBRARY_FILE_ID' and deleted_at is null")
[[ -n $library ]] || die "library file $LIBRARY_FILE_ID is not live in the restored DB"
log "library file present: $library"

# The fs storage backend keeps object <uuid> at <hex[0:2]>/<hex[2:4]>/<hex[4:]>, dashes removed.
total=0 missing=0
while read -r hex; do
	total=$((total + 1))
	path=$assets/${hex:0:2}/${hex:2:2}/${hex:4}
	if [[ ! -f $path ]]; then
		missing=$((missing + 1))
		((missing > 20)) || log "missing storage object: $path"
	fi
done < <(q "select replace(id::text, '-', '') from storage_object where deleted_at is null")
log "storage objects: $total live, $missing missing"
((total > 0)) || die "restored DB has no live storage objects"
((missing == 0)) || die "$missing of $total live storage objects are missing from the restored assets"

log "restore check passed"
hc_ping "" "$(tail -c 10000 "$LOG_FILE")"
