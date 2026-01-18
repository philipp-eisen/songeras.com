import { MusicNoteIcon, StackIcon } from '@phosphor-icons/react'
import { LivesDisplay } from './lives-display'
import type { GameData } from './types'

interface SoloHeaderProps {
  game: GameData
  timelineSize: number
}

export function SoloHeader({ game, timelineSize }: SoloHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <MusicNoteIcon weight="duotone" className="size-6 text-primary" />
        <h1 className="truncate text-xl font-bold">
          {game.playlistName ?? 'Solo Game'}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Timeline size */}
        <div className="flex items-center gap-1.5 text-sm">
          <StackIcon weight="duotone" className="size-4" />
          <span className="font-medium">{timelineSize}</span>
        </div>

        {/* Lives */}
        <LivesDisplay current={game.lives ?? 0} max={game.startingLives ?? 3} />
      </div>
    </div>
  )
}
