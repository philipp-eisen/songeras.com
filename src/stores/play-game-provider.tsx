import { useLayoutEffect, useState } from 'react'
import { PlayGameStoreContext, createPlayGameStore } from './play-game-store'
import type { ReactNode } from 'react'
import type { GameData, TimelineData } from '@/components/play/types'

export function PlayGameProvider({
  game,
  timelines,
  children,
}: {
  game: GameData
  timelines: Array<TimelineData>
  children: ReactNode
}) {
  const [store] = useState(() => createPlayGameStore(game, timelines))

  useLayoutEffect(() => {
    store.getState().syncGame(game, timelines)
  }, [store, game, timelines])

  return (
    <PlayGameStoreContext.Provider value={store}>
      {children}
    </PlayGameStoreContext.Provider>
  )
}
