import { GameCard } from './game-card'
import type { GameData, TimelineData } from './types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TimelineViewProps {
  timeline: TimelineData
  game: GameData
  isActivePlayer: boolean
}

export function TimelineView({
  timeline,
  game,
  isActivePlayer,
}: TimelineViewProps) {
  const player = game.players.find((p) => p._id === timeline.playerId)

  return (
    <Card className={isActivePlayer ? 'border-2 border-primary' : ''}>
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {timeline.displayName}
            {timeline.isCurrentUser && <Badge className="ml-2">You</Badge>}
            {isActivePlayer && (
              <Badge variant="outline" className="ml-2">
                Active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {timeline.cards.length} cards
            </span>
            {game.useTokens && (
              <Badge variant="secondary">
                {player?.tokenBalance ?? 0} tokens
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <div className="-m-1 flex gap-2 overflow-x-auto p-1">
          {timeline.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards yet</p>
          ) : (
            timeline.cards.map((card) => (
              <GameCard
                key={card._id}
                title={card.title}
                releaseYear={card.releaseYear}
                artistName={card.artistNames[0]}
                albumImageUrl={card.albumImageUrl}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
