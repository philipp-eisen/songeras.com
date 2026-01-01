import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'

// ===========================================
// Internal queries/mutations for Spotify
// ===========================================

/**
 * Get the Spotify account for a user (to retrieve access token)
 */
export const getSpotifyAccount = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      accessToken: v.union(v.string(), v.null()),
      refreshToken: v.union(v.string(), v.null()),
      accessTokenExpiresAt: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    // Query the Better Auth account table for the Spotify provider
    const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'account',
      where: [
        { field: 'userId', value: args.userId },
        { field: 'providerId', value: 'spotify' },
      ],
    })

    if (!result) {
      return null
    }

    return {
      accessToken: result.accessToken ?? null,
      refreshToken: result.refreshToken ?? null,
      accessTokenExpiresAt: result.accessTokenExpiresAt ?? null,
    }
  },
})

/**
 * Update the Spotify account tokens after a refresh
 */
export const updateSpotifyTokens = internalMutation({
  args: {
    userId: v.string(),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the account first
    const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'account',
      where: [
        { field: 'userId', value: args.userId },
        { field: 'providerId', value: 'spotify' },
      ],
    })

    if (!result || !result._id) {
      throw new Error('Spotify account not found')
    }

    // Update using the Better Auth component
    const updateData: Record<string, unknown> = {
      accessToken: args.accessToken,
      accessTokenExpiresAt: args.accessTokenExpiresAt,
      updatedAt: Date.now(),
    }

    if (args.refreshToken) {
      updateData.refreshToken = args.refreshToken
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: 'account',
        update: updateData,
        where: [{ field: '_id', value: result._id }],
      },
    })

    return null
  },
})

/**
 * Upsert a song (by spotifyTrackId)
 */
export const upsertSong = internalMutation({
  args: {
    spotifyTrackId: v.string(),
    title: v.string(),
    artistNames: v.array(v.string()),
    releaseYear: v.number(),
    previewUrl: v.optional(v.string()),
    spotifyUri: v.optional(v.string()),
    albumName: v.optional(v.string()),
    albumImageUrl: v.optional(v.string()),
    // New fields for Apple Music support
    isrc: v.optional(v.string()),
  },
  returns: v.id('songs'),
  handler: async (ctx, args) => {
    // Check if song already exists
    const existing = await ctx.db
      .query('songs')
      .withIndex('by_spotifyTrackId', (q) =>
        q.eq('spotifyTrackId', args.spotifyTrackId),
      )
      .unique()

    if (existing) {
      // Update the existing song
      await ctx.db.patch('songs', existing._id, {
        title: args.title,
        artistNames: args.artistNames,
        releaseYear: args.releaseYear,
        previewUrl: args.previewUrl,
        spotifyUri: args.spotifyUri,
        albumName: args.albumName,
        albumImageUrl: args.albumImageUrl,
        isrc: args.isrc,
        // Don't overwrite resolvedFrom if already set
        resolvedFrom: existing.resolvedFrom ?? 'spotify',
      })
      return existing._id
    }

    // Create new song
    return ctx.db.insert('songs', {
      spotifyTrackId: args.spotifyTrackId,
      title: args.title,
      artistNames: args.artistNames,
      releaseYear: args.releaseYear,
      previewUrl: args.previewUrl,
      spotifyUri: args.spotifyUri,
      albumName: args.albumName,
      albumImageUrl: args.albumImageUrl,
      isrc: args.isrc,
      resolvedFrom: 'spotify', // Mark as needing Apple Music resolution
    })
  },
})

/**
 * Update a song with Apple Music data after resolution
 */
export const updateSongWithAppleMusic = internalMutation({
  args: {
    songId: v.id('songs'),
    appleMusicId: v.string(),
    title: v.string(),
    artistName: v.string(),
    albumName: v.optional(v.string()),
    releaseYear: v.number(),
    releaseDate: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    artworkUrl: v.optional(v.string()),
    isrc: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch('songs', args.songId, {
      appleMusicId: args.appleMusicId,
      title: args.title,
      artistNames: [args.artistName], // Apple Music gives us a single artist string
      albumName: args.albumName,
      releaseYear: args.releaseYear,
      releaseDate: args.releaseDate,
      previewUrl: args.previewUrl, // Apple Music preview takes precedence
      artworkUrl: args.artworkUrl,
      isrc: args.isrc,
      resolvedFrom: 'spotifyToApple',
    })
    return null
  },
})

/**
 * Get a song by its ID
 */
export const getSong = internalQuery({
  args: { songId: v.id('songs') },
  returns: v.union(
    v.object({
      _id: v.id('songs'),
      spotifyTrackId: v.optional(v.string()),
      appleMusicId: v.optional(v.string()),
      isrc: v.optional(v.string()),
      title: v.string(),
      artistNames: v.array(v.string()),
      releaseYear: v.number(),
      previewUrl: v.optional(v.string()),
      resolvedFrom: v.optional(
        v.union(
          v.literal('spotify'),
          v.literal('appleMusic'),
          v.literal('spotifyToApple'),
        ),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const song = await ctx.db.get('songs', args.songId)
    if (!song) return null

    return {
      _id: song._id,
      spotifyTrackId: song.spotifyTrackId,
      appleMusicId: song.appleMusicId,
      isrc: song.isrc,
      title: song.title,
      artistNames: song.artistNames,
      releaseYear: song.releaseYear,
      previewUrl: song.previewUrl,
      resolvedFrom: song.resolvedFrom,
    }
  },
})

/**
 * Upsert a playlist and clear its existing song mappings
 */
export const upsertPlaylist = internalMutation({
  args: {
    ownerUserId: v.string(),
    spotifyPlaylistId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    trackCount: v.number(),
    snapshotId: v.string(),
  },
  returns: v.id('spotifyPlaylists'),
  handler: async (ctx, args) => {
    // Check if playlist already exists for this user
    const existing = await ctx.db
      .query('spotifyPlaylists')
      .withIndex('by_ownerUserId_and_spotifyPlaylistId', (q) =>
        q
          .eq('ownerUserId', args.ownerUserId)
          .eq('spotifyPlaylistId', args.spotifyPlaylistId),
      )
      .unique()

    let playlistId: Id<'spotifyPlaylists'>

    if (existing) {
      // Update existing playlist
      await ctx.db.patch('spotifyPlaylists', existing._id, {
        name: args.name,
        description: args.description,
        imageUrl: args.imageUrl,
        trackCount: args.trackCount,
        snapshotId: args.snapshotId,
        importedAt: Date.now(),
      })
      playlistId = existing._id

      // Clear existing song mappings
      const existingMappings = await ctx.db
        .query('playlistSongs')
        .withIndex('by_playlistId', (q) => q.eq('playlistId', playlistId))
        .collect()

      for (const mapping of existingMappings) {
        await ctx.db.delete('playlistSongs', mapping._id)
      }
    } else {
      // Create new playlist
      playlistId = await ctx.db.insert('spotifyPlaylists', {
        ownerUserId: args.ownerUserId,
        spotifyPlaylistId: args.spotifyPlaylistId,
        name: args.name,
        description: args.description,
        imageUrl: args.imageUrl,
        trackCount: args.trackCount,
        snapshotId: args.snapshotId,
        importedAt: Date.now(),
      })
    }

    return playlistId
  },
})

/**
 * Add a song to a playlist at a specific position
 */
export const addPlaylistSong = internalMutation({
  args: {
    playlistId: v.id('spotifyPlaylists'),
    songId: v.id('songs'),
    position: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert('playlistSongs', {
      playlistId: args.playlistId,
      songId: args.songId,
      position: args.position,
    })
    return null
  },
})

/**
 * Update playlist resolution status
 */
export const updatePlaylistResolutionStatus = internalMutation({
  args: {
    playlistId: v.id('spotifyPlaylists'),
    status: v.union(
      v.literal('pending'),
      v.literal('inProgress'),
      v.literal('completed'),
      v.literal('failed'),
    ),
    matchedTracks: v.optional(v.number()),
    unmatchedTracks: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updateData: Record<string, unknown> = {
      resolutionStatus: args.status,
      lastResolvedAt: Date.now(),
    }

    if (args.matchedTracks !== undefined) {
      updateData.matchedTracks = args.matchedTracks
    }
    if (args.unmatchedTracks !== undefined) {
      updateData.unmatchedTracks = args.unmatchedTracks
    }

    await ctx.db.patch('spotifyPlaylists', args.playlistId, updateData)
    return null
  },
})

/**
 * Get all songs in a playlist
 */
export const getPlaylistSongs = internalQuery({
  args: { playlistId: v.id('spotifyPlaylists') },
  returns: v.array(
    v.object({
      songId: v.id('songs'),
      position: v.number(),
      spotifyTrackId: v.optional(v.string()),
      appleMusicId: v.optional(v.string()),
      isrc: v.optional(v.string()),
      title: v.string(),
      artistNames: v.array(v.string()),
      releaseYear: v.number(),
      resolvedFrom: v.optional(
        v.union(
          v.literal('spotify'),
          v.literal('appleMusic'),
          v.literal('spotifyToApple'),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const mappings = await ctx.db
      .query('playlistSongs')
      .withIndex('by_playlistId', (q) => q.eq('playlistId', args.playlistId))
      .collect()

    const results = []
    for (const mapping of mappings) {
      const song = await ctx.db.get('songs', mapping.songId)
      if (song) {
        results.push({
          songId: song._id,
          position: mapping.position,
          spotifyTrackId: song.spotifyTrackId,
          appleMusicId: song.appleMusicId,
          isrc: song.isrc,
          title: song.title,
          artistNames: song.artistNames,
          releaseYear: song.releaseYear,
          resolvedFrom: song.resolvedFrom,
        })
      }
    }

    return results.sort((a, b) => a.position - b.position)
  },
})
