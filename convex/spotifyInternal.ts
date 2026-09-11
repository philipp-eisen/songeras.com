import { v } from 'convex/values'
import { preserveTrackForGames } from './lib/gameCards'
import { playlistSourceValidator } from './lib/validators'
import { internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'

// ===========================================
// Internal mutations for Playlist Import
// ===========================================

/**
 * Upsert a playlist and replace all its tracks with new ones.
 * Tracks start in 'pending' status for Apple Music matching.
 */
export const upsertPlaylistWithTracks = internalMutation({
  args: {
    ownerUserId: v.string(),
    source: playlistSourceValidator,
    sourcePlaylistId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    tracks: v.array(
      v.object({
        position: v.number(),
        title: v.string(),
        artistNames: v.array(v.string()),
        releaseYear: v.optional(v.number()),
        imageUrl: v.optional(v.string()),
        spotifyTrackId: v.optional(v.string()),
        isrc: v.optional(v.string()),
        // For Apple Music imports that are ready immediately
        appleMusicId: v.optional(v.string()),
        previewUrl: v.optional(v.string()),
      }),
    ),
  },
  returns: v.id('playlists'),
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if playlist already exists for this user
    const existing = await ctx.db
      .query('playlists')
      .withIndex('by_ownerUserId_and_source_and_sourcePlaylistId', (q) =>
        q
          .eq('ownerUserId', args.ownerUserId)
          .eq('source', args.source)
          .eq('sourcePlaylistId', args.sourcePlaylistId),
      )
      .unique()

    let playlistId: Id<'playlists'>

    if (existing) {
      playlistId = existing._id

      // Delete all existing tracks
      const existingTracks = await ctx.db
        .query('playlistTracks')
        .withIndex('by_playlistId', (q) => q.eq('playlistId', playlistId))
        .collect()

      for (const track of existingTracks) {
        await preserveTrackForGames(ctx, track)
        await ctx.db.delete('playlistTracks', track._id)
      }
    } else {
      playlistId = await ctx.db.insert('playlists', {
        ownerUserId: args.ownerUserId,
        source: args.source,
        sourcePlaylistId: args.sourcePlaylistId,
        name: args.name,
        importedAt: now,
        status: 'importing',
        totalTracks: 0,
        readyTracks: 0,
        unmatchedTracks: 0,
      })
    }

    let readyTracks = 0
    // Insert all tracks
    for (const track of args.tracks) {
      // Apple Music imports are ready immediately, Spotify imports are pending
      const isReady =
        args.source === 'appleMusic' ||
        Boolean(
          track.appleMusicId &&
          track.previewUrl &&
          track.releaseYear !== undefined,
        )
      if (isReady) readyTracks += 1

      await ctx.db.insert('playlistTracks', {
        playlistId,
        position: track.position,
        status: isReady ? 'ready' : 'pending',
        title: track.title,
        artistNames: track.artistNames,
        releaseYear: track.releaseYear,
        imageUrl: track.imageUrl,
        spotifyTrackId: track.spotifyTrackId,
        isrc: track.isrc,
        appleMusicId: track.appleMusicId,
        previewUrl: track.previewUrl,
      })
    }

    await ctx.db.patch('playlists', playlistId, {
      name: args.name,
      description: args.description,
      imageUrl: args.imageUrl,
      importedAt: now,
      status: readyTracks === args.tracks.length ? 'ready' : 'processing',
      totalTracks: args.tracks.length,
      readyTracks,
      unmatchedTracks: 0,
    })

    return playlistId
  },
})
