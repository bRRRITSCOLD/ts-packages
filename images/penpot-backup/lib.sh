# Shared by penpot-backup and penpot-restore-check. Sourced, not run.
# shellcheck shell=bash

# Every snapshot this image writes uses this host name, so forget and restore can select by it.
# shellcheck disable=SC2034 # used by the scripts that source this file
SNAPSHOT_HOST=penpot

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
die() { log "error: $*"; exit 1; }

require_env() {
	local name
	for name in "$@"; do
		[[ -n ${!name:-} ]] || die "$name is not set"
	done
}

# hc_ping [start|fail|<exit code>] [body]: healthchecks.io ping. Never fails the job, and a
# missing URL only logs, so a run by hand needs no ping URL.
hc_ping() {
	local url=${HC_URL:-} suffix=${1:-} body=${2:-}
	[[ -n $url ]] || { log "no ping URL set; not pinging${suffix:+ /$suffix}"; return 0; }
	curl -fsS -m 10 --retry 5 -o /dev/null --data-raw "$body" "$url${suffix:+/$suffix}" ||
		log "warning: ping${suffix:+ /$suffix} failed"
}

# On any failure: ping /<exit code> with the tail of the log, so the alert says why.
# Use as `trap 'report_exit $?' EXIT` after `exec > >(tee -a "$LOG_FILE") 2>&1`, so the log
# file captures all output.
LOG_FILE=$(mktemp)
report_exit() {
	local code=$1
	if ((code != 0)); then
		log "failed with exit code $code"
		hc_ping "$code" "$(tail -c 10000 "$LOG_FILE")"
	fi
	rm -f "$LOG_FILE"
}

# restic exits 10 when the repository does not exist (restic >= 0.17). Any other non-zero
# (wrong password: 12, network, auth) must not be mistaken for "missing" and trigger an init.
repo_exists() {
	local repo=$1 code=0
	restic -r "$repo" cat config >/dev/null 2>&1 || code=$?
	case $code in
		0) return 0 ;;
		10) return 1 ;;
		*)
			restic -r "$repo" cat config >/dev/null || true
			die "cannot open repository $repo (restic exit $code)"
			;;
	esac
}

# Ensures `repo` exists. A missing repo is initialised with the chunker parameters of
# `sibling` when the sibling exists, so `restic copy` between them deduplicates.
ensure_repo() {
	local repo=$1 sibling=${2:-}
	repo_exists "$repo" && return 0
	if [[ -n $sibling ]] && repo_exists "$sibling"; then
		log "initialising $repo with the chunker parameters of $sibling"
		RESTIC_FROM_PASSWORD=$RESTIC_PASSWORD restic -r "$repo" init --from-repo "$sibling" --copy-chunker-params
	else
		log "initialising $repo"
		restic -r "$repo" init
	fi
}
