#!/bin/sh
set -e

dir="${CLAUDE_CONFIG_DIR:-/data/claude}"
mkdir -p "$dir"
chown node:node "$dir"

exec gosu node "$@"
