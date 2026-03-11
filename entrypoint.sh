#!/bin/sh
set -e

dir="${CLAUDE_CONFIG_DIR:-/data/claude}"
mkdir -p "$dir"
chown node:node "$dir"

ws_dir="${WORKSPACES_PATH:-/data/workspaces}"
sn_dir="${SNAPSHOTS_PATH:-/data/snapshots}"
mkdir -p "$ws_dir" "$sn_dir"
chown node:node "$ws_dir" "$sn_dir"

exec gosu node "$@"
