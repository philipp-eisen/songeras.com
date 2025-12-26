import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient, notifyManager } from '@tanstack/react-query'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { routeTree } from './routeTree.gen'
import { PendingFallback } from './components/pending-fallback'

const convexUrl = import.meta.env.VITE_CONVEX_URL

export function getRouter() {
  if (typeof document !== 'undefined') {
    notifyManager.setScheduler(window.requestAnimationFrame)
  }

  if (!convexUrl) {
    throw new Error('VITE_CONVEX_URL is not set')
  }
  const convexQueryClient = new ConvexQueryClient(convexUrl, {
    expectAuth: true,
  })

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        // Convex pushes updates via WebSocket, so data is never stale
        staleTime: Infinity,
        // Keep subscriptions active for 5 minutes after last observer unmounts
        gcTime: 5 * 60 * 1000,
      },
    },
  })
  convexQueryClient.connect(queryClient)

  const router = createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    context: { queryClient, convexQueryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0, // Let React Query handle all caching
    defaultPendingComponent: PendingFallback,
    defaultPendingMs: 100, // Show pending UI after 100ms to avoid flashes
    defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
    defaultNotFoundComponent: () => <p>not found</p>,
  })

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  })

  return router
}
