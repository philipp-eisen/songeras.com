import { convexTest } from 'convex-test'
import { api } from '../../convex/_generated/api'
import schema from '../../convex/schema'

export function createTestBackend() {
  return convexTest(schema, import.meta.glob('../../convex/**/*.ts'))
}

export async function setupGame(mode: 'hostOnly' | 'sidecars' = 'sidecars') {
  const t = createTestBackend()
  const host = t.withIdentity({ subject: 'host', name: 'Host' })
  const guest = t.withIdentity({ subject: 'guest', name: 'Guest' })
  const outsider = t.withIdentity({ subject: 'outsider' })
  const playlistId = await t.run(async (ctx) => {
    const id = await ctx.db.insert('playlists', {
      ownerUserId: 'host',
      source: 'spotify',
      sourcePlaylistId: 'playlist',
      name: 'Test songs',
      importedAt: 1,
      status: 'ready',
      totalTracks: 16,
      readyTracks: 16,
      unmatchedTracks: 0,
    })
    for (let i = 0; i < 16; i++) {
      await ctx.db.insert('playlistTracks', {
        playlistId: id,
        position: i,
        status: 'ready',
        title: `Song ${i}`,
        artistNames: ['Artist'],
        releaseYear: 1980 + i,
        previewUrl: `https://example.com/${i}.m4a`,
      })
    }
    return id
  })
  const { gameId, joinCode } = await host.mutation(api.games.create, {
    playlistId,
    mode,
    playerNames: ['Host', 'Local player'],
  })
  if (mode === 'sidecars') {
    await guest.mutation(api.games.joinByCode, { joinCode })
  }
  await host.mutation(api.games.start, { gameId })
  const game = await host.query(api.games.get, { gameId })
  if (!game) throw new Error('Fixture game is missing')
  return { t, host, guest, outsider, playlistId, gameId, joinCode, game }
}
