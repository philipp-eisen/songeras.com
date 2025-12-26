import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

const convexUrl = process.env.VITE_CONVEX_URL
const convexSiteUrl = process.env.VITE_CONVEX_SITE_URL

if (!convexUrl || !convexSiteUrl) {
  throw new Error(
    'Missing required environment variables: VITE_CONVEX_URL and VITE_CONVEX_SITE_URL',
  )
}

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
