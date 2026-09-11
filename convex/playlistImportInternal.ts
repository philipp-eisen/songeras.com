import { v } from 'convex/values'
import { playlistStatusValidator } from './lib/validators'
import { internalMutation, internalQuery } from './_generated/server'
import type { Doc } from './_generated/dataModel'

// ===========================================
// Internal Queries for Playlist Processing
// ===========================================

/**
 * Get a batch of pending tracks for a playlist
 */
export const getPendingTracks = internalQuery({
  args: {
    playlistId: v.id('playlists'),
    limit: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id('playlistTracks'),
      title: v.string(),
      artistNames: v.array(v.string()),
      isrc: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const tracks = await ctx.db
      .query('playlistTracks')
      .withIndex('by_playlistId_and_status', (q) =>
        q.eq('playlistId', args.playlistId).eq('status', 'pending'),
      )
      .take(args.limit)

    return tracks.map((t) => ({
      _id: t._id,
      title: t.title,
      artistNames: t.artistNames,
      isrc: t.isrc,
    }))
  },
})

/**
 * Get playlist by ID
 */
export const getPlaylist = internalQuery({
  args: { playlistId: v.id('playlists') },
  returns: v.union(
    v.object({
      _id: v.id('playlists'),
      status: playlistStatusValidator,
      totalTracks: v.number(),
      readyTracks: v.number(),
      unmatchedTracks: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const playlist = await ctx.db.get('playlists', args.playlistId)
    if (!playlist) return null

    return {
      _id: playlist._id,
      status: playlist.status,
      totalTracks: playlist.totalTracks,
      readyTracks: playlist.readyTracks,
      unmatchedTracks: playlist.unmatchedTracks,
    }
  },
})

// ===========================================
// Internal Mutations for Track Processing
// ===========================================

/**
 * Mark a track as ready with Apple Music data
 */
export const markTrackReady = internalMutation({
  args: {
    trackId: v.id('playlistTracks'),
    appleMusicId: v.string(),
    title: v.string(),
    artistNames: v.array(v.string()),
    releaseYear: v.number(),
    previewUrl: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isrc: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get('playlistTracks', args.trackId)
    if (!track || track.status !== 'pending') return null

    await ctx.db.patch('playlistTracks', args.trackId, {
      status: 'ready',
      unmatchedReason: undefined,
      appleMusicId: args.appleMusicId,
      title: args.title,
      artistNames: args.artistNames,
      releaseYear: args.releaseYear,
      previewUrl: args.previewUrl,
      imageUrl: args.imageUrl,
      isrc: args.isrc,
    })
    return null
  },
})

/**
 * Mark a track as unmatched
 */
export const markTrackUnmatched = internalMutation({
  args: {
    trackId: v.id('playlistTracks'),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const track = await ctx.db.get('playlistTracks', args.trackId)
    if (!track || track.status !== 'pending') return null

    await ctx.db.patch('playlistTracks', args.trackId, {
      status: 'unmatched',
      unmatchedReason: args.reason,
    })
    return null
  },
})

/**
 * Update playlist counts and status after processing
 */
export const updatePlaylistCounts = internalMutation({
  args: {
    playlistId: v.id('playlists'),
  },
  returns: v.object({
    pendingCount: v.number(),
    readyCount: v.number(),
    unmatchedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Count tracks by status
    const allTracks = await ctx.db
      .query('playlistTracks')
      .withIndex('by_playlistId', (q) => q.eq('playlistId', args.playlistId))
      .collect()

    const pendingCount = allTracks.filter((t) => t.status === 'pending').length
    const readyCount = allTracks.filter((t) => t.status === 'ready').length
    const unmatchedCount = allTracks.filter(
      (t) => t.status === 'unmatched',
    ).length

    // Determine new playlist status
    const newStatus: Doc<'playlists'>['status'] =
      pendingCount === 0 ? 'ready' : 'processing'

    // Update playlist
    await ctx.db.patch('playlists', args.playlistId, {
      status: newStatus,
      totalTracks: allTracks.length,
      readyTracks: readyCount,
      unmatchedTracks: unmatchedCount,
    })

    return { pendingCount, readyCount, unmatchedCount }
  },
})
