import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type {
  GameData,
  PlayerData,
  TimelineData,
} from '@/components/play/types'
import { MYSTERY_CARD_ID } from '@/components/play/constants'

// ============================================
// Types
// ============================================

interface DndState {
  items: Array<string>
  activeId: string | null
  wasExternalDrag: boolean
}

interface ActionState {
  loading: boolean
  error: string | null
}

interface DerivedGameState {
  activePlayer: PlayerData | undefined
  isActivePlayer: boolean
  myPlayer: PlayerData | undefined
  isHost: boolean
  activePlayerTimeline: TimelineData | undefined
}

interface PlayGameState {
  // Source data (synced from React Query)
  game: GameData
  timelines: Array<TimelineData>

  // DnD state
  dnd: DndState

  // Action/mutation state
  action: ActionState

  // Animation state
  isExiting: boolean

  // Derived state (computed from game)
  derived: DerivedGameState
}

interface PlayGameActions {
  // Sync actions (called when React Query data changes)
  syncGame: (game: GameData, timelines: Array<TimelineData>) => void

  // DnD actions
  setDndItems: (items: Array<string>) => void
  setDndActiveId: (id: string | null) => void
  setWasExternalDrag: (value: boolean) => void
  resetDndState: () => void

  // Action state
  wrapAction: <T>(action: () => Promise<T>) => Promise<T>

  // Animation
  setIsExiting: (isExiting: boolean) => void
  triggerExitAnimation: () => Promise<void>
}

type PlayGameStore = PlayGameState & PlayGameActions

// ============================================
// Derived State Computation
// ============================================

const computeDerivedState = (
  game: GameData,
  timelines: Array<TimelineData>,
): DerivedGameState => {
  const activePlayer = game.players.find(
    (p) => p.seatIndex === game.currentTurnSeatIndex,
  )
  const isHost = game.isCurrentUserHost
  const isActivePlayer =
    activePlayer?.isCurrentUser || (activePlayer?.kind === 'local' && isHost)
  const myPlayer = game.players.find((p) => p.isCurrentUser)
  const activePlayerTimeline = timelines.find(
    (t) => t.playerId === activePlayer?._id,
  )

  return {
    activePlayer,
    isActivePlayer: !!isActivePlayer,
    myPlayer,
    isHost,
    activePlayerTimeline,
  }
}

// ============================================
// Initial DnD Items Computation
// ============================================

const computeInitialDndItems = (
  game: GameData,
  timelines: Array<TimelineData>,
): Array<string> => {
  const activePlayer = game.players.find(
    (p) => p.seatIndex === game.currentTurnSeatIndex,
  )
  const activePlayerTimeline = timelines.find(
    (t) => t.playerId === activePlayer?._id,
  )

  const cardIds = activePlayerTimeline?.cards.map((c) => c._id as string) ?? []
  const placementIdx = game.currentRound?.placementIndex

  // If repositioning (card already placed), include mystery card at placement index
  if (placementIdx !== undefined) {
    const items = [...cardIds]
    items.splice(Math.min(placementIdx, cardIds.length), 0, MYSTERY_CARD_ID)
    return items
  }

  return cardIds
}

// ============================================
// Store
// ============================================

export function createPlayGameStore(
  initialGame: GameData,
  initialTimelines: Array<TimelineData>,
) {
  let pendingActions = 0
  return createStore<PlayGameStore>()((set, get) => ({
    game: initialGame,
    timelines: initialTimelines,
    dnd: {
      items: computeInitialDndItems(initialGame, initialTimelines),
      activeId: null,
      wasExternalDrag: false,
    },
    action: { loading: false, error: null },
    isExiting: false,
    derived: computeDerivedState(initialGame, initialTimelines),

    syncGame: (nextGame, nextTimelines) => {
      const previous = get()
      const roundChanged =
        previous.game._id !== nextGame._id ||
        previous.game.currentRound?.cardId !== nextGame.currentRound?.cardId
      set({
        game: nextGame,
        timelines: nextTimelines,
        derived: computeDerivedState(nextGame, nextTimelines),
        ...(roundChanged && {
          dnd: {
            items: computeInitialDndItems(nextGame, nextTimelines),
            activeId: null,
            wasExternalDrag: false,
          },
          isExiting: false,
          action: { ...previous.action, error: null },
        }),
      })
    },

    // DnD actions
    setDndItems: (items) => {
      set({ dnd: { ...get().dnd, items } })
    },

    setDndActiveId: (activeId) => {
      set({ dnd: { ...get().dnd, activeId } })
    },

    setWasExternalDrag: (wasExternalDrag) => {
      set({ dnd: { ...get().dnd, wasExternalDrag } })
    },

    resetDndState: () => {
      const { game, timelines } = get()
      set({
        dnd: {
          items: computeInitialDndItems(game, timelines),
          activeId: null,
          wasExternalDrag: false,
        },
      })
    },

    // Action state
    wrapAction: async (action) => {
      pendingActions += 1
      set({ action: { loading: true, error: null } })
      try {
        const result = await action()
        return result
      } catch (err) {
        set({
          action: {
            loading: pendingActions > 1,
            error: err instanceof Error ? err.message : 'Action failed',
          },
        })
        set({ isExiting: false })
        throw err
      } finally {
        pendingActions -= 1
        set((state) => ({
          action: { ...state.action, loading: pendingActions > 0 },
        }))
      }
    },

    // Animation
    setIsExiting: (isExiting) => {
      set({ isExiting })
    },

    triggerExitAnimation: async () => {
      set({ isExiting: true })
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 400)
      })
    },
  }))
}

export const PlayGameStoreContext = createContext<ReturnType<
  typeof createPlayGameStore
> | null>(null)

export function usePlayGameStore<T>(selector: (state: PlayGameStore) => T): T {
  const store = useContext(PlayGameStoreContext)
  if (!store) throw new Error('PlayGameProvider is missing')
  return useStore(store, selector)
}

// ============================================
// Selector Hooks
// ============================================

// Derived state selectors
export const useActivePlayer = () =>
  usePlayGameStore((state) => state.derived.activePlayer)

export const useIsActivePlayer = () =>
  usePlayGameStore((state) => state.derived.isActivePlayer)

export const useMyPlayer = () =>
  usePlayGameStore((state) => state.derived.myPlayer)

export const useIsHost = () => usePlayGameStore((state) => state.derived.isHost)

export const useActivePlayerTimeline = () =>
  usePlayGameStore((state) => state.derived.activePlayerTimeline)

// Game/timelines selectors
export const useGame = () => usePlayGameStore((state) => state.game)

export const useTimelines = () => usePlayGameStore((state) => state.timelines)

// DnD selectors
export const useDndState = () => usePlayGameStore((state) => state.dnd)

// Individual DnD action selectors to avoid creating new objects
export const useSetDndItems = () =>
  usePlayGameStore((state) => state.setDndItems)

export const useSetDndActiveId = () =>
  usePlayGameStore((state) => state.setDndActiveId)

export const useSetWasExternalDrag = () =>
  usePlayGameStore((state) => state.setWasExternalDrag)

export const useResetDndState = () =>
  usePlayGameStore((state) => state.resetDndState)

// Action state selectors
export const useActionState = () => usePlayGameStore((state) => state.action)

export const useWrapAction = () => usePlayGameStore((state) => state.wrapAction)

// Animation selectors
export const useIsExiting = () => usePlayGameStore((state) => state.isExiting)

export const useTriggerExitAnimation = () =>
  usePlayGameStore((state) => state.triggerExitAnimation)
