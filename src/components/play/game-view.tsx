import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { TimelineView } from './timeline-view'
import { TurnControls } from './turn-controls'
import type { GameData } from './types'
import {
  getAllTimelinesQuery,
  getCurrentRoundCardQuery,
  getCurrentRoundSongPreviewQuery,
} from '@/lib/convex-queries'
import { SpotifyPlayer } from '@/components/spotify-player'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface GameViewProps {
  game: GameData
}

export function GameView({ game }: GameViewProps) {
  const { data: timelines } = useSuspenseQuery(getAllTimelinesQuery(game._id))
  const { data: currentCard } = useQuery(getCurrentRoundCardQuery(game._id))
  const { data: songPreview } = useQuery(getCurrentRoundSongPreviewQuery(game._id))

  const isHost = game.isCurrentUserHost

  const activePlayer = game.players.find((p) => p.seatIndex === game.currentTurnSeatIndex)
  const isActivePlayer =
    activePlayer?.isCurrentUser ||
    (activePlayer?.kind === 'local' && isHost)

  // Show song player during placement phases
  const showSongPlayer = 
    game.phase === 'awaitingPlacement' || 
    game.phase === 'awaitingReveal' || 
    game.phase === 'revealed'

  return (
    <div className="space-y-4">
      {/* Spotify Player - Show during active round */}
      {showSongPlayer && songPreview && (
        <SpotifyPlayer 
          spotifyUri={songPreview.spotifyUri} 
          previewUrl={songPreview.previewUrl} 
        />
      )}

      {/* Current Turn Info */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activePlayer?.displayName}'s Turn
            {isActivePlayer && <Badge className="ml-2">Your Turn</Badge>}
          </CardTitle>
          <CardDescription>
            Phase: {game.phase} • Deck: {game.deckRemaining} cards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePlayer && (
            <TurnControls
              game={game}
              activePlayer={activePlayer}
              isActivePlayer={isActivePlayer}
              isHost={isHost}
              currentCard={currentCard ?? null}
            />
          )}
        </CardContent>
      </Card>

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
                <p className="text-muted-foreground">{currentCard.artistNames.join(', ')}</p>
                <p className="text-2xl font-bold text-primary">{currentCard.releaseYear}</p>
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
