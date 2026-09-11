import { expect, it } from 'vitest'
import { api, internal } from '../../convex/_generated/api'
import { createTestBackend, setupGame } from './setup'

it.each([false, true])(
  'preserves game cards when removing source tracks, legacy=%s',
  async (legacy) => {
    const { t, host, gameId, game } = await setupGame()
    const before = await host.query(api.timelines.getAllTimelines, { gameId })
    const preview = await host.query(api.timelines.getCurrentRoundSongPreview, {
      gameId,
    })
    const cards = await t.run(async (ctx) => {
      const result = await ctx.db
        .query('gameCards')
        .withIndex('by_gameId', (q) => q.eq('gameId', gameId))
        .collect()
      if (legacy) {
        for (const card of result)
          await ctx.db.patch('gameCards', card._id, {
            trackSnapshot: undefined,
          })
      }
      return result
    })
    for (const card of cards) {
      await host.mutation(api.playlists.removeTrack, { trackId: card.trackId })
    }
    expect(await host.query(api.timelines.getAllTimelines, { gameId })).toEqual(
      before,
    )
    expect(
      await host.query(api.timelines.getCurrentRoundSongPreview, { gameId }),
    ).toEqual(preview)
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
      await host.query(api.timelines.getCurrentRoundCard, { gameId }),
    ).not.toBeNull()
    await host.mutation(api.turns.resolveRound, {
      gameId,
      actingPlayerId: game.players[0]._id,
    })
    expect(
      await host.query(api.timelines.getCurrentRoundSongPreview, { gameId }),
    ).not.toBeNull()
  },
)

it('preserves existing games when importing the playlist again', async () => {
  const { t, host, gameId, playlistId } = await setupGame()
  const before = await host.query(api.timelines.getAllTimelines, { gameId })
  const preview = await host.query(api.timelines.getCurrentRoundSongPreview, {
    gameId,
  })
  expect(
    await t.mutation(internal.spotifyInternal.upsertPlaylistWithTracks, {
      ownerUserId: 'host',
      source: 'spotify',
      sourcePlaylistId: 'playlist',
      name: 'New songs',
      tracks: [
        { position: 0, title: 'Replacement', artistNames: ['New artist'] },
      ],
    }),
  ).toBe(playlistId)
  expect(await host.query(api.timelines.getAllTimelines, { gameId })).toEqual(
    before,
  )
  expect(
    await host.query(api.timelines.getCurrentRoundSongPreview, { gameId }),
  ).toEqual(preview)
  expect(
    await host.query(api.playlists.get, { playlistId, includeAllTracks: true }),
  ).toMatchObject({
    name: 'New songs',
    totalTracks: 1,
    readyTracks: 0,
    tracks: [{ title: 'Replacement' }],
  })
})

it('keeps the same playlist ID separate across music providers', async () => {
  const t = createTestBackend()
  const args = {
    ownerUserId: 'host',
    sourcePlaylistId: 'same-id',
    name: 'Playlist',
    tracks: [],
  }
  const spotify = await t.mutation(
    internal.spotifyInternal.upsertPlaylistWithTracks,
    { ...args, source: 'spotify' },
  )
  const apple = await t.mutation(
    internal.spotifyInternal.upsertPlaylistWithTracks,
    { ...args, source: 'appleMusic' },
  )
  expect(apple).not.toBe(spotify)
  expect(
    await t.withIdentity({ subject: 'host' }).query(api.playlists.listMine, {}),
  ).toHaveLength(2)
})

it('counts tracks that are already matched when importing from Spotify', async () => {
  const t = createTestBackend()
  const playlistId = await t.mutation(
    internal.spotifyInternal.upsertPlaylistWithTracks,
    {
      ownerUserId: 'host',
      source: 'spotify',
      sourcePlaylistId: 'ready',
      name: 'Ready',
      tracks: [
        {
          position: 0,
          title: 'Matched',
          artistNames: ['Artist'],
          appleMusicId: 'apple',
          previewUrl: 'https://example.com/song.m4a',
          releaseYear: 1990,
        },
      ],
    },
  )
  expect(
    await t
      .withIdentity({ subject: 'host' })
      .query(api.playlists.get, { playlistId }),
  ).toMatchObject({ status: 'ready', totalTracks: 1, readyTracks: 1 })
})

it('ignores late processing results after track deletion or a completed match', async () => {
  const { t, host, playlistId } = await setupGame()
  const playlist = await host.query(api.playlists.get, { playlistId })
  if (!playlist) throw new Error('Missing playlist')
  const [removed, ready] = playlist.tracks
  await host.mutation(api.playlists.removeTrack, { trackId: removed._id })
  await t.mutation(internal.playlistImportInternal.markTrackReady, {
    trackId: removed._id,
    appleMusicId: 'late',
    title: 'Late result',
    artistNames: ['Artist'],
    releaseYear: 2000,
  })
  await t.mutation(internal.playlistImportInternal.markTrackUnmatched, {
    trackId: removed._id,
    reason: 'Late failure',
  })
  await t.mutation(internal.playlistImportInternal.markTrackUnmatched, {
    trackId: ready._id,
    reason: 'Duplicate failure',
  })
  expect(
    (await host.query(api.playlists.get, { playlistId }))?.tracks.find(
      (track) => track._id === ready._id,
    )?.status,
  ).toBe('ready')
})
