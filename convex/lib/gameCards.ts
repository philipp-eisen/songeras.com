import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export function snapshotTrack(track: Doc<'playlistTracks'>) {
  return {
    title: track.title,
    artistNames: track.artistNames,
    imageUrl: track.imageUrl,
    previewUrl: track.previewUrl,
    appleMusicId: track.appleMusicId,
    spotifyTrackId: track.spotifyTrackId,
  }
}

export async function getCardTrack(ctx: QueryCtx, card: Doc<'gameCards'>) {
  return card.trackSnapshot ?? ctx.db.get('playlistTracks', card.trackId)
}

/** Preserve older games before their source track is deleted or replaced. */
export async function preserveTrackForGames(
  ctx: MutationCtx,
  track: Doc<'playlistTracks'>,
) {
  const cards = await ctx.db
    .query('gameCards')
    .withIndex('by_trackId', (q) => q.eq('trackId', track._id))
    .collect()
  for (const card of cards) {
    if (!card.trackSnapshot) {
      await ctx.db.patch('gameCards', card._id, {
        trackSnapshot: snapshotTrack(track),
      })
    }
  }
}
