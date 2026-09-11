import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { setupGame } from './setup'

it.each(['hostOnly', 'sidecars'] as const)(
  'rejects a seat from another %s game',
  async (mode) => {
    const { host, gameId, playlistId, game } = await setupGame(mode)
    const other = await host.mutation(api.games.create, { playlistId, mode })
    const otherGame = await host.query(api.games.get, { gameId: other.gameId })
    if (!otherGame) throw new Error('Missing other game')
    const foreignPlayer = otherGame.players[0]

    await expect(
      host.mutation(api.turns.placeBet, {
        gameId,
        actingPlayerId: foreignPlayer._id,
        slotIndex: 0,
      }),
    ).rejects.toThrow('Player does not belong to this game')
    await host.mutation(api.turns.placeCard, {
      gameId,
      actingPlayerId: game.players[0]._id,
      insertIndex: 0,
    })
    await host.mutation(api.turns.revealCard, {
      gameId,
      actingPlayerId: game.players[0]._id,
    })
    await expect(
      host.mutation(api.turns.claimGuessToken, {
        gameId,
        actingPlayerId: foreignPlayer._id,
      }),
    ).rejects.toThrow('Player does not belong to this game')
    expect(
      (await host.query(api.games.get, { gameId: other.gameId }))?.players[0]
        .tokenBalance,
    ).toBe(2)
  },
)

it('allows a player to bet and claim a bonus only once per round', async () => {
  const { host, guest, gameId, game } = await setupGame()
  const guestId = game.players[1]._id
  await guest.mutation(api.turns.placeBet, {
    gameId,
    actingPlayerId: guestId,
    slotIndex: 0,
  })
  await expect(
    guest.mutation(api.turns.placeBet, {
      gameId,
      actingPlayerId: guestId,
      slotIndex: 1,
    }),
  ).rejects.toThrow('already placed a bet')
  await host.mutation(api.turns.placeCard, {
    gameId,
    actingPlayerId: game.players[0]._id,
    insertIndex: 0,
  })
  await host.mutation(api.turns.revealCard, {
    gameId,
    actingPlayerId: game.players[0]._id,
  })
  await guest.mutation(api.turns.claimGuessToken, {
    gameId,
    actingPlayerId: guestId,
  })
  await expect(
    guest.mutation(api.turns.claimGuessToken, {
      gameId,
      actingPlayerId: guestId,
    }),
  ).rejects.toThrow('already claimed a token')
  expect(
    (await guest.query(api.games.get, { gameId }))?.players[1].tokenBalance,
  ).toBe(2)
})

it('rejects actions by another user and by unauthenticated callers', async () => {
  const { t, guest, gameId, game } = await setupGame()
  const args = { gameId, actingPlayerId: game.players[0]._id, insertIndex: 0 }
  await expect(guest.mutation(api.turns.placeCard, args)).rejects.toThrow(
    'cannot act for this player',
  )
  await expect(t.mutation(api.turns.placeCard, args)).rejects.toThrow(
    'Not authenticated',
  )
})

it('hides game data and timelines from outsiders', async () => {
  const { host, guest, outsider, gameId, game, joinCode } = await setupGame()
  expect(await outsider.query(api.games.get, { gameId })).toBeNull()
  expect(await outsider.query(api.games.getByJoinCode, { joinCode })).toBeNull()
  expect(
    await outsider.query(api.timelines.getPlayerTimeline, {
      playerId: game.players[0]._id,
    }),
  ).toBeNull()
  expect(
    await outsider.query(api.timelines.getAllTimelines, { gameId }),
  ).toBeNull()
  expect(
    await outsider.query(api.timelines.getCurrentRoundSongPreview, { gameId }),
  ).toBeNull()
  expect(
    await outsider.query(api.timelines.getCurrentRoundCard, { gameId }),
  ).toBeNull()
  expect(
    await guest.query(api.timelines.getPlayerTimeline, {
      playerId: game.players[0]._id,
    }),
  ).not.toBeNull()
  expect(
    await host.query(api.timelines.getCurrentRoundCard, { gameId }),
  ).toBeNull()
})

describe('slot validation', () => {
  it.each([-1, 0.5, 2, NaN, Infinity])(
    'rejects invalid placement and bet slot %s',
    async (slot) => {
      const { host, guest, gameId, game } = await setupGame()
      await expect(
        host.mutation(api.turns.placeCard, {
          gameId,
          actingPlayerId: game.players[0]._id,
          insertIndex: slot,
        }),
      ).rejects.toThrow('Invalid insertion index')
      await expect(
        guest.mutation(api.turns.placeBet, {
          gameId,
          actingPlayerId: game.players[1]._id,
          slotIndex: slot,
        }),
      ).rejects.toThrow('Invalid slot index')
      const updated = await host.query(api.games.get, { gameId })
      expect(updated?.phase).toBe('awaitingPlacement')
      expect(updated?.players[1].tokenBalance).toBe(2)
      expect(updated?.currentRound?.bets).toEqual([])
    },
  )
})
