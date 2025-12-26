import { createFileRoute } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { SpotifyLogin } from '@/components/spotify-login'
import { UserStatus } from '@/components/user-status'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: LandingPage })

function LandingPage() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      {session ? <UserStatus user={session.user} /> : <SpotifyLogin />}
    </div>
  )
}
