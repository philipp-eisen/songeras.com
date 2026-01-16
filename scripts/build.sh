#!/bin/bash
set -e

echo "========================================"
echo "Build Script Debug Info"
echo "========================================"
echo "CF_PAGES_BRANCH: '${CF_PAGES_BRANCH:-<not set>}'"
echo "CF_PAGES_URL: '${CF_PAGES_URL:-<not set>}'"
echo "CF_PAGES_COMMIT_SHA: '${CF_PAGES_COMMIT_SHA:-<not set>}'"
echo "WORKERS_CI: '${WORKERS_CI:-<not set>}'"
echo "CI: '${CI:-<not set>}'"
echo ""
echo "Git info:"
echo "  git branch --show-current: '$(git branch --show-current 2>/dev/null || echo '<failed>')'"
echo "  git rev-parse --abbrev-ref HEAD: '$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '<failed>')'"
echo ""
echo "Deploy keys set:"
echo "  CONVEX_DEPLOY_KEY: $([ -n "$CONVEX_DEPLOY_KEY" ] && echo 'YES' || echo 'NO')"
echo "  CONVEX_DEPLOY_KEY_PREVIEW: $([ -n "$CONVEX_DEPLOY_KEY_PREVIEW" ] && echo 'YES' || echo 'NO')"
echo "========================================"

# Try multiple methods to detect branch
if [ -n "$CF_PAGES_BRANCH" ]; then
  BRANCH="$CF_PAGES_BRANCH"
  echo "Using CF_PAGES_BRANCH: $BRANCH"
elif [ -n "$GITHUB_HEAD_REF" ]; then
  BRANCH="$GITHUB_HEAD_REF"
  echo "Using GITHUB_HEAD_REF: $BRANCH"
elif [ -n "$GITHUB_REF_NAME" ]; then
  BRANCH="$GITHUB_REF_NAME"
  echo "Using GITHUB_REF_NAME: $BRANCH"
else
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
