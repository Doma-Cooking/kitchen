#!/bin/sh
set -e

dir="${CLAUDE_CONFIG_DIR:-/data/claude}"
mkdir -p "$dir"
chown node:node "$dir"

plugins_dir="${PLUGINS_PATH:-/data/plugins}"
ws_dir="${WORKSPACES_PATH:-/data/workspaces}"
sn_dir="${SNAPSHOTS_PATH:-/data/snapshots}"
mkdir -p "$plugins_dir" "$ws_dir" "$sn_dir"
chown node:node "$plugins_dir" "$ws_dir" "$sn_dir"

# Clone/pull and build plugin repo (runs as root for npm link access)
eval $(node -e "
  const y = require('yaml').parse(require('fs').readFileSync('.kitchen.yaml','utf8'));
  if (y.plugins && y.plugins.git) {
    console.log('PLUGINS_GIT_URL=' + y.plugins.git.url);
    console.log('PLUGINS_GIT_BRANCH=' + (y.plugins.git.branch || 'main'));
    console.log('PLUGINS_DIR=' + y.plugins.path);
  }
")

if [ -n "$PLUGINS_GIT_URL" ]; then
  git config --global --add safe.directory "$PLUGINS_DIR"
  gosu node git config --global --add safe.directory "$PLUGINS_DIR"
  
  credential_helper="!node /app/dist/scripts/git-credential-github-app.js"
  export GIT_CONFIG_COUNT=1
  export GIT_CONFIG_KEY_0="credential.helper"
  export GIT_CONFIG_VALUE_0="$credential_helper"

  if [ -d "$PLUGINS_DIR/.git" ]; then
    echo "Pulling plugin repo at $PLUGINS_DIR"
    git -C "$PLUGINS_DIR" pull --ff-only origin "$PLUGINS_GIT_BRANCH"
  else
    echo "Cloning plugin repo from $PLUGINS_GIT_URL into $PLUGINS_DIR"
    git clone --branch "$PLUGINS_GIT_BRANCH" --depth 1 "$PLUGINS_GIT_URL" "$PLUGINS_DIR"
  fi

  if [ -f "$PLUGINS_DIR/package.json" ]; then
    echo "Installing and building plugins..."
    cd "$PLUGINS_DIR"
    npm ci && npm run build && npm link
    cd /app
  fi

  if [ -f "$PLUGINS_DIR/requirements.txt" ]; then
    echo "Installing Python dependencies from plugins..."
    gosu node /opt/venv/bin/pip3 install -q -r "$PLUGINS_DIR/requirements.txt"
  fi

  chown -R node:node "$PLUGINS_DIR"
fi

exec gosu node "$@"
