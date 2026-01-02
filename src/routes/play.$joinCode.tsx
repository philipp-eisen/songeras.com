import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  FinishedView,
  GameControlsBar,
  GameHeader,
  LobbyView,
} from '@/components/play'
import { getGameByJoinCodeQuery } from '@/lib/convex-queries'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/play/$joinCode')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getGameByJoinCodeQuery(params.joinCode),
    )
  },
  component: GamePage,
})

function GamePage() {
  const { joinCode } = Route.useParams()
  const { data: game } = useSuspenseQuery(getGameByJoinCodeQuery(joinCode))

  if (!game) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Game Not Found</CardTitle>
            <CardDescription>
              This game doesn't exist or you don't have access.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const isActiveGame = game.phase !== 'lobby' && game.phase !== 'finished'

  // Active game layout: header + controls (active timeline shown in controls)
  if (isActiveGame) {
    return (
      <div className="space-y-4 p-4">
        <GameHeader game={game} />
        <GameControlsBar game={game} />
      </div>
    )
  }

  // Lobby/Finished layout: standard scrolling page
  return (
    <div className="space-y-4 p-4">
      <GameHeader game={game} />
      {game.phase === 'lobby' && <LobbyView game={game} />}
      {game.phase === 'finished' && <FinishedView game={game} />}
    </div>
  )
}
