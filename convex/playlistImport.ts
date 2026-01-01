'use node'

import { v } from 'convex/values'
import { action, internalAction } from './_generated/server'
import { internal } from './_generated/api'

// ===========================================
// Types
// ===========================================

interface PlaylistSong {
  songId: string
  position: number
  spotifyTrackId?: string
  appleMusicId?: string
  isrc?: string
  title: string
  artistNames: Array<string>
  releaseYear: number
  resolvedFrom?: 'spotify' | 'appleMusic' | 'spotifyToApple'
}

// ===========================================
// Internal Actions for Apple Music Resolution
// ===========================================

/**
 * Resolve a single song to Apple Music
 * Attempts ISRC lookup first, then falls back to text search
 */
export const resolveSongToAppleMusic = internalAction({
  args: {
    songId: v.id('songs'),
    isrc: v.optional(v.string()),
    title: v.string(),
    artist: v.string(),
    storefront: v.optional(v.string()),
  },
  returns: v.union(
    v.object({
      matched: v.literal(true),
      appleMusicId: v.string(),
      title: v.string(),
      artistName: v.string(),
      albumName: v.string(),
      releaseYear: v.number(),
      releaseDate: v.optional(v.string()),
      previewUrl: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
      isrc: v.optional(v.string()),
    }),
    v.object({
      matched: v.literal(false),
      reason: v.string(),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        matched: true
        appleMusicId: string
        title: string
        artistName: string
        albumName: string
        releaseYear: number
        releaseDate?: string
        previewUrl?: string
        artworkUrl?: string
        isrc?: string
      }
    | { matched: false; reason: string }
  > => {
    const storefront = args.storefront ?? 'us'

    // Step 1: Try ISRC lookup (most reliable)
    if (args.isrc) {
      try {
        const isrcResult = await ctx.runAction(
          internal.appleMusic.searchByISRC,
          {
            isrc: args.isrc,
            storefront,
          },
        )

        if (isrcResult) {
          return {
            matched: true,
            appleMusicId: isrcResult.appleMusicId,
            title: isrcResult.title,
            artistName: isrcResult.artistName,
            albumName: isrcResult.albumName,
            releaseYear: isrcResult.releaseYear,
            releaseDate: isrcResult.releaseDate,
            previewUrl: isrcResult.previewUrl,
            artworkUrl: isrcResult.artworkUrl,
            isrc: isrcResult.isrc,
          }
        }
      } catch (error) {
        console.warn(
          '[Resolution] ISRC lookup failed, trying text search:',
          error,
        )
      }
    }

    // Step 2: Fall back to text search
    try {
      const searchQuery = `${args.title} ${args.artist}`
      const searchResults = await ctx.runAction(
        internal.appleMusic.searchCatalog,
        {
          query: searchQuery,
          storefront,
          limit: 5,
        },
      )

      if (searchResults.length === 0) {
        return { matched: false, reason: 'No results found' }
      }

      // Find the best match by comparing title and artist
      const normalizedTitle = normalizeString(args.title)
      const normalizedArtist = normalizeString(args.artist)

      for (const result of searchResults) {
        const resultTitle = normalizeString(result.title)
        const resultArtist = normalizeString(result.artistName)

        // Check if title and artist are similar enough
        if (
          stringsSimilar(normalizedTitle, resultTitle) &&
          stringsSimilar(normalizedArtist, resultArtist)
        ) {
          return {
            matched: true,
            appleMusicId: result.appleMusicId,
            title: result.title,
            artistName: result.artistName,
            albumName: result.albumName,
            releaseYear: result.releaseYear,
            releaseDate: result.releaseDate,
            previewUrl: result.previewUrl,
            artworkUrl: result.artworkUrl,
            isrc: result.isrc,
          }
        }
      }

      // If no exact match, take the first result as a best guess
      // (Could be made stricter if needed)
      const firstResult = searchResults[0]
      return {
        matched: true,
        appleMusicId: firstResult.appleMusicId,
        title: firstResult.title,
        artistName: firstResult.artistName,
        albumName: firstResult.albumName,
        releaseYear: firstResult.releaseYear,
        releaseDate: firstResult.releaseDate,
        previewUrl: firstResult.previewUrl,
        artworkUrl: firstResult.artworkUrl,
        isrc: firstResult.isrc,
      }
    } catch (error) {
      console.error('[Resolution] Text search failed:', error)
      return { matched: false, reason: 'Search failed' }
    }
  },
})

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Check if two strings are similar enough (simple comparison)
 */
function stringsSimilar(a: string, b: string): boolean {
  // Exact match
  if (a === b) return true

  // One contains the other
  if (a.includes(b) || b.includes(a)) return true

  // Check if at least 80% of words match
  const wordsA = new Set(a.split(' '))
  const wordsB = new Set(b.split(' '))
  const intersection = [...wordsA].filter((w) => wordsB.has(w))
  const matchRatio = intersection.length / Math.max(wordsA.size, wordsB.size)

  return matchRatio >= 0.8
}

// ===========================================
// Public Actions
// ===========================================

/**
 * Resolve all songs in a playlist to Apple Music
 * This should be called after importing a Spotify playlist
 */
export const resolvePlaylistToAppleMusic = action({
  args: {
    playlistId: v.id('spotifyPlaylists'),
    storefront: v.optional(v.string()),
  },
  returns: v.object({
    totalTracks: v.number(),
    matchedTracks: v.number(),
    unmatchedTracks: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    totalTracks: number
    matchedTracks: number
    unmatchedTracks: number
  }> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    const storefront = args.storefront ?? 'us'

    // Mark playlist as in progress
    await ctx.runMutation(
      internal.spotifyInternal.updatePlaylistResolutionStatus,
      {
        playlistId: args.playlistId,
        status: 'inProgress',
      },
    )

    // Get all songs in the playlist
    const songs = await ctx.runQuery(
      internal.spotifyInternal.getPlaylistSongs,
      {
        playlistId: args.playlistId,
      },
    )

    let matchedCount = 0
    let unmatchedCount = 0

    // Process each song
    for (const song of songs) {
      // Skip if already resolved to Apple Music
      if (
        song.resolvedFrom === 'spotifyToApple' ||
        song.resolvedFrom === 'appleMusic'
      ) {
        matchedCount++
        continue
      }

      // Attempt to resolve to Apple Music
      const result = await ctx.runAction(
        internal.playlistImport.resolveSongToAppleMusic,
        {
          songId: song.songId,
          isrc: song.isrc,
          title: song.title,
          artist: song.artistNames[0] ?? 'Unknown Artist',
          storefront,
        },
      )

      if (result.matched) {
        // Update the song with Apple Music data
        await ctx.runMutation(
          internal.spotifyInternal.updateSongWithAppleMusic,
          {
            songId: song.songId,
            appleMusicId: result.appleMusicId,
            title: result.title,
            artistName: result.artistName,
            albumName: result.albumName,
            releaseYear: result.releaseYear,
            releaseDate: result.releaseDate,
            previewUrl: result.previewUrl,
            artworkUrl: result.artworkUrl,
            isrc: result.isrc,
          },
        )
        matchedCount++
      } else {
        console.warn(
          `[Resolution] Failed to match: "${song.title}" by ${song.artistNames.join(', ')} - ${result.reason}`,
        )
        unmatchedCount++
      }

      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Mark playlist as completed
    await ctx.runMutation(
      internal.spotifyInternal.updatePlaylistResolutionStatus,
      {
        playlistId: args.playlistId,
        status: 'completed',
        matchedTracks: matchedCount,
        unmatchedTracks: unmatchedCount,
      },
    )

    return {
      totalTracks: songs.length,
      matchedTracks: matchedCount,
      unmatchedTracks: unmatchedCount,
    }
  },
})

// Return type for getPlaylistResolutionStatus
interface ResolutionStatusResult {
  status: 'pending' | 'inProgress' | 'completed' | 'failed'
  matchedTracks: number
  unmatchedTracks: number
  totalTracks: number
}

/**
 * Get the resolution status of a playlist
 */
export const getPlaylistResolutionStatus = action({
  args: {
    playlistId: v.id('spotifyPlaylists'),
  },
  returns: v.union(
    v.object({
      status: v.union(
        v.literal('pending'),
        v.literal('inProgress'),
        v.literal('completed'),
        v.literal('failed'),
      ),
      matchedTracks: v.number(),
      unmatchedTracks: v.number(),
      totalTracks: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<ResolutionStatusResult | null> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error('Not authenticated')
    }

    // This is a simplified version - in a real app, you'd query the playlist directly
    const songs: Array<PlaylistSong> = await ctx.runQuery(
      internal.spotifyInternal.getPlaylistSongs,
      {
        playlistId: args.playlistId,
      },
    )

    const matchedTracks = songs.filter(
      (s) =>
        s.resolvedFrom === 'spotifyToApple' || s.resolvedFrom === 'appleMusic',
    ).length

    return {
      status: 'pending' as const,
      matchedTracks,
      unmatchedTracks: songs.length - matchedTracks,
      totalTracks: songs.length,
    }
  },
})
