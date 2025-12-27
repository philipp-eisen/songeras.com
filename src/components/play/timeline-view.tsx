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
        <div className="flex gap-2 overflow-x-auto pb-2">
          {timeline.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards yet</p>
          ) : (
            timeline.cards.map((card) => (
              <div
                key={card._id}
                className="shrink-0 rounded-lg border bg-card p-2 text-center"
                style={{ minWidth: '120px' }}
              >
                {card.albumImageUrl && (
                  <img
                    src={card.albumImageUrl}
                    alt=""
                    className="mx-auto mb-1 h-12 w-12 rounded object-cover"
                  />
                )}
                <p className="text-xs font-medium truncate" title={card.title}>
                  {card.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {card.artistNames[0]}
                </p>
                <p className="text-sm font-bold text-primary">
                  {card.releaseYear}
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
