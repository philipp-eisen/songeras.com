#!/bin/bash
set -e

# Cloudflare provides CF_PAGES_BRANCH during builds
BRANCH="${CF_PAGES_BRANCH:-$(git branch --show-current)}"

echo "Building for branch: $BRANCH"

if [ "$BRANCH" = "main" ]; then
  echo "Production build - deploying to production Convex"
  # Use production deploy key
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY" npx convex deploy --cmd 'pnpm run build:vite'
else
  echo "Preview build - deploying to preview Convex for branch: $BRANCH"
  # Use preview deploy key and create preview deployment
  CONVEX_DEPLOY_KEY="$CONVEX_DEPLOY_KEY_PREVIEW" npx convex deploy --cmd 'pnpm run build:vite' --preview-create "$BRANCH"
fi
