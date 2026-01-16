#!/bin/bash
set -e

BRANCH="${WORKERS_CI_BRANCH:-main}"

echo "Branch: $BRANCH"

if [ "$BRANCH" = "main" ]; then
  echo "Production build"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'pnpm run build:vite'
else
  echo "Preview build for branch: $BRANCH"
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY_PREVIEW" npx convex deploy --cmd 'pnpm run build:vite' --preview-create "$BRANCH"
fi
