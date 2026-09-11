import { describe, expect, it } from 'vitest'
import { api } from '../../convex/_generated/api'
import { computeValidInsertionIndices } from '../../shared/game-rules'
import { setupGame } from './setup'

it('deals starting cards and draws the deck in order', async () => {
  const { t, host, gameId, game } = await setupGame()
  const cards = await t.run((ctx) =>
    ctx.db
      .query('gameCards')
      .withIndex('by_gameId', (q) => q.eq('gameId', gameId))
      .collect(),
  )
  expect(cards.filter((card) => card.state === 'timeline')).toHaveLength(2)
  expect(cards.filter((card) => card.state === 'inRound')).toHaveLength(1)
  const deck = cards
    .filter((card) => card.state === 'deck')
    .sort((a, b) => (a.deckOrder ?? 0) - (b.deckOrder ?? 0))
  expect(deck.map((card) => card.deckOrder)).toEqual(
    Array.from({ length: 13 }, (_, i) => i),
  )
  expect(game.deckRemaining).toBe(13)

  await host.mutation(api.turns.skipRound, {
    gameId,
    actingPlayerId: game.players[0]._id,
  })
  const updated = await host.query(api.games.get, { gameId })
  expect(updated?.currentRound?.cardId).toBe(deck[0]._id)
  expect(updated?.deckRemaining).toBe(12)
  expect(updated?.players[0].tokenBalance).toBe(1)
})

it('draws legacy cards without a deck order last', async () => {
  const { t, host, gameId, game } = await setupGame()
  const legacyId = await t.run(async (ctx) => {
    const cards = await ctx.db
      .query('gameCards')
      .withIndex('by_gameId_and_state', (q) =>
        q.eq('gameId', gameId).eq('state', 'deck'),
      )
      .collect()
    for (const card of cards.slice(1))
      await ctx.db.delete('gameCards', card._id)
    await ctx.db.patch('gameCards', cards[0]._id, { deckOrder: undefined })
    return cards[0]._id
  })
  await host.mutation(api.turns.skipRound, {
    gameId,
    actingPlayerId: game.players[0]._id,
  })
  expect(
    (await host.query(api.games.get, { gameId }))?.currentRound?.cardId,
  ).toBe(legacyId)
})

it('lists hosted and joined games once, excluding unrelated games', async () => {
  const { host, guest, outsider, playlistId, gameId } = await setupGame()
  const second = await host.mutation(api.games.create, {
    playlistId,
    mode: 'hostOnly',
  })
  const hosted = await host.query(api.games.listMine, {})
  expect(hosted.map((game) => game._id)).toEqual([second.gameId, gameId])
  expect(hosted.every((game) => game.isHost)).toBe(true)
  expect(await guest.query(api.games.listMine, {})).toMatchObject([
    { _id: gameId, isHost: false },
  ])
  expect(await outsider.query(api.games.listMine, {})).toEqual([])
})

it('keeps the card year consistent after the source track changes', async () => {
  const { t, host, gameId, game } = await setupGame()
  const currentCard = await t.run(async (ctx) => {
    const storedGame = await ctx.db.get('games', gameId)
    if (!storedGame?.currentRound) throw new Error('Missing round')
    const card = await ctx.db.get('gameCards', storedGame.currentRound.cardId)
    if (!card) throw new Error('Missing card')
    await ctx.db.patch('playlistTracks', card.trackId, {
      releaseYear: undefined,
    })
    return card
  })
  await host.mutation(api.turns.placeCard, {
    gameId,
    actingPlayerId: game.players[0]._id,
    insertIndex: 0,
  })
  await host.mutation(api.turns.revealCard, {
    gameId,
    actingPlayerId: game.players[0]._id,
  })
  expect(
    (await host.query(api.games.get, { gameId }))?.currentRound?.card
      ?.releaseYear,
  ).toBe(currentCard.releaseYear)
  expect(
    (await host.query(api.timelines.getCurrentRoundCard, { gameId }))
      ?.releaseYear,
  ).toBe(currentCard.releaseYear)
})

describe('round resolution', () => {
  it('awards a correct placement and advances to the next player', async () => {
    const { t, host, gameId, game } = await setupGame()
    const player = game.players[0]
    const timeline = await host.query(api.timelines.getPlayerTimeline, {
      playerId: player._id,
    })
    const round = game.currentRound
    if (!timeline || !round) throw new Error('Missing round data')
    const card = await t.run((ctx) => ctx.db.get('gameCards', round.cardId))
    if (!card) throw new Error('Missing card')
    const insertIndex = computeValidInsertionIndices(
      timeline.cards,
      card.releaseYear,
    )[0]
    await host.mutation(api.turns.placeCard, {
      gameId,
      actingPlayerId: player._id,
      insertIndex,
    })
    await host.mutation(api.turns.revealCard, {
      gameId,
      actingPlayerId: player._id,
    })
    expect(
      await host.mutation(api.turns.resolveRound, {
        gameId,
        actingPlayerId: player._id,
      }),
    ).toMatchObject({ placementCorrect: true, cardWentTo: 'activePlayer' })
    expect(
      (
        await host.query(api.timelines.getPlayerTimeline, {
          playerId: player._id,
        })
      )?.cards,
    ).toHaveLength(2)
    const next = await host.query(api.games.get, { gameId })
    expect(next?.phase).toBe('awaitingPlacement')
    expect(next?.currentRound?.activePlayerId).toBe(game.players[1]._id)
    expect(next?.currentRound?.cardId).not.toBe(round.cardId)
  })
})
