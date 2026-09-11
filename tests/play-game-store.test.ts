import { describe, expect, it } from 'vitest'
import { createPlayGameStore } from '../src/stores/play-game-store'
import { MYSTERY_CARD_ID } from '../src/components/play/constants'
import { createGameData, createTimelines } from './game-fixtures'
import type { Id } from '../convex/_generated/dataModel'

function setupStore() {
  const game = createGameData()
  const timelines = createTimelines(game)
  return { game, timelines, store: createPlayGameStore(game, timelines) }
}

describe('game state', () => {
  it('initializes derived state and cards before the first render', () => {
    const { store, game, timelines } = setupStore()
    expect(store.getState().derived.activePlayer).toBe(game.players[0])
    expect(store.getState().derived.isActivePlayer).toBe(true)
    expect(store.getState().derived.activePlayerTimeline).toBe(timelines[0])
    expect(store.getState().dnd.items).toEqual(['starting-card'])
  })

  it('isolates drag and animation state for each game', () => {
    const first = setupStore().store
    const second = setupStore().store
    first.getState().setDndItems([MYSTERY_CARD_ID])
    first.getState().setIsExiting(true)
    expect(second.getState().dnd.items).toEqual(['starting-card'])
    expect(second.getState().isExiting).toBe(false)
  })

  it('resets the next round even when the active player stays the same', () => {
    const { store, game, timelines } = setupStore()
    store.getState().setDndItems([MYSTERY_CARD_ID, 'starting-card'])
    store.getState().setDndActiveId(MYSTERY_CARD_ID)
    store.getState().setIsExiting(true)
    if (!game.currentRound) throw new Error('Missing round')
    store.getState().syncGame(
      {
        ...game,
        currentRound: {
          ...game.currentRound,
          cardId: 'next-card' as Id<'gameCards'>,
        },
      },
      timelines,
    )
    expect(store.getState().dnd).toEqual({
      items: ['starting-card'],
      activeId: null,
      wasExternalDrag: false,
    })
    expect(store.getState().isExiting).toBe(false)
  })

  it('restores the saved placement after cancelling a drag', () => {
    const { game, timelines } = setupStore()
    if (!game.currentRound) throw new Error('Missing round')
    game.currentRound.placementIndex = 1
    const store = createPlayGameStore(game, timelines)
    store.getState().setDndItems([MYSTERY_CARD_ID, 'starting-card'])
    store.getState().setDndActiveId(MYSTERY_CARD_ID)
    store.getState().setWasExternalDrag(true)
    store.getState().resetDndState()
    expect(store.getState().dnd).toEqual({
      items: ['starting-card', MYSTERY_CARD_ID],
      activeId: null,
      wasExternalDrag: false,
    })
  })

  it('keeps loading true until all pending actions settle', async () => {
    const { store } = setupStore()
    let finishFirst = () => {}
    let finishSecond = () => {}
    const first = store.getState().wrapAction(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve
        }),
    )
    const second = store.getState().wrapAction(
      () =>
        new Promise<void>((resolve) => {
          finishSecond = resolve
        }),
    )
    finishFirst()
    await first
    expect(store.getState().action.loading).toBe(true)
    finishSecond()
    await second
    expect(store.getState().action.loading).toBe(false)
  })

  it('restores the timeline after a failed round action', async () => {
    const { store } = setupStore()
    store.getState().setIsExiting(true)
    await expect(
      store
        .getState()
        .wrapAction(() => Promise.reject(new Error('Connection lost'))),
    ).rejects.toThrow('Connection lost')
    expect(store.getState().isExiting).toBe(false)
    expect(store.getState().action).toEqual({
      loading: false,
      error: 'Connection lost',
    })
  })
})
