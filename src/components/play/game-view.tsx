import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { TimelineView } from './timeline-view'
import type { GameData } from './types'
import {
  getAllTimelinesQuery,
  getCurrentRoundCardQuery,
} from '@/lib/convex-queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface GameViewProps {
  game: GameData
}

export function GameView({ game }: GameViewProps) {
  const { data: timelines } = useSuspenseQuery(getAllTimelinesQuery(game._id))
  const { data: currentCard } = useQuery(getCurrentRoundCardQuery(game._id))

  const activePlayer = game.players.find(
    (p) => p.seatIndex === game.currentTurnSeatIndex,
  )

  return (
    <div className="space-y-4">
      {/* Current Round Card (after reveal) */}
      {currentCard && game.phase === 'revealed' && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Current Card</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {currentCard.albumImageUrl && (
                <img
                  src={currentCard.albumImageUrl}
                  alt=""
                  className="h-20 w-20 rounded object-cover"
                />
              )}
              <div>
                <p className="text-xl font-bold">{currentCard.title}</p>
                <p className="text-muted-foreground">
                  {currentCard.artistNames.join(', ')}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {currentCard.releaseYear}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timelines */}
      {timelines && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Timelines</h2>
          {timelines.map((timeline) => (
            <TimelineView
              key={timeline.playerId}
              timeline={timeline}
              game={game}
              isActivePlayer={timeline.playerId === activePlayer?._id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
