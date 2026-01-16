#!/bin/bash
set -e

echo "========================================"
echo "Build Script Debug Info"
echo "========================================"

# Print ALL environment variables that might contain branch info
echo "All CF_* and branch-related env vars:"
env | grep -iE '^CF_|BRANCH|GIT|WORKER|DEPLOY' | sort || echo "(none found)"
echo ""

# Check Cloudflare deploy config file
DEPLOY_CONFIG=".wrangler/deploy/config.json"
if [ -f "$DEPLOY_CONFIG" ]; then
  echo "Found $DEPLOY_CONFIG:"
  cat "$DEPLOY_CONFIG"
  echo ""
else
  echo "$DEPLOY_CONFIG not found (created during deploy, not build)"
fi

echo "Git info:"
echo "  git branch --show-current: '$(git branch --show-current 2>/dev/null || echo '<failed>')'"
echo "  git rev-parse --abbrev-ref HEAD: '$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<failed>')'"
echo "  git symbolic-ref --short HEAD: '$(git symbolic-ref --short HEAD 2>/dev/null || echo '<failed>')'"
echo "  git name-rev --name-only HEAD: '$(git name-rev --name-only HEAD 2>/dev/null || echo '<failed>')'"
echo "  git log -1 --format=%D: '$(git log -1 --format=%D 2>/dev/null || echo '<failed>')'"
echo ""
echo "Checking .git/HEAD:"
cat .git/HEAD 2>/dev/null || echo "(not found)"
echo ""
echo "Deploy keys set:"
echo "  CONVEX_DEPLOY_KEY: $([ -n "$CONVEX_DEPLOY_KEY" ] && echo 'YES' || echo 'NO')"
echo "  CONVEX_DEPLOY_KEY_PREVIEW: $([ -n "$CONVEX_DEPLOY_KEY_PREVIEW" ] && echo 'YES' || echo 'NO')"
echo "========================================"

# Try multiple methods to detect branch
BRANCH=""

# Method 1: Cloudflare deploy config (contains branch info for Workers)
if [ -z "$BRANCH" ] && [ -f "$DEPLOY_CONFIG" ]; then
  # Try to extract branch from config.json using grep/sed (no jq available)
  CONFIG_BRANCH=$(grep -o '"branch"[[:space:]]*:[[:space:]]*"[^"]*"' "$DEPLOY_CONFIG" 2>/dev/null | sed 's/.*"branch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "")
  if [ -n "$CONFIG_BRANCH" ]; then
    BRANCH="$CONFIG_BRANCH"
    echo "Using branch from $DEPLOY_CONFIG: $BRANCH"
  fi
fi

# Method 2: Cloudflare environment variables
if [ -z "$BRANCH" ] && [ -n "$CF_PAGES_BRANCH" ]; then
  BRANCH="$CF_PAGES_BRANCH"
  echo "Using CF_PAGES_BRANCH: $BRANCH"
fi

if [ -z "$BRANCH" ] && [ -n "$CF_WORKER_BRANCH" ]; then
  BRANCH="$CF_WORKER_BRANCH"
  echo "Using CF_WORKER_BRANCH: $BRANCH"
fi

# Method 3: GitHub environment variables
if [ -z "$BRANCH" ] && [ -n "$GITHUB_HEAD_REF" ]; then
  BRANCH="$GITHUB_HEAD_REF"
  echo "Using GITHUB_HEAD_REF: $BRANCH"
fi

if [ -z "$BRANCH" ] && [ -n "$GITHUB_REF_NAME" ]; then
  BRANCH="$GITHUB_REF_NAME"
  echo "Using GITHUB_REF_NAME: $BRANCH"
fi

# Method 4: Git detection (fallback)
if [ -z "$BRANCH" ]; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || git branch --show-current 2>/dev/null || echo "")
  echo "Using git detection: $BRANCH"
fi

echo ""
echo ">>> Final detected branch: '$BRANCH'"
echo ""

# Logic: Only do preview if we have a non-main, non-empty branch name
# Default to production if branch detection fails (safer for main deployments)
if [ -n "$BRANCH" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "HEAD" ]; then
  echo ">>> PREVIEW BUILD - deploying to preview Convex for branch: '$BRANCH'"
  echo ">>> Using CONVEX_DEPLOY_KEY_PREVIEW"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY_PREVIEW" npx convex deploy --cmd 'pnpm run build:vite' --preview-create "$BRANCH"
else
  echo ">>> PRODUCTION BUILD - deploying to production Convex"
  echo ">>> Branch was: '${BRANCH:-<empty>}' (treating as main)"
  echo ">>> Using CONVEX_DEPLOY_KEY"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'pnpm run build:vite'
fi

echo ""
echo "========================================"
echo "Convex deploy complete, build artifacts ready"
echo "========================================"
