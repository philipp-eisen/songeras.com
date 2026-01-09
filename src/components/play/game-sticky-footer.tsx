import { useCallback } from 'react'
import {
  CardsIcon,
  CursorClickIcon,
  EyeIcon,
  HourglassIcon,
} from '@phosphor-icons/react'

import { ActionButtons } from './action-zone'
import type { GameData } from './types'
import { cn } from '@/lib/utils'
import {
  useActivePlayer,
  useIsActivePlayer,
  useTriggerExitAnimation,
} from '@/stores/play-game-store'

interface GameStickyFooterProps {
  game: GameData
}

export function GameStickyFooter({ game }: GameStickyFooterProps) {
  const activePlayer = useActivePlayer()
  const isActivePlayer = useIsActivePlayer()
  const triggerExitAnimation = useTriggerExitAnimation()

  const handleBeforeResolve = useCallback(async () => {
    await triggerExitAnimation()
  }, [triggerExitAnimation])

  const { phase } = game
  const playerName = activePlayer?.displayName ?? 'Someone'

  const { message, icon: Icon } = getPromptContent(
    phase,
    isActivePlayer,
    playerName,
  )

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-2">
        {/* Subtle phase indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs',
            isActivePlayer ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Icon
            weight="duotone"
            className={cn('size-4 shrink-0', isActivePlayer && 'animate-pulse')}
          />
          <span className="hidden sm:inline">{message}</span>
        </div>

        {/* Action buttons */}
        {activePlayer && (
          <ActionButtons game={game} onBeforeResolve={handleBeforeResolve} />
        )}
      </div>
    </div>
  )
}

function getPromptContent(
  phase: GameData['phase'],
  isActivePlayer: boolean,
  playerName: string,
): { message: string; icon: typeof HourglassIcon } {
  switch (phase) {
    case 'awaitingPlacement':
      return isActivePlayer
        ? { message: 'Place your card', icon: CursorClickIcon }
        : { message: `${playerName} is deciding...`, icon: HourglassIcon }

    case 'awaitingReveal':
      return isActivePlayer
        ? { message: 'Ready to reveal?', icon: EyeIcon }
        : { message: `${playerName} revealing...`, icon: EyeIcon }

    case 'revealed':
      return { message: 'Result revealed', icon: CardsIcon }

    default:
      return { message: 'Get ready...', icon: HourglassIcon }
  }
}
