import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  throw new Error('Missing required environment variable: VITE_CONVEX_URL')
}

// Derive site URL from cloud URL (e.g., https://xxx.convex.cloud -> https://xxx.convex.site)
const convexSiteUrl = convexUrl.replace('.convex.cloud', '.convex.site')

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl,
  convexSiteUrl,
})
