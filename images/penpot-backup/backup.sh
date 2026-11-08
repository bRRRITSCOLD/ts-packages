#!/usr/bin/env bash
# penpot-backup: Penpot's nightly backup (SPEC B4).
#
#   1. pg_dump -Fc of the Penpot DB, first, so the dump is never older than the assets
#   2. restic backup of the dump plus the assets dir (mounted read-only)
#   3. forget --prune (7 daily, 4 weekly, 6 monthly; `pre-upgrade` snapshots are kept)
#   4. check --read-data-subset
#   5. with COPY_REPOSITORY: restic copy to it, then forget --prune and check there too
#   6. size check: fails when a repo's raw data exceeds MAX_REPO_GB, after the backup is safely
#      in every repo, so the alert comes before B2's free-tier cap blocks writes
#   7. healthchecks.io ping; /start at the beginning, /<exit code> with the log tail on failure
#
# A missing repository is initialised (restic exit 10 only; any other open error fails), the
# second one with the first one's chunker parameters so copies deduplicate.
#
# Env:
#   RESTIC_REPOSITORY, RESTIC_PASSWORD  required; the primary repo
#   COPY_REPOSITORY                     optional; copied to after the primary is checked,
#                                       same password
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#                                       for an s3: repo (B2's S3 API: key id, application key)
#   PGHOST, PGUSER, PGPASSWORD          required; PGDATABASE defaults to penpot
#   ASSETS_DIR                          default /backup/assets
#   DUMP_DIR                            default /backup/db; must be writable
#   HC_PING_URL                         healthchecks.io ping URL; unset skips the ping
#   BACKUP_TAG                          default nightly; pre-upgrade before a Penpot bump
#   CHECK_SUBSET                        default 5%
#   MAX_REPO_GB                         default 8 (B2's free tier is 10 GB); 0 disables
set -euo pipefail
# shellcheck source=lib.sh
. /usr/local/lib/penpot-backup/lib.sh

: "${PGDATABASE:=penpot}" "${ASSETS_DIR:=/backup/assets}" "${DUMP_DIR:=/backup/db}"
: "${BACKUP_TAG:=nightly}" "${CHECK_SUBSET:=5%}" "${RESTIC_CACHE_DIR:=/tmp/restic-cache}"
: "${MAX_REPO_GB:=8}"
export PGDATABASE RESTIC_CACHE_DIR
HC_URL=${HC_PING_URL:-}

exec > >(tee -a "$LOG_FILE") 2>&1
trap 'report_exit $?' EXIT

require_env RESTIC_REPOSITORY RESTIC_PASSWORD PGHOST PGUSER PGPASSWORD
[[ -d $ASSETS_DIR ]] || die "assets dir $ASSETS_DIR does not exist"
[[ -n $(ls -A "$ASSETS_DIR") ]] || die "assets dir $ASSETS_DIR is empty; refusing to back up nothing"

hc_ping start
primary=$RESTIC_REPOSITORY
copy=${COPY_REPOSITORY:-}

forget_and_check() {
	local repo=$1
	log "forget --prune in $repo"
	restic -r "$repo" forget --prune --host "$SNAPSHOT_HOST" \
		--keep-daily 7 --keep-weekly 4 --keep-monthly 6 --keep-tag pre-upgrade
	log "check --read-data-subset=$CHECK_SUBSET in $repo"
	restic -r "$repo" check --read-data-subset="$CHECK_SUBSET"
}

ensure_repo "$primary" "$copy"
[[ -z $copy ]] || ensure_repo "$copy" "$primary"

dump=$DUMP_DIR/penpot.dump
log "pg_dump $PGDATABASE@$PGHOST -> $dump"
pg_dump -Fc -f "$dump"
pg_restore --list "$dump" >/dev/null # a truncated dump fails here, before it is snapshotted
log "dump is $(du -h "$dump" | cut -f1)"

log "backup to $primary (tag $BACKUP_TAG)"
restic -r "$primary" backup --host "$SNAPSHOT_HOST" --tag "$BACKUP_TAG" "$dump" "$ASSETS_DIR"
forget_and_check "$primary"

if [[ -n $copy ]]; then
	log "copy $primary -> $copy"
	RESTIC_FROM_PASSWORD=$RESTIC_PASSWORD restic -r "$copy" copy --from-repo "$primary" --host "$SNAPSHOT_HOST"
	forget_and_check "$copy"
fi

# Raw (compressed, deduplicated) pack data: what the bucket bills for.
over=0
for repo in "$primary" ${copy:+"$copy"}; do
	bytes=$(restic -r "$repo" stats --mode raw-data --json | jq -r .total_size)
	gb=$(awk -v b="$bytes" 'BEGIN { printf "%.2f", b / 1e9 }')
	log "repo $repo holds ${gb} GB of raw data (limit ${MAX_REPO_GB} GB)"
	if [[ $MAX_REPO_GB != 0 ]] && awk -v g="$gb" -v m="$MAX_REPO_GB" 'BEGIN { exit !(g > m) }'; then
		log "error: $repo is over ${MAX_REPO_GB} GB: shorten retention or raise the B2 cap"
		over=1
	fi
done
((over == 0)) || die "backup stored, but a repo is over its size limit"

log "backup done"
hc_ping "" "$(tail -c 10000 "$LOG_FILE")"
