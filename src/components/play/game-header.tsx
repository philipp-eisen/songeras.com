import type { GameData } from './types'
import { Badge } from '@/components/ui/badge'

interface GameHeaderProps {
  game: GameData
}

export function GameHeader({ game }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">
        {game.playlistName ?? 'Song Game'}
      </h1>
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
  )
}

