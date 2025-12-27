import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { TimelineView } from './timeline-view'
import type { GameData } from './types'
import {
  getAllTimelinesQuery,
  getCurrentRoundCardQuery,
} from '@/lib/convex-queries'

interface GameViewProps {
  game: GameData
}

export function GameView({ game }: GameViewProps) {
  const { data: timelines } = useSuspenseQuery(getAllTimelinesQuery(game._id))
  const { data: currentCard } = useQuery(getCurrentRoundCardQuery(game._id))

  const activePlayer = game.players.find(
    (p) => p.seatIndex === game.currentTurnSeatIndex,
  )

  // Filter out active player's timeline - it's shown in GameControlsBar
  const otherTimelines = timelines?.filter(
    (t) => t.playerId !== activePlayer?._id,
  )

  return (
    <div className="space-y-4">
      {/* Timelines (excluding active player - shown in controls bar) */}
      {otherTimelines && otherTimelines.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Other Timelines</h2>
          {otherTimelines.map((timeline) => (
            <TimelineView
              key={timeline.playerId}
              timeline={timeline}
              game={game}
              isActivePlayer={false}
              currentCard={currentCard}
            />
          ))}
        </div>
      )}
    </div>
  )
}
