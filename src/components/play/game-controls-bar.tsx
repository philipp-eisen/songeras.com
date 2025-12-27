import { useQuery } from '@tanstack/react-query'
import { TurnControls } from './turn-controls'
import type { GameData } from './types'
import {
  getCurrentRoundCardQuery,
  getCurrentRoundSongPreviewQuery,
} from '@/lib/convex-queries'
import { SpotifyPlayer } from '@/components/spotify-player'
import { Badge } from '@/components/ui/badge'

interface GameControlsBarProps {
  game: GameData
}

export function GameControlsBar({ game }: GameControlsBarProps) {
  const { data: currentCard } = useQuery(getCurrentRoundCardQuery(game._id))
  const { data: songPreview } = useQuery(
    getCurrentRoundSongPreviewQuery(game._id),
  )

  const isHost = game.isCurrentUserHost

  const activePlayer = game.players.find(
    (p) => p.seatIndex === game.currentTurnSeatIndex,
  )
  const isActivePlayer =
    activePlayer?.isCurrentUser || (activePlayer?.kind === 'local' && isHost)

  return (
    <div className="sticky bottom-0 z-40 -mx-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="p-4 space-y-3">
        {/* Spotify Player - Always rendered */}
        <SpotifyPlayer
          spotifyUri={songPreview?.spotifyUri}
          previewUrl={songPreview?.previewUrl}
        />

        {/* Turn Info & Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {activePlayer?.displayName}'s Turn
            </span>
            {isActivePlayer && (
              <Badge variant="default" className="text-xs">
                Your Turn
              </Badge>
            )}
            <span className="text-muted-foreground ml-auto">
              {game.phase} • {game.deckRemaining} cards left
            </span>
          </div>

          {activePlayer && (
            <TurnControls
              game={game}
              activePlayer={activePlayer}
              isActivePlayer={isActivePlayer}
              isHost={isHost}
              currentCard={currentCard ?? null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
