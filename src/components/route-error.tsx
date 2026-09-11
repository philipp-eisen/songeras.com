import { Link, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function RouteError() {
  const router = useRouter()
  return (
    <section role="alert" className="space-y-4 p-6">
      <h1 className="text-xl font-bold">Could not load this page</h1>
      <p>Check your connection and try again.</p>
      <div className="flex gap-2">
        <Button onClick={() => void router.invalidate()}>Try again</Button>
        <Button variant="outline" render={<Link to="/" />}>
          Go home
        </Button>
      </div>
    </section>
  )
}
