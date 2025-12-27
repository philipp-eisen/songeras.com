import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { Id } from '../../convex/_generated/dataModel'
import { FinishedView, GameView, LobbyView } from '@/components/play'
import { getGameQuery } from '@/lib/convex-queries'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/play/$gameId')({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getGameQuery(params.gameId as Id<'games'>),
    )
  },
  component: GamePage,
})

function GamePage() {
  const { gameId } = Route.useParams()
  const { data: game } = useSuspenseQuery(getGameQuery(gameId as Id<'games'>))

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

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {game.playlistName ?? 'Song Game'}
          </h1>
          <p className="text-muted-foreground">
            Code: <span className="font-mono text-lg">{game.joinCode}</span>
          </p>
        </div>
        <Badge
          variant={
            game.phase === 'lobby'
              ? 'secondary'
              : game.phase === 'finished'
                ? 'default'
                : 'outline'
          }
          className="text-sm"
        >
          {game.phase}
        </Badge>
      </div>

      {game.phase === 'lobby' && <LobbyView game={game} />}
      {game.phase !== 'lobby' && game.phase !== 'finished' && (
        <GameView game={game} />
      )}
      {game.phase === 'finished' && <FinishedView game={game} />}
    </div>
  )
}
