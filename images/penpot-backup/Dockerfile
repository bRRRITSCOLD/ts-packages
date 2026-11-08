# ghcr.io/brrritscold/penpot-backup: Penpot's nightly backup and weekly restore check.
# Build from the repo root: docker build -f images/penpot-backup/Dockerfile .
#
# The base matches the server image in personal-infra penpot/base/postgres.yaml, so pg_dump,
# pg_restore and the throwaway server in the restore check are the same major as the live DB.
# Bump both together.
#
#   penpot-backup         pg_dump, restic backup, forget --prune, check, optional copy, ping
#   penpot-restore-check  restore the latest snapshot into a throwaway server and sanity-check it
#
# Configured entirely by env vars; see the header of each script.

FROM postgres:16.15-alpine

ARG RESTIC_VERSION=0.19.1
# From https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/SHA256SUMS
ARG RESTIC_SHA256_AMD64=f415415624dcc452f2a02b8c33641791a8c6d6d3b65bbb3543fcf9a25151585c
ARG RESTIC_SHA256_ARM64=a5f64aaab53d51e311fa3829124c5b703f2d14cf187d8640b6be3b2b49376465
ARG TARGETARCH=amd64

RUN apk add --no-cache bash ca-certificates curl jq \
	&& case "$TARGETARCH" in \
		amd64) sha="$RESTIC_SHA256_AMD64" ;; \
		arm64) sha="$RESTIC_SHA256_ARM64" ;; \
		*) echo "unsupported arch $TARGETARCH" >&2; exit 1 ;; \
	esac \
	&& curl -fsSL -o /tmp/restic.bz2 \
		"https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_linux_${TARGETARCH}.bz2" \
	&& echo "$sha  /tmp/restic.bz2" | sha256sum -c - \
	&& bunzip2 -c /tmp/restic.bz2 > /usr/local/bin/restic \
	&& chmod 755 /usr/local/bin/restic \
	&& rm /tmp/restic.bz2 \
	&& restic version

COPY --chmod=755 images/penpot-backup/lib.sh /usr/local/lib/penpot-backup/lib.sh
COPY --chmod=755 images/penpot-backup/backup.sh /usr/local/bin/penpot-backup
COPY --chmod=755 images/penpot-backup/restore-check.sh /usr/local/bin/penpot-restore-check

# The alpine image's postgres user (uid 70): initdb refuses to run as root.
USER postgres
WORKDIR /tmp
ENTRYPOINT []
CMD ["penpot-backup"]
